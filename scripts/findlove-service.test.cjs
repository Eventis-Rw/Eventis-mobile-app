const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the real module against in-memory storage and a stub API; no RN runtime required.
let stored = new Map();
const storage = {
  getItem: async (key) => stored.get(key) ?? null,
  setItem: async (key, value) => {
    stored.set(key, value);
  },
};
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
let apiCalls = [];
let apiHandler = async () => undefined;
const api = {
  get: (p) => {
    apiCalls.push(["GET", p]);
    return apiHandler("GET", p);
  },
  post: (p, body) => {
    apiCalls.push(["POST", p, body]);
    return apiHandler("POST", p, body);
  },
  put: (p, body) => {
    apiCalls.push(["PUT", p, body]);
    return apiHandler("PUT", p, body);
  },
};

function load(relPath, env, resolve) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exportsObject = {};
  new Function("require", "exports", "process", compiled)(
    (name) => {
      const mod = resolve(name);
      if (!mod) throw new Error(`Unexpected dependency: ${name}`);
      return mod;
    },
    exportsObject,
    { env },
  );
  return exportsObject;
}

const rules = load("utils/findLoveProfile.ts", {}, () => undefined);
const profiles = load("constants/loveProfiles.ts", {}, () => undefined);
const membership = load("utils/findLoveMembership.ts", {}, () => undefined);
function loadService(env) {
  return load("services/findLoveService.ts", env, (name) => {
    if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
    if (name === "@/constants/loveProfiles") return profiles;
    if (name === "@/utils/apiClient") return { api, ApiError };
    if (name === "@/utils/findLoveProfile") return rules;
    if (name === "@/utils/findLoveMembership") return membership;
  });
}

const demo = loadService({});
const real = loadService({ EXPO_PUBLIC_FINDLOVE_ENABLED: "true", EXPO_PUBLIC_USE_FINDLOVE_API: "true" });

beforeEach(() => {
  stored = new Map();
  apiCalls = [];
  apiHandler = async () => undefined;
});

test("FindLove and its API are off unless explicitly switched on", () => {
  assert.equal(demo.FIND_LOVE_ENABLED, false);
  assert.equal(demo.USE_FINDLOVE_API, false);
  assert.equal(loadService({ EXPO_PUBLIC_FINDLOVE_ENABLED: "1" }).FIND_LOVE_ENABLED, false);
  assert.equal(real.FIND_LOVE_ENABLED, true);
  assert.equal(real.USE_FINDLOVE_API, true);
});

test("profiles without a valid 18+ age are dropped, never defaulted", () => {
  const base = { id: "p1", name: "Ana", gender: "female" };
  assert.equal(demo.normalizeLoveProfile(base), null);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: 17 }), null);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: "abc" }), null);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: 18.5 }), null);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: null }), null);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: 18 }).age, 18);
  assert.equal(demo.normalizeLoveProfile({ ...base, age: "24" }).age, 24);
});

test("rows are mapped to the FindLove profile model", () => {
  assert.equal(demo.normalizeLoveProfile({ age: 22 }), null);
  const profile = demo.normalizeLoveProfile({
    id: 7,
    age: 30,
    displayName: "Kalisa",
    handle: "kalisa_k",
    gender: "male",
    accountType: "private",
    online: true,
    neighbourhood: "Remera",
    connectionStatus: "connected",
  });
  assert.equal(profile.id, "7");
  assert.equal(profile.username, "kalisa_k");
  assert.equal(profile.name, "Kalisa");
  assert.equal(profile.gender, "Man");
  assert.equal(profile.accountType, "private");
  assert.equal(profile.isOnline, true);
  assert.equal(profile.neighborhood, "Remera");
  assert.equal(profile.connectionStatus, "connected");

  const sparse = demo.normalizeLoveProfile({ id: "x", age: 21, gender: "F", accountType: "secret", connectionStatus: "weird" });
  assert.equal(sparse.accountType, "public");
  // A membership object decides the badge: unpaid or expired Private shows as Public.
  const row = { id: "m", age: 25, gender: "F" };
  assert.equal(demo.normalizeLoveProfile({ ...row, accountType: "private", membership: { type: "private", status: "pending_payment" } }).accountType, "public");
  assert.equal(demo.normalizeLoveProfile({ ...row, membership: { type: "private", status: "active", expiresAt: "2000-01-01T00:00:00Z" } }).accountType, "public");
  assert.equal(demo.normalizeLoveProfile({ ...row, membership: { type: "private", status: "active" } }).accountType, "private");
  assert.equal(sparse.isOnline, false);
  assert.equal(sparse.neighborhood, undefined);
  assert.equal(sparse.connectionStatus, "none");
});

