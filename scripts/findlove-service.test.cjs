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

const profiles = load("constants/loveProfiles.ts", {}, () => undefined);
function loadService(env) {
  return load("services/findLoveService.ts", env, (name) => {
    if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
    if (name === "@/constants/loveProfiles") return profiles;
    if (name === "@/utils/apiClient") return { api, ApiError };
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
  const base = { id: "p1", name: "Ana" };
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
    visibility: "private",
    online: true,
    neighbourhood: "Remera",
    connectionStatus: "connected",
  });
  assert.equal(profile.id, "7");
  assert.equal(profile.username, "kalisa_k");
  assert.equal(profile.name, "Kalisa");
  assert.equal(profile.gender, "He");
  assert.equal(profile.visibility, "private");
  assert.equal(profile.isOnline, true);
  assert.equal(profile.neighborhood, "Remera");
  assert.equal(profile.connectionStatus, "connected");

  const sparse = demo.normalizeLoveProfile({ id: "x", age: 21, visibility: "secret", connectionStatus: "weird" });
  assert.equal(sparse.visibility, "public");
  assert.equal(sparse.isOnline, false);
  assert.equal(sparse.neighborhood, undefined);
  assert.equal(sparse.connectionStatus, "none");
});

test("both list response shapes are read and invalid rows filtered", () => {
  const rows = [{ id: "a", age: 20 }, { id: "b", age: 16 }, null];
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
  apiHandler = async () => ({ profiles: [{ id: "srv", age: 25, connectionStatus: "connected" }] });
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
