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

test("a DELETE answered with 200 and an empty body resolves instead of failing", async () => {
  const client = loadApiClient();
  await client.setToken("access-token");
  global.fetch = async () => ({
    ...response(200, undefined),
    headers: { get: (name) => (name.toLowerCase() === "content-length" ? "0" : null) },
  });

  assert.equal(await client.api.delete("/api/v1/statuses/4d6a1c44-8f45-4eb8-9b69-52ec76cf9f0f"), undefined);
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

test("duplicate email registration exposes the sign-in error without changing the current session", async () => {
  const client = loadApiClient();
  await client.setAuthTokens("old-access", "old-refresh");
  const message = "An account with this email already exists. Please sign in instead.";
  const requests = [];
  global.fetch = async (url) => {
    requests.push(url);
    return response(409, { error: "EMAIL_ALREADY_EXISTS", code: "EMAIL_ALREADY_EXISTS", message });
  };

  await assert.rejects(
    client.api.post("/api/v1/auth/email/send-code", { email: "aline@example.com", purpose: "register", username: "Aline" }),
    (error) => error.status === 409 && error.message === message,
  );
  assert.deepEqual(requests, ["http://localhost:3000/api/v1/auth/email/send-code"]);
  assert.equal(await client.getToken(), "old-access");
  assert.equal(await client.getRefreshToken(), "old-refresh");
});

for (const outcome of ["logout", "account switch"]) {
  test(`in-flight refresh cannot overwrite tokens after ${outcome}`, async () => {
    const client = loadApiClient();
    await client.setAuthTokens("old-access", "old-refresh");
    let respond;
    let started;
    const requestStarted = new Promise((resolve) => { started = resolve; });
    global.fetch = async () => {
      started();
      return new Promise((resolve) => { respond = resolve; });
    };
    const refresh = client.refreshSession();
    await requestStarted;
    if (outcome === "logout") await client.clearToken();
    else await client.setAuthTokens("new-access", "new-refresh");
    respond(response(200, { accessToken: "stale-access", refreshToken: "stale-refresh" }));
    await assert.rejects(refresh, /session changed/);
    assert.equal(await client.getToken(), outcome === "logout" ? null : "new-access");
    assert.equal(await client.getRefreshToken(), outcome === "logout" ? null : "new-refresh");
  });
}

test("concurrent session refreshes share one token rotation", async () => {
  const client = loadApiClient();
  await client.setAuthTokens("old-access", "old-refresh");
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return response(200, { accessToken: "new-access", refreshToken: "new-refresh" });
  };
  assert.deepEqual(await Promise.all([client.refreshSession(), client.refreshSession()]), ["new-access", "new-access"]);
  assert.equal(calls, 1);
});

test("an old rejected refresh cannot clear a new account's tokens", async () => {
  const client = loadApiClient();
  await client.setAuthTokens("old-access", "old-refresh");
  let respond;
  let started;
  const requestStarted = new Promise((resolve) => { started = resolve; });
  global.fetch = async () => {
    started();
    return new Promise((resolve) => { respond = resolve; });
  };
  const refresh = client.refreshSession();
  await requestStarted;
  await client.setAuthTokens("new-access", "new-refresh");
  respond(response(401, { message: "Invalid refresh token" }));
  await assert.rejects(refresh);
  assert.equal(await client.getToken(), "new-access");
  assert.equal(await client.getRefreshToken(), "new-refresh");
});

for (const endpoint of ["/api/v1/auth/email/send-code", "/api/v1/auth/email/verify-code", "/api/v1/auth/social"]) {
  test(`${endpoint} failures do not refresh an unrelated existing session`, async () => {
    const client = loadApiClient();
    await client.setAuthTokens("old-access", "old-refresh");
    const requests = [];
    global.fetch = async (url) => { requests.push(url); return response(401, { message: "Invalid credentials" }); };
    await assert.rejects(client.api.post(endpoint, {}), (error) => error.status === 401);
    assert.deepEqual(requests, [`http://localhost:3000${endpoint}`]);
    assert.equal(await client.getRefreshToken(), "old-refresh");
  });
}