test("both list response shapes are read and invalid rows filtered", () => {
  const rows = [{ id: "a", age: 20, gender: "woman" }, { id: "b", age: 16, gender: "man" }, { id: "c", age: 30, gender: "they" }, null];
  assert.deepEqual(demo.readLoveProfilesResponse(rows).map((p) => p.id), ["a"]);
  assert.deepEqual(demo.readLoveProfilesResponse({ profiles: rows }).map((p) => p.id), ["a"]);
  assert.deepEqual(demo.readLoveProfilesResponse({ data: rows }), []);
});

test("every mock profile passes the same rules as server data", () => {
  for (const profile of profiles.MOCK_LOVE_PROFILES) {
    assert.ok(demo.normalizeLoveProfile(profile), `${profile.id} would be dropped`);
    assert.ok(profile.username && profile.neighborhood, `${profile.id} is missing new fields`);
  }
});

test("demo mode never calls the API and remembers connection requests", async () => {
  const target = profiles.MOCK_LOVE_PROFILES.find((p) => (p.connectionStatus ?? "none") === "none");
  assert.equal(await demo.requestLoveConnection(target.id), "pending");
  await demo.requestLoveConnection(target.id);

  const list = await demo.fetchLoveProfiles();
  assert.equal(list.find((p) => p.id === target.id).connectionStatus, "pending");
  assert.equal(list.find((p) => p.connectionStatus === "connected")?.connectionStatus, "connected");
  assert.equal(JSON.parse([...stored.values()][0]).length, 1);
  assert.deepEqual(apiCalls, []);
});

test("real mode uses the server's status and surfaces errors", async () => {
  apiHandler = async () => ({ profiles: [{ id: "srv", age: 25, gender: "male", connectionStatus: "connected" }] });
  const list = await real.fetchLoveProfiles();
  assert.deepEqual(list.map((p) => [p.id, p.connectionStatus]), [["srv", "connected"]]);
  assert.deepEqual(apiCalls[0], ["GET", "/api/v1/love-profiles"]);

  apiHandler = async () => ({ connectionStatus: "connected" });
  assert.equal(await real.requestLoveConnection("a/b"), "connected");
  assert.equal(apiCalls[1][1], "/api/v1/love-profiles/a%2Fb/connections");

  apiHandler = async () => undefined;
  assert.equal(await real.requestLoveConnection("c"), "pending");

  apiHandler = async () => {
    throw new ApiError(503, "Service unavailable");
  };
  await assert.rejects(real.fetchLoveProfiles(), /Service unavailable/);
  await assert.rejects(real.requestLoveConnection("c"), /Service unavailable/);
  assert.equal(stored.size, 0);
});

// ---- Phase 1: entry, 18+ and the member's own profile ----

const TODAY = new Date(2026, 9, 15); // 15 Oct 2026, local time

test("age is counted in whole years and the 18th birthday is the cut-off", () => {
  assert.equal(rules.ageOn("2008-10-15", TODAY), 18);
  assert.equal(rules.ageOn("2008-10-16", TODAY), 17);
  assert.equal(rules.isAdult("2008-10-15", TODAY), true);
  assert.equal(rules.isAdult("2008-10-16", TODAY), false);
  assert.equal(rules.isAdult("not a date", TODAY), false);
});

