const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const storage = {
  values: new Map(),
  getItem: async (key) => storage.values.get(key) ?? null,
  setItem: async (key, value) => storage.values.set(key, value),
  multiSet: async (entries) => entries.forEach(([key, value]) => storage.values.set(key, value)),
  multiRemove: async (keys) => keys.forEach((key) => storage.values.delete(key)),
};

function loadApiClient() {
  const source = fs.readFileSync(path.join(__dirname, "..", "utils", "apiClient.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exportsObject = {};
  new Function("require", "exports", "process", compiled)(
    (name) => {
      if (name === "@react-native-async-storage/async-storage") {
        return { __esModule: true, default: storage };
      }
      if (name === "react-native") return { Platform: { OS: "ios" } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    exportsObject,
    process,
  );
  return exportsObject;
}

function response(status, body, statusText = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText,
    json: async () => {
      if (body === undefined) throw new Error("Response has no JSON body");
      return body;
    },
  };
}

beforeEach(() => {
  storage.values = new Map();
  global.fetch = async () => {
    throw new Error("Unexpected fetch");
  };
});

test("authenticated requests attach the access token", async () => {
  const client = loadApiClient();
  await client.setToken("access-token");
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return response(200, { id: "user-1" });
  };

  assert.deepEqual(await client.api.get("/api/v1/auth/me"), { id: "user-1" });
  assert.equal(request.url, "http://localhost:3000/api/v1/auth/me");
  assert.equal(request.options.headers.Authorization, "Bearer access-token");
});

test("expired access tokens refresh once and retry with rotated tokens", async () => {
  const client = loadApiClient();
  await client.setAuthTokens("expired-access", "refresh-token");
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    if (requests.length === 1) return response(401, { message: "Expired" });
    if (requests.length === 2) {
      return response(200, { accessToken: "new-access", refreshToken: "new-refresh" });
    }
    return response(200, { ok: true });
  };

  assert.deepEqual(await client.api.get("/api/v1/auth/me"), { ok: true });
  assert.equal(requests[1].url, "http://localhost:3000/api/v1/auth/refresh");
  assert.deepEqual(JSON.parse(requests[1].options.body), { refreshToken: "refresh-token" });
  assert.equal(requests[2].options.headers.Authorization, "Bearer new-access");
  assert.equal(await client.getToken(), "new-access");
  assert.equal(await client.getRefreshToken(), "new-refresh");
});

test("logout accepts the backend's empty 204 response", async () => {
  const client = loadApiClient();
  await client.setToken("access-token");
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return response(204);
  };

  assert.equal(
    await client.api.post("/api/v1/auth/logout", { refreshToken: "refresh-token" }),
    undefined,
  );
  assert.deepEqual(JSON.parse(request.options.body), { refreshToken: "refresh-token" });
});

test("authenticated session requests use the access token", async () => {
  const client = loadApiClient();
  await client.setToken("access-token");
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return response(200, {
      id: "user-1",
      phone: "+250788123456",
      displayName: "Aline Updated",
      bio: "Music fan",
    });
  };

  const session = await client.api.get("/api/v1/auth/me");
  assert.equal(request.url, "http://localhost:3000/api/v1/auth/me");
  assert.equal(request.options.headers.Authorization, "Bearer access-token");
  assert.equal(session.id, "user-1");
});

test("an invalid refresh token clears both stored tokens", async () => {
  const client = loadApiClient();
  await client.setAuthTokens("expired-access", "invalid-refresh");
  global.fetch = async (url) =>
    url.endsWith("/auth/refresh")
      ? response(401, { message: "Invalid refresh token" })
      : response(401, { message: "Expired access token" });

  await assert.rejects(client.api.get("/api/v1/auth/me"), (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.message, "Invalid refresh token");
    return true;
  });
  assert.equal(await client.getToken(), null);
  assert.equal(await client.getRefreshToken(), null);
});
