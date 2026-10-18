const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the real provider callbacks with an isolated hook/storage/API harness.
function authHarness(demo) {
  const states = []; const storage = new Map(); const requests = [];
  let cursor = 0; let failEndpoint;
  const react = {
    createContext: () => ({ Provider: "provider" }),
    createElement: (type, props) => props,
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect: () => {}, useCallback: (fn) => fn,
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../context/AuthContext.tsx"), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const user = { id: "customer", username: "Aline", savedEvents: [], isBusinessAccount: false };
  new Function("require", "exports", js)((name) => {
    if (name === "react") return react;
    if (name === "@react-native-async-storage/async-storage") return { getItem: async (key) => storage.get(key), setItem: async (key, value) => storage.set(key, value), removeItem: async (key) => storage.delete(key) };
    if (name === "@/constants/auth") return { DEMO_AUTH: demo };
    if (name === "@/constants/onboarding") return { ONBOARDING_COMPLETE_KEY: "onboarding" };
    if (name === "@/utils/apiClient") return { setToken: async () => {}, api: { post: async (endpoint, body) => {
      requests.push({ endpoint, body });
      if (endpoint === failEndpoint) throw Error("Network unavailable");
      return { token: "token", user };
    } } };
    if (name.startsWith("@/services/")) return {};
    throw Error(`Unexpected dependency ${name}`);
  }, exports);
  return {
    render: () => { cursor = 0; return exports.AuthProvider({ children: null }).value; },
    requests, storage, fail: (endpoint) => { failEndpoint = endpoint; },
  };
}

for (const demo of [true, false]) test(`signup requires OTP before the final PIN submission (${demo ? "demo" : "API"})`, async () => {
  const harness = authHarness(demo);
  const details = { phone: "+250788123456", username: "Aline" };
  let auth = harness.render();
  await assert.rejects(auth.register({ ...details, pin: "12345" }), /Verify your phone/);
  await auth.beginSignup(details); auth = harness.render();
  assert.equal(auth.user, null);
  assert.equal(await auth.verifySignupOTP("1234"), false);
  await assert.rejects(auth.register({ ...details, pin: "12345" }), /Verify your phone/);
  assert.equal(await auth.verifySignupOTP("123456"), true); auth = harness.render();
  assert.equal(auth.user, null);
  await assert.rejects(auth.register({ ...details, phone: "+250788999999", pin: "12345" }), /Verify your phone/);
  await assert.rejects(auth.register({ ...details, pin: "1234" }), /5 digit/);
  await auth.register({ ...details, pin: "12345" }); auth = harness.render();
  assert.equal(auth.user.username, "Aline"); assert.equal(auth.pendingSignup, null);
  assert.ok(!JSON.stringify([...harness.storage]).includes('"pin"'));
  if (!demo) {
    assert.deepEqual(harness.requests.map((request) => request.endpoint), ["/auth/request-otp", "/auth/verify-otp", "/auth/register"]);
    assert.deepEqual(harness.requests[2].body, { ...details, pin: "12345" });
  } else assert.equal(harness.requests.length, 0);
});

test("failed verification never unlocks PIN submission; resending retains the signup draft", async () => {
  const harness = authHarness(false);
  const details = { phone: "+250788123456", username: "Aline" };
  await harness.render().beginSignup(details);
  harness.fail("/auth/verify-otp");
  await assert.rejects(harness.render().verifySignupOTP("123456"), /Network/);
  assert.equal(harness.render().pendingSignup.verified, false);
  harness.fail("/auth/request-otp");
  await assert.rejects(harness.render().beginSignup(details), /Network/);
  assert.deepEqual(harness.render().pendingSignup, { ...details, verified: false });
  assert.equal(harness.render().user, null);
});