test("date of birth inputs are parsed strictly", () => {
  assert.deepEqual(rules.parseDateOfBirth("5", "3", "1998", TODAY), { value: "1998-03-05" });
  assert.ok("error" in rules.parseDateOfBirth("31", "2", "1998", TODAY), "31 Feb rejected");
  assert.ok("error" in rules.parseDateOfBirth("1", "13", "1998", TODAY), "month 13 rejected");
  assert.ok("error" in rules.parseDateOfBirth("1", "1", "98", TODAY), "2-digit year rejected");
  assert.ok("error" in rules.parseDateOfBirth("", "1", "1998", TODAY), "missing day rejected");
  assert.ok("error" in rules.parseDateOfBirth("1", "1", "2030", TODAY), "future date rejected");
  assert.ok("error" in rules.parseDateOfBirth("1", "1", "1890", TODAY), "implausible year rejected");
});

test("usernames are lowercased and limited to safe characters", () => {
  assert.equal(rules.normalizeLoveUsername("  @Amara.K "), "amara.k");
  assert.equal(rules.validateLoveUsername("amara_k2"), undefined);
  assert.ok(rules.validateLoveUsername("ab"));
  assert.ok(rules.validateLoveUsername("a".repeat(21)));
  assert.ok(rules.validateLoveUsername("2amara"));
  assert.ok(rules.validateLoveUsername("amara k"));
  assert.ok(rules.validateLoveUsername("amara."));
  assert.ok(rules.validateLoveUsername("am..ara"));
  assert.equal(rules.validateLoveGender("Woman"), undefined);
  assert.ok(rules.validateLoveGender("They"));
});

const validInput = {
  username: "New.Member",
  gender: "Woman",
  dateOfBirth: "1998-03-05",
  accountType: "public",
  photoUrls: ["file:///a.jpg"],
  confirmedAdult: true,
};

test("own-profile input breaking a rule is rejected with the field name", () => {
  const field = (input, isNew = true) => {
    try {
      demo.checkMyLoveProfileInput(input, isNew, TODAY);
      return null;
    } catch (err) {
      return err.field;
    }
  };
  assert.equal(field(validInput), null);
  assert.equal(field({ ...validInput, dateOfBirth: "2010-01-01" }), "dateOfBirth");
  assert.equal(field({ ...validInput, confirmedAdult: false }), "confirmedAdult");
  assert.equal(field({ ...validInput, confirmedAdult: false }, false), null, "edits don't re-ask");
  assert.equal(field({ ...validInput, gender: "They" }), "gender");
  assert.equal(field({ ...validInput, photoUrls: [] }), null, "photos are optional");
  assert.equal(field({ ...validInput, photoUrls: ["1", "2", "3"] }), "photoUrls");
  assert.equal(field({ ...validInput, username: "x" }), "username");
});

test("demo mode creates, reloads and updates a profile per account", async () => {
  assert.equal(await demo.fetchMyLoveProfile("u1"), null);
  const created = await demo.saveMyLoveProfile("u1", validInput, true);
  assert.equal(created.username, "new.member");
  assert.equal((await demo.fetchMyLoveProfile("u1")).username, "new.member");
  assert.equal(await demo.fetchMyLoveProfile("u2"), null, "other accounts don't see it");

  const updated = await demo.saveMyLoveProfile("u1", { ...validInput, username: "renamed", confirmedAdult: undefined }, false);
  assert.equal(updated.username, "renamed");
  assert.equal(updated.createdAt, created.createdAt);
  assert.deepEqual(apiCalls, []);
});

