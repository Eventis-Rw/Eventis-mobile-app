const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function setup({ username = null, downloadFailure = false, initialSize, unauthorized = false } = {}) {
  const files = new Map();
  const calls = [];
  let token = "expired";
  let attempts = 0;
  const attachment = { id: "a1", fileName: "voice.m4a", mimeType: "audio/mp4", sizeBytes: 123, durationMs: 2000, width: null, height: null, downloadPath: "/media/a1" };
  const message = { id: "m1", conversationId: "c1", senderId: "other", type: "VOICE", content: null, replyToId: null, forwardedFromId: null, createdAt: "2026-01-01T00:00:00Z", editedAt: null, deletedAt: null, attachments: [attachment], receipts: [] };
  class File {
    constructor(base, name) { this.uri = name ? `${base}/${name}` : base; }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri) ?? 0; }
    delete() { files.delete(this.uri); }
    static async downloadFileAsync(url, file, options) {
      attempts++;
      calls.push({ url, authorization: options.headers.Authorization });
      if (unauthorized && attempts === 1) throw new Error("response has status: 401");
      if (downloadFailure) { files.set(file.uri, 50); throw new Error("Network error"); }
      files.set(file.uri, 123);
      return file;
    }
  }
  if (initialSize !== undefined) files.set("cache/chat-v2-self-a1.m4a", initialSize);
  const api = {
    get: async (url) => url.includes("/users/search")
      ? { items: [{ id: "u1", username, displayName: "Eden", firstName: null, lastName: null, avatarUrl: null }], page: 1, hasMore: false }
      : { items: [message] },
  };
  const source = fs.readFileSync(path.join(__dirname, "../services/apiChatService.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exportsObject = {};
  new Function("require", "exports", compiled)((name) => {
    if (name === "expo-file-system") return { File, Paths: { cache: "cache" } };
    if (name === "react-native") return { Platform: { OS: "android" } };
    if (name === "@/utils/apiClient") return {
      api, API_BASE: "https://api.example.test",
      getToken: async () => token,
      refreshSession: async () => { token = "fresh"; return token; },
    };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exportsObject);
  return { service: new exportsObject.ApiChatService(() => "self"), calls, files, allowDownloads: () => { downloadFailure = false; } };
}

test("directory profiles without usernames do not display @null", async () => {
  const { service } = setup();
  const result = await service.searchUsers("");
  assert.equal(result.items[0].name, "Eden");
  assert.equal(result.items[0].username, undefined);
  assert.equal(result.items[0].headline, "On Eventis");
});

test("directory profiles with usernames retain their handle", async () => {
  const { service } = setup({ username: "aline" });
  const result = await service.searchUsers("");
  assert.equal(result.items[0].headline, "@aline · On Eventis");
});

test("voice downloads refresh expired credentials and discard incomplete cached files", async () => {
  const { service, calls, files } = setup({ initialSize: 50, unauthorized: true });
  const [message] = await service.getMessages("c1");
  assert.equal(message.audioUri, "cache/chat-v2-self-a1.m4a");
  assert.equal(files.get(message.audioUri), 123);
  assert.deepEqual(calls.map((call) => call.authorization), ["Bearer expired", "Bearer fresh"]);
  await service.getMessages("c1");
  assert.equal(calls.length, 2);
});

test("failed downloads remain visible and can be retried", async () => {
  const { service, files, calls, allowDownloads } = setup({ downloadFailure: true });
  const [message] = await service.getMessages("c1");
  assert.match(message.attachmentError, /Tap to retry/);
  assert.equal(message.attachmentMimeType, "audio/mp4");
  assert.equal(files.size, 0);
  allowDownloads();
  const [retried] = await service.getMessages("c1");
  assert.equal(retried.audioUri, "cache/chat-v2-self-a1.m4a");
  assert.equal(retried.attachmentError, undefined);
  assert.equal(calls.length, 2);
});

test("concurrent loads share the same attachment download", async () => {
  const { service, calls } = setup();
  const [first, second] = await Promise.all([service.getMessages("c1"), service.getMessages("c1")]);
  assert.equal(calls.length, 1);
  assert.equal(first[0].audioUri, second[0].audioUri);
});
