const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "..", "services", "socialAuth.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function load({ platform = "android", google = {}, apple = {}, configured = true } = {}) {
  const exports = {};
  const calls = {};
  new Function("require", "exports", "process", compiled)((name) => {
    if (name === "react-native") return { Platform: { OS: platform } };
    if (name === "expo-crypto") return {
      randomUUID: () => "test-nonce-1234567890",
      CryptoDigestAlgorithm: { SHA256: "SHA256" },
      digestStringAsync: async (_, value) => crypto.createHash("sha256").update(value).digest("hex"),
    };
    if (name === "@react-native-google-signin/google-signin") return {
      GoogleSignin: {
        configure: (input) => { calls.googleConfig = input; },
        hasPlayServices: async () => { calls.playServices = true; },
        signIn: async () => ({ type: "success", data: { idToken: "google-token" } }),
        ...google,
      },
      isSuccessResponse: (response) => response.type === "success",
      isErrorWithCode: (error) => Boolean(error?.code),
      statusCodes: { SIGN_IN_CANCELLED: "cancelled" },
    };
    if (name === "expo-apple-authentication") return {
      AppleAuthenticationScope: { FULL_NAME: "name", EMAIL: "email" },
      signInAsync: async (input) => { calls.appleRequest = input; return { identityToken: "apple-token", fullName: null }; },
      ...apple,
    };
    throw new Error(`Unexpected module: ${name}`);
  }, exports, { env: configured ? { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client", EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client" } : {} });
  return { ...exports, calls };
}

test("Google checks Android Play Services and returns an ID token for server validation", async () => {
  const sdk = load();
  assert.deepEqual(await sdk.getGoogleCredential(), { provider: "google", idToken: "google-token" });
  assert.equal(sdk.calls.playServices, true);
  assert.equal(sdk.calls.googleConfig.webClientId, "web-client");
});

test("cancelled Google consent does not create credentials", async () => {
  const sdk = load({ google: { signIn: async () => ({ type: "cancelled" }) } });
  assert.equal(await sdk.getGoogleCredential(), null);
});

test("missing Google config or ID token fails before session exchange", async () => {
  await assert.rejects(load({ configured: false }).getGoogleCredential(), /not configured/);
  const sdk = load({ google: { signIn: async () => ({ type: "success", data: { idToken: null } }) } });
  await assert.rejects(sdk.getGoogleCredential(), /did not return a sign-in token/);
});

test("Apple uses a SHA-256 nonce and accepts returning users without a name", async () => {
  const sdk = load({ platform: "ios" });
  const credential = await sdk.getAppleCredential();
  assert.equal(credential.provider, "apple");
  assert.equal(credential.idToken, "apple-token");
  assert.equal(sdk.calls.appleRequest.nonce, crypto.createHash("sha256").update(credential.nonce).digest("hex"));
  assert.equal(credential.username, undefined);
});

test("cancelled Apple consent does not create credentials", async () => {
  const sdk = load({ platform: "ios", apple: { signInAsync: async () => { throw { code: "ERR_REQUEST_CANCELED" }; } } });
  assert.equal(await sdk.getAppleCredential(), null);
});

test("unsupported platforms do not open provider sign-in", async () => {
  await assert.rejects(load({ platform: "web" }).getGoogleCredential(), /mobile app/);
  await assert.rejects(load({ platform: "android" }).getAppleCredential(), /iOS/);
});