test("demo mode rejects a username another member already uses", async () => {
  const taken = profiles.MOCK_LOVE_PROFILES[0].username.toUpperCase();
  await assert.rejects(demo.saveMyLoveProfile("u1", { ...validInput, username: taken }, true), (err) => err.field === "username");
  assert.equal(stored.size, 0);
});

test("real mode: 404 means no profile, 409 means username taken, other errors surface", async () => {
  apiHandler = async () => {
    throw new ApiError(404, "Not found");
  };
  assert.equal(await real.fetchMyLoveProfile("u1"), null);
  assert.deepEqual(apiCalls[0], ["GET", "/api/v1/love-profiles/me"]);

  apiHandler = async () => {
    throw new ApiError(500, "Server error");
  };
  await assert.rejects(real.fetchMyLoveProfile("u1"), /Server error/);

  apiHandler = async () => {
    throw new ApiError(409, "Conflict");
  };
  await assert.rejects(real.saveMyLoveProfile("u1", validInput, true), (err) => err.field === "username");
});

test("real mode creates with POST, updates with PUT and reads the reply", async () => {
  apiHandler = async (_method, _path, body) => ({ ...body, gender: "female", photos: body.photoUrls });
  const created = await real.saveMyLoveProfile("u1", validInput, true);
  assert.equal(apiCalls[0][0], "POST");
  assert.equal(apiCalls[0][2].username, "new.member");
  assert.equal(apiCalls[0][2].gender, "woman");
  assert.equal(apiCalls[0][2].confirmedAdult, true);
  assert.equal(created.gender, "Woman");

  await real.saveMyLoveProfile("u1", validInput, false);
  assert.equal(apiCalls[1][0], "PUT");
  assert.equal(apiCalls[1][2].confirmedAdult, undefined);

  apiHandler = async () => ({ unexpected: true });
  await assert.rejects(real.saveMyLoveProfile("u1", validInput, false), /unexpected reply/);
  assert.equal(stored.size, 0, "real mode never writes demo storage");
});
test("bio, interests and neighbourhood are optional but checked when given", () => {
  const field = (input) => {
    try {
      demo.checkMyLoveProfileInput({ ...validInput, ...input }, false, TODAY);
      return null;
    } catch (err) {
      return err.field;
    }
  };
  assert.equal(field({ bio: "Coffee and concerts", interests: ["Coffee", "Dance"], neighborhood: "Remera" }), null);
  assert.equal(field({ bio: "x".repeat(rules.LOVE_BIO_MAX + 1) }), "bio");
  assert.equal(field({ interests: ["Coffee", "Dance", "Art", "Books", "Food", "Travel"] }), "interests");
  assert.equal(field({ interests: ["Knitting"] }), "interests", "only listed interests");
  assert.equal(field({ neighborhood: "Exact GPS spot" }), "neighborhood", "only listed neighbourhoods");
});

test("extras are saved, trimmed and read back; empty ones are dropped", async () => {
  await demo.saveMyLoveProfile("u1", validInput, true);
  const saved = await demo.saveMyLoveProfile(
    "u1",
    { ...validInput, bio: "  Hi there  ", interests: ["Coffee", "Coffee", "Dance"], neighborhood: "Remera" },
    false,
  );
  assert.equal(saved.bio, "Hi there");
  assert.deepEqual(saved.interests, ["Coffee", "Dance"]);
  assert.equal(saved.neighborhood, "Remera");
  const reloaded = await demo.fetchMyLoveProfile("u1");
  assert.deepEqual([reloaded.bio, reloaded.interests, reloaded.neighborhood], ["Hi there", ["Coffee", "Dance"], "Remera"]);

  const cleared = await demo.saveMyLoveProfile("u1", { ...validInput, bio: "   ", interests: [], neighborhood: undefined }, false);
  assert.equal(cleared.bio, undefined);
  assert.equal(cleared.neighborhood, undefined);

  apiHandler = async (_method, _path, body) => body;
  await real.saveMyLoveProfile("u1", { ...validInput, bio: " Hey ", neighborhood: "Kiyovu" }, false);
  assert.equal(apiCalls[0][2].bio, "Hey");
  assert.equal(apiCalls[0][2].neighborhood, "Kiyovu");
});
// ---- Phase 2: discovery ----

