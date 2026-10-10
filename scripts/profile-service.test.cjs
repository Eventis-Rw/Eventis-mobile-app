const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the real modules against an in-memory storage adapter; no RN runtime required.
process.env.NODE_ENV = "test";
let stored = new Map();
const storage = {
  getItem: async (key) => stored.get(key) ?? null,
  setItem: async (key, value) => {
    stored.set(key, value);
  },
  getAllKeys: async () => [...stored.keys()],
  multiRemove: async (keys) => keys.forEach((k) => stored.delete(k)),
};
class ApiError extends Error {}
const apiStub = { api: {}, ApiError };

function load(relPath, resolve) {
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
    process,
  );
  return exportsObject;
}

const profile = load("services/profileService.ts", (name) => {
  if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
  if (name === "@/utils/apiClient") return apiStub;
});
const { getAccountCapabilities } = load("utils/accountCapabilities.ts", (name) => {
  if (name === "@/services/profileService") return profile;
});

beforeEach(() => {
  stored = new Map();
});

test("notification preferences default sensibly and persist per user", async () => {
  const defaults = await profile.fetchNotificationPreferences("u1");
  assert.deepEqual(defaults, profile.DEFAULT_NOTIFICATION_PREFERENCES);
  assert.equal(defaults.promotional, false);

  await profile.updateNotificationPreferences("u1", { promotional: true, categoryUpdates: false });
  const reloaded = await profile.fetchNotificationPreferences("u1");
  assert.equal(reloaded.promotional, true);
  assert.equal(reloaded.categoryUpdates, false);
  assert.equal(reloaded.bookingUpdates, true);

  assert.equal((await profile.fetchNotificationPreferences("u2")).promotional, false);
});

test("discovery preferences drop 'All', duplicates and blank locations", async () => {
  const saved = await profile.updateDiscoveryPreferences("u1", {
    categories: ["All", "Music", "Music", "Tech"],
    location: "   ",
  });
  assert.deepEqual(saved, { categories: ["Music", "Tech"], location: undefined });
  assert.deepEqual((await profile.fetchDiscoveryPreferences("u1")).categories, ["Music", "Tech"]);
});

test("saved organisers are a private bookmark list without duplicates", async () => {
  const id = profile.organiserIdFromName("  Kigali Jazz Junction ");
  assert.equal(id, "org_kigali-jazz-junction");

  await profile.saveOrganiser("u1", { id, name: "Kigali Jazz Junction" });
  await profile.saveOrganiser("u1", { id, name: "Kigali Jazz Junction" });
  let list = await profile.fetchSavedOrganisers("u1");
  assert.equal(list.length, 1);
  assert.ok(list[0].savedAt);
  assert.equal("followersCount" in list[0], false);

  await profile.removeSavedOrganiser("u1", id);
  list = await profile.fetchSavedOrganisers("u1");
  assert.equal(list.length, 0);
});

test("reviews are validated and one per event", async () => {
  await assert.rejects(profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 0 }), /1 to 5/);
  await assert.rejects(
    profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 4, comment: "x".repeat(501) }),
    /500/,
  );

  const first = await profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 3, comment: "  ok  " });
  assert.equal(first.comment, "ok");
  const edited = await profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 5 });
  assert.equal(edited.id, first.id);
  const reviews = await profile.fetchMyReviews("u1");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].rating, 5);

  await profile.deleteReview("u1", first.id);
  assert.equal((await profile.fetchMyReviews("u1")).length, 0);
});

test("business verification requires a verified phone and valid details", async () => {
  const initial = await profile.fetchBusinessVerification("u1", "org1", false);
  assert.equal(initial.status, "unverified");
  assert.equal(initial.requirements.find((r) => r.id === "phone").completed, false);

  const input = { registrationNumber: "RDB-123", taxId: "123456789", representativeName: "Aline" };
  await assert.rejects(profile.submitBusinessVerification("u1", "org1", false, input), /phone/);
  await assert.rejects(
    profile.submitBusinessVerification("u1", "org1", true, { ...input, taxId: "12" }),
    /9-digit TIN/,
  );

  const submitted = await profile.submitBusinessVerification("u1", "org1", true, input);
  assert.equal(submitted.status, "pending");
  assert.equal((await profile.fetchBusinessVerification("u1", "org1", true)).status, "pending");
});

test("clearing local data only removes that user's profile slices", async () => {
  await profile.updateNotificationPreferences("u1", { promotional: true });
  await profile.updateNotificationPreferences("u2", { promotional: true });
  stored.set("@eventis_user_cache", "{}");
  await profile.clearLocalProfileData("u1");
  assert.equal((await profile.fetchNotificationPreferences("u1")).promotional, false);
  assert.equal((await profile.fetchNotificationPreferences("u2")).promotional, true);
  assert.ok(stored.has("@eventis_user_cache"));
});

const tabKeys = (caps) => caps.profileTabs.map((t) => t.key);

test("customers see the customer tabs and no publisher tools", () => {
  const caps = getAccountCapabilities({ accountType: "customer", hasOrganiserAccess: false, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "bookings", "tickets", "saved-organisers", "reviews"]);
  assert.equal(caps.canManageEvents, false);
  assert.equal(caps.canViewAnalytics, false);
  assert.equal(caps.settings.businessVerification, false);
  assert.equal(caps.settings.editBusinessProfile, false);
});

test("unsupported features are hidden rather than shown", () => {
  const features = { ...profile.PROFILE_FEATURES, savedOrganisers: false, reviews: false };
  const caps = getAccountCapabilities({
    accountType: "customer",
    hasOrganiserAccess: false,
    isPhoneVerified: true,
    features,
  });
  assert.deepEqual(tabKeys(caps), ["overview", "bookings", "tickets"]);
  assert.equal(caps.settings.savedOrganiserNotifications, false);
  assert.equal(caps.settings.blockedUsers, false);
  assert.equal(caps.settings.accountVisibility, false);
  assert.equal(caps.settings.languagePreference, false);
});

test("individual posters manage events but cannot publish paid events or see analytics", () => {
  const caps = getAccountCapabilities({ accountType: "individual", hasOrganiserAccess: true, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "published", "manage"]);
  assert.equal(caps.canPublishPaidEvents, false);
  assert.match(caps.paidEventsBlockedReason, /business/);
  assert.equal(caps.settings.businessVerification, false);
});

test("publishers without organiser access only see their published events", () => {
  const caps = getAccountCapabilities({ accountType: "business", hasOrganiserAccess: false, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "published"]);
  assert.equal(caps.canManageEvents, false);
  assert.equal(caps.canPromote, false);
});

test("paid publishing is unlocked only for verified businesses", () => {
  const base = { accountType: "business", hasOrganiserAccess: true, isPhoneVerified: true };
  for (const status of [undefined, "unverified", "pending", "rejected"]) {
    const caps = getAccountCapabilities({ ...base, businessVerification: status });
    assert.equal(caps.canPublishPaidEvents, false, `status ${status}`);
    assert.match(caps.paidEventsBlockedReason, /verification/);
  }
  const verified = getAccountCapabilities({ ...base, businessVerification: "verified" });
  assert.deepEqual(tabKeys(verified), ["overview", "published", "manage", "analytics"]);
  assert.equal(verified.canPublishPaidEvents, true);
  assert.equal(verified.paidEventsBlockedReason, undefined);
  assert.equal(verified.settings.businessVerification, true);
});
