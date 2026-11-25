const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = {};
  new Function("require", "exports", compiled)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, result);
  return result;
}

function accountService(account, refreshSession) {
  return load("services/accountRoleSync.ts", {
    "@/utils/apiClient": {
      api: { get: async () => account },
      getSessionGeneration: () => 1,
      refreshSession,
    },
  });
}

test("promotion refreshes the session before returning the new account", async () => {
  let refreshed = 0;
  const account = { id: "one", roles: ["customer", "organizer_owner"] };
  const service = accountService(account, async () => { refreshed++; });
  assert.equal(await service.fetchAccountWithCurrentRoles(["customer"], "one"), account);
  assert.equal(refreshed, 1);
});

test("unchanged roles do not refresh, even if the order changes", async () => {
  let refreshed = 0;
  const service = accountService({ id: "one", roles: ["organizer_owner", "customer"] }, async () => { refreshed++; });
  await service.fetchAccountWithCurrentRoles(["customer", "organizer_owner"], "one");
  assert.equal(refreshed, 0);
});

test("an older cache with organiser access receives a refreshed token", async () => {
  let refreshed = 0;
  const service = accountService({ id: "one", roles: ["organizer_owner"] }, async () => { refreshed++; });
  await service.fetchAccountWithCurrentRoles();
  assert.equal(refreshed, 1);
});

test("refresh failures and account mismatches are propagated", async () => {
  let refreshed = 0;
  const service = accountService({ id: "two", roles: ["organizer_owner"] }, async () => {
    refreshed++;
    throw new Error("refresh failed");
  });
  await assert.rejects(service.fetchAccountWithCurrentRoles([], "one"), /session changed/);
  assert.equal(refreshed, 0);
  await assert.rejects(service.fetchAccountWithCurrentRoles([], "two"), /refresh failed/);
  await assert.rejects(accountService({ id: "one" }, async () => {}).fetchAccountWithCurrentRoles(), /did not include roles/);
});

test("a session switch during the account request cannot refresh the new account", async () => {
  let generation = 1;
  let refreshed = 0;
  const service = load("services/accountRoleSync.ts", {
    "@/utils/apiClient": {
      api: { get: async () => { generation++; return { id: "one", roles: ["organizer_owner"] }; } },
      getSessionGeneration: () => generation,
      refreshSession: async () => { refreshed++; },
    },
  });
  await assert.rejects(service.fetchAccountWithCurrentRoles(["customer"], "one"), /session changed/);
  assert.equal(refreshed, 0);
});

test("subscription refresh detects an approval even when account roles stay the same", async () => {
  let status = "PENDING";
  const organiser = load("services/organiserService.ts", {
    "@/utils/formDataFile": {},
    "@/utils/apiClient": {
      api: { get: async () => ({ items: [{ id: "sub", planId: "plan", status, startsAt: null, expiresAt: null, postsRemaining: 3 }] }) },
      ApiError: class ApiError extends Error {},
    },
  });
  assert.equal(organiser.activeOrganiserSubscription(await organiser.fetchMyOrganiserSubscriptions()), undefined);
  status = "ACTIVE";
  assert.deepEqual(organiser.activeOrganiserSubscription(await organiser.fetchMyOrganiserSubscriptions()), {
    id: "sub", planId: "plan", status: "active", postsRemaining: 3,
  });
});

test("approved access remains in setup until an organisation exists", () => {
  const { getOrganiserStep } = load("hooks/useOrganiserAccess.ts", {
    "expo-router": {},
    react: {},
    "@/context/AuthContext": {},
  });
  assert.equal(getOrganiserStep(null), "intro");
  assert.equal(getOrganiserStep({ organiserSubscription: { status: "active" } }), "setup");
  assert.equal(getOrganiserStep({ organisations: [{ id: "org" }] }), "ready");
  assert.equal(getOrganiserStep({ organisation: { id: "org" }, organiserApplication: { status: "IN_REVIEW" } }), "intro");
  assert.equal(getOrganiserStep({ organisation: { id: "org" }, organiserApplication: { status: "REJECTED" } }), "intro");
  assert.equal(getOrganiserStep({ organisation: { id: "org" }, organiserApplication: { status: "APPROVED" } }), "ready");
});

test("paid organisers resume profile setup instead of starting another application or payment", () => {
  const { getOrganiserDestination } = load("hooks/useOrganiserAccess.ts", {
    "expo-router": {}, react: {}, "@/context/AuthContext": {},
  });
  const paid = { organiserSubscription: { status: "active" } };
  assert.equal(getOrganiserDestination(paid, true), "/organiser/setup");
  assert.equal(getOrganiserDestination({ ...paid, organiserApplication: { status: "APPROVED" } }, true), "/organiser/setup");
  assert.equal(getOrganiserDestination({ ...paid, organisation: { id: "org" } }, true), "/business/dashboard");
  assert.equal(getOrganiserDestination({ ...paid, organiserApplication: { status: "IN_REVIEW" } }, true), null);
  assert.equal(getOrganiserDestination({ organiserApplication: { status: "PENDING_PAYMENT", manualPaymentId: "payment" } }, true), "/organiser/payments");
  assert.equal(getOrganiserDestination(null, true), "/organiser/application");
});