const discovery = load("utils/findLoveDiscovery.ts", {}, () => undefined);
const NOW = Date.parse("2026-10-15T12:00:00Z");
const ago = (minutes) => new Date(NOW - minutes * 60000).toISOString();
const person = (over) => ({
  username: "x",
  gender: "Woman",
  isOnline: false,
  bio: "",
  interests: [],
  ...over,
});

test("presence: online within 5 min, recent within 24 h, otherwise away", () => {
  assert.equal(discovery.presenceOf(person({ lastActiveAt: ago(0) }), NOW), "online");
  assert.equal(discovery.presenceOf(person({ lastActiveAt: ago(5) }), NOW), "online");
  assert.equal(discovery.presenceOf(person({ lastActiveAt: ago(6) }), NOW), "recent");
  assert.equal(discovery.presenceOf(person({ lastActiveAt: ago(24 * 60) }), NOW), "recent");
  assert.equal(discovery.presenceOf(person({ lastActiveAt: ago(24 * 60 + 1) }), NOW), "away");
  // A stale isOnline flag can't override an old timestamp...
  assert.equal(discovery.presenceOf(person({ isOnline: true, lastActiveAt: ago(60 * 48) }), NOW), "away");
  // ...but is used when no timestamp is sent.
  assert.equal(discovery.presenceOf(person({ isOnline: true }), NOW), "online");
  assert.equal(discovery.presenceOf(person({ lastActiveAt: "garbage" }), NOW), "away");
});

test("presence labels", () => {
  assert.equal(discovery.presenceLabel(person({ lastActiveAt: ago(2) }), NOW), "Online now");
  assert.equal(discovery.presenceLabel(person({ lastActiveAt: ago(12) }), NOW), "Active 12m ago");
  assert.equal(discovery.presenceLabel(person({ lastActiveAt: ago(185) }), NOW), "Active 3h ago");
  assert.equal(discovery.presenceLabel(person({ lastActiveAt: ago(60 * 30) }), NOW), null);
});


test("filters combine and results are ordered online, recent, away", () => {
  const list = [
    person({ username: "away_w", lastActiveAt: ago(60 * 48), neighborhood: "Remera" }),
    person({ username: "recent_m", gender: "Man", lastActiveAt: ago(120), interests: ["Coffee"] }),
    person({ username: "online_w", lastActiveAt: ago(1), neighborhood: "Remera", bio: "Jazz nights" }),
  ];
  const names = (filters) => discovery.filterProfiles(list, { ...discovery.DEFAULT_DISCOVERY_FILTERS, ...filters }, NOW).map((p) => p.username);
  assert.deepEqual(names({}), ["online_w", "recent_m", "away_w"]);
  assert.deepEqual(names({ gender: "Woman" }), ["online_w", "away_w"]);
  assert.deepEqual(names({ presence: "online" }), ["online_w"]);
  assert.deepEqual(names({ presence: "recent" }), ["online_w", "recent_m"], "recent includes online");
  assert.deepEqual(names({ neighborhood: "Remera" }), ["online_w", "away_w"]);
  assert.deepEqual(names({ query: "@ONLINE" }), ["online_w"], "username search ignores @ and case");
  assert.deepEqual(names({ query: "coffee" }), ["recent_m"]);
  assert.deepEqual(names({ query: "jazz" }), ["online_w"]);
  assert.deepEqual(names({ query: "man" }), [], "gender is not text-searchable");
  assert.equal(discovery.activeFilterCount({ gender: "Man", presence: "online", neighborhood: "Remera", query: "" }), 3);
});

test("demo list gives every member a last-active time and includes a private member", async () => {
  const list = await demo.fetchLoveProfiles();
  assert.ok(list.every((p) => typeof p.lastActiveAt === "string"));
  assert.ok(list.some((p) => discovery.presenceOf(p) === "online"));
  assert.ok(list.some((p) => discovery.presenceOf(p) === "recent"));
  assert.ok(list.some((p) => p.accountType === "private"), "a Private demo member is listed: everyone can discover them");
  for (const p of list) {
    if (p.neighborhood) assert.ok(rules.LOVE_NEIGHBORHOODS.some((n) => n.name === p.neighborhood), `${p.id} neighbourhood not in list`);
  }
});
// ---- Task 2: Public and Private membership ----

const DAY = 24 * 60 * 60 * 1000;

test("only an active, unexpired Private membership counts as Private", () => {
  const now = Date.UTC(2026, 9, 16);
  assert.equal(membership.activeAccountType(undefined, now), "public");
  assert.equal(membership.activeAccountType({ type: "public", status: "active" }, now), "public");
  assert.equal(membership.activeAccountType({ type: "private", status: "pending_payment" }, now), "public", "no privileges before payment");
  assert.equal(membership.activeAccountType({ type: "private", status: "expired" }, now), "public");
  assert.equal(membership.activeAccountType({ type: "private", status: "active" }, now), "private");
  assert.equal(membership.activeAccountType({ type: "private", status: "active", expiresAt: new Date(now + DAY).toISOString() }, now), "private");
  assert.equal(membership.activeAccountType({ type: "private", status: "active", expiresAt: new Date(now).toISOString() }, now), "public");
  assert.equal(membership.activeAccountType({ type: "private", status: "active", expiresAt: "garbage" }, now), "public");
});

test("membership from the API never defaults to Private", () => {
  assert.deepEqual(membership.normalizeMembership(undefined), { type: "public", status: "active" });
  assert.deepEqual(membership.normalizeMembership({ type: "gold" }), { type: "public", status: "active" });
  assert.deepEqual(membership.normalizeMembership({ type: "private" }), { type: "private", status: "pending_payment" });
  assert.deepEqual(membership.normalizeMembership({ type: "private", status: "active", expiresAt: "2027-01-01T00:00:00Z" }), {
    type: "private",
    status: "active",
    expiresAt: "2027-01-01T00:00:00Z",
  });
});

test("connecting with a Private member needs Private; everyone may connect with Public", () => {
  assert.deepEqual(membership.canConnect("public", "public"), { allowed: true });
  assert.deepEqual(membership.canConnect("public", "private"), { allowed: false, reason: "upgrade_required" });
  assert.deepEqual(membership.canConnect("private", "private"), { allowed: true });
  assert.deepEqual(membership.canConnect("private", "public"), { allowed: true });
});

test("demo: choosing Private starts unpaid, and the profile form can't grant it", async () => {
  const created = await demo.saveMyLoveProfile("u1", { ...validInput, accountType: "private" }, true);
  assert.deepEqual(created.membership, { type: "private", status: "pending_payment" });
  assert.equal(membership.activeAccountType(created.membership), "public");

  const publicOne = await demo.saveMyLoveProfile("u2", { ...validInput, username: "other.one" }, true);
  assert.deepEqual(publicOne.membership, { type: "public", status: "active" });
  // Editing with accountType "private" must not change the membership.
  const edited = await demo.saveMyLoveProfile("u2", { ...validInput, username: "other.one", accountType: "private" }, false);
  assert.deepEqual(edited.membership, { type: "public", status: "active" });
});

test("demo: a Public member is refused a Private member until payment succeeds", async () => {
  const privateMember = profiles.MOCK_LOVE_PROFILES.find((p) => p.accountType === "private");
  const publicMember = profiles.MOCK_LOVE_PROFILES.find((p) => p.accountType === "public" && (p.connectionStatus ?? "none") === "none");
  await demo.saveMyLoveProfile("u1", { ...validInput, accountType: "private" }, true);

  await assert.rejects(demo.requestLoveConnection(privateMember.id, "u1"), (err) => err instanceof demo.MembershipRequiredError);
  assert.equal(await demo.requestLoveConnection(publicMember.id, "u1"), "pending");

  assert.equal((await demo.buyPrivateMembership("u1", { paymentMethod: "mtn_momo", payerPhone: "+250788000000" }, "failed")).status, "failed");
  assert.equal((await demo.buyPrivateMembership("u1", { paymentMethod: "mtn_momo", payerPhone: "+250788000000" }, "cancelled")).status, "cancelled");
  assert.equal(membership.activeAccountType((await demo.fetchMyLoveProfile("u1")).membership), "public", "failed/cancelled grant nothing");
  await assert.rejects(demo.requestLoveConnection(privateMember.id, "u1"), (err) => err instanceof demo.MembershipRequiredError);

  assert.equal((await demo.buyPrivateMembership("u1", { paymentMethod: "mtn_momo", payerPhone: "+250788000000" })).status, "succeeded");
  const mine = await demo.fetchMyLoveProfile("u1");
  assert.equal(membership.activeAccountType(mine.membership), "private");
  assert.ok(Date.parse(mine.membership.expiresAt) > Date.now());
  assert.equal(await demo.requestLoveConnection(privateMember.id, "u1"), "pending");
  assert.deepEqual(apiCalls, []);
});

test("real mode: 403 on connect means membership required", async () => {
  apiHandler = async () => {
    throw new ApiError(403, "Private membership required");
  };
  await assert.rejects(real.requestLoveConnection("p"), (err) => err instanceof real.MembershipRequiredError);
  apiHandler = async () => {
    throw new ApiError(500, "Boom");
  };
  await assert.rejects(real.requestLoveConnection("p"), (err) => !(err instanceof real.MembershipRequiredError) && /Boom/.test(err.message));
});

test("real mode: create sends the chosen account type; membership is read from the reply", async () => {
  apiHandler = async (_method, _path, body) => ({ ...body, membership: { type: "private", status: "pending_payment" } });
  const created = await real.saveMyLoveProfile("u1", { ...validInput, accountType: "private" }, true);
  assert.equal(apiCalls[0][2].accountType, "private");
  assert.equal(apiCalls[0][2].visibility, undefined);
  assert.deepEqual(created.membership, { type: "private", status: "pending_payment" });

  await real.saveMyLoveProfile("u1", { ...validInput, accountType: "private" }, false);
  assert.equal(apiCalls[1][2].accountType, undefined, "updates never send an account type");
});

test("real mode: checkout returns the payment's final status", async () => {
  apiHandler = async (method, p) => (method === "POST" ? { paymentId: "pay/1", status: "succeeded" } : undefined);
  assert.deepEqual(await real.buyPrivateMembership("u1", { paymentMethod: "airtel_money", payerPhone: "+250730000000" }), { status: "succeeded" });
  assert.deepEqual(apiCalls[0], [
    "POST",
    "/api/v1/love-profiles/me/membership/checkout",
    { planId: membership.PRIVATE_MEMBERSHIP_PLAN.id, paymentMethod: "airtel_money", payerPhone: "+250730000000" },
  ]);

  apiHandler = async () => ({ paymentId: "p2", status: "failed", message: "Insufficient balance." });
  assert.deepEqual(await real.buyPrivateMembership("u1", { paymentMethod: "mtn_momo", payerPhone: "+250788000000" }), {
    status: "failed",
    message: "Insufficient balance.",
  });

  apiHandler = async () => {
    throw new ApiError(502, "Payment provider down");
  };
  await assert.rejects(real.buyPrivateMembership("u1", { paymentMethod: "mtn_momo", payerPhone: "+250788000000" }), /provider down/);
  assert.equal(stored.size, 0, "real mode never writes demo storage");
});
