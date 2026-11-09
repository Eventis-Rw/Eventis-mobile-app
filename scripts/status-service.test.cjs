const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const calls = [];
const api = {
  get: async (url) => {
    calls.push({ method: "GET", url });
    return [];
  },
  post: async (url, body) => {
    calls.push({ method: "POST", url, body });
    return record();
  },
  postForm: async (url, body) => {
    calls.push({ method: "POST_FORM", url, body });
    return { media_url: "https://cdn.eventis.rw/statuses/upload.jpg" };
  },
  delete: async (url) => {
    calls.push({ method: "DELETE", url });
    return undefined;
  },
};

class FakeApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class FakeFormData {
  parts = new Map();
  append(key, value, filename) {
    this.parts.set(key, { value, filename });
  }
}

const record = (overrides = {}) => ({
  id: "4d6a1c44-8f45-4eb8-9b69-52ec76cf9f0f",
  user_id: "6b8a2490-2f6e-4ede-b69e-18b1377de1d9",
  event_id: null,
  media_url: "https://cdn.eventis.rw/statuses/story.jpg",
  media_type: "image",
  caption: "Tonight",
  fit: "contain",
  background: "#080B10",
  overlays: [{ id: "layer-1", text: "Tonight", kind: "text", x: 0.5, y: 0.8, color: "#FFFFFF", style: "label", size: 23 }],
  created_at: "2026-11-05T10:00:00.000Z",
  expires_at: "2026-11-06T10:00:00.000Z",
  views_count: 4,
  owner: { id: "6b8a2490-2f6e-4ede-b69e-18b1377de1d9", name: "Kigali Events", avatar_url: null },
  ...overrides,
});

function loadStatusService() {
  const source = fs.readFileSync(path.join(__dirname, "..", "services", "statusService.ts"), "utf8");
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
      if (name === "react-native") return { Platform: { OS: "ios" } };
      if (name === "@/utils/apiClient") return { api, ApiError: FakeApiError };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    exportsObject,
    process,
  );
  return exportsObject;
}

beforeEach(() => {
  calls.length = 0;
  api.get = async (url) => {
    calls.push({ method: "GET", url });
    return [];
  };
  api.post = async (url, body) => {
    calls.push({ method: "POST", url, body });
    return record();
  };
  api.postForm = async (url, body) => {
    calls.push({ method: "POST_FORM", url, body });
    return { media_url: "https://cdn.eventis.rw/statuses/upload.jpg" };
  };
  global.FormData = FakeFormData;
});

test("maps the backend Status response into the app story shape", () => {
  const { mapApiStatus } = loadStatusService();
  const story = mapApiStatus(record());

  assert.equal(story.id, record().id);
  assert.equal(story.ownerId, record().user_id);
  assert.equal(story.organizerName, "Kigali Events");
  assert.equal(story.mediaUrl, record().media_url);
  assert.equal(story.mediaType, "image");
  assert.equal(story.fit, "contain");
  assert.equal(story.source, "api");
  assert.equal(story.overlays[0].text, "Tonight");
  assert.equal(story.createdAt, Date.parse(record().created_at));
  assert.equal(story.viewsCount, 4);
});

test("uses the caption as a text layer when another client sends no overlays", () => {
  const { mapApiStatus } = loadStatusService();
  const story = mapApiStatus(record({
    media_type: "text",
    media_url: null,
    caption: "Backstage in five minutes",
    overlays: [],
  }));

  assert.equal(story.overlays.length, 1);
  assert.equal(story.overlays[0].text, "Backstage in five minutes");
});

test("uploads media first and submits the returned URL with the status", async () => {
  const { publishStatus } = loadStatusService();
  await publishStatus({
    mediaType: "image",
    media: { uri: "file:///story.png", fileName: "story.png", mimeType: "image/png" },
    caption: "Tonight",
    fit: "contain",
    background: "#080B10",
    overlays: [{ id: "layer-1", text: "Tonight", kind: "text", x: 0.5, y: 0.8, color: "#FFFFFF", style: "label", size: 23 }],
  });

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    "POST_FORM /api/v1/statuses/media",
    "POST /api/v1/statuses",
  ]);
  const formFile = calls[0].body.parts.get("media");
  assert.equal(formFile.value.uri, "file:///story.png");
  assert.equal(formFile.value.type, "image/png");
  assert.match(formFile.value.name, /^status-.*\.png$/);
  assert.equal(calls[1].body.media_type, "image");
  assert.equal(calls[1].body.media_url, "https://cdn.eventis.rw/statuses/upload.jpg");
  assert.equal(calls[1].body.fit, "contain");
  assert.equal(calls[1].body.background, "#080B10");
  assert.equal(calls[1].body.caption, "Tonight");
  assert.equal(calls[1].body.overlays.length, 1);
});

test("text statuses skip the media upload and require a caption", async () => {
  const { publishStatus } = loadStatusService();
  await assert.rejects(
    publishStatus({ mediaType: "text", caption: "   " }),
    /Add some text/,
  );
  assert.equal(calls.length, 0);

  await publishStatus({ mediaType: "text", caption: "Tonight only", fit: "cover", background: "#101827" });
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ["POST /api/v1/statuses"]);
  assert.equal(calls[0].body.media_type, "text");
  assert.equal(calls[0].body.caption, "Tonight only");
  assert.equal(calls[0].body.media_url, undefined);
});

test("loads both own and other active statuses without duplicates", async () => {
  const { fetchStatusStories } = loadStatusService();
  const other = record({ id: "8c0f1b76-18d5-42c3-923f-022df817d52b" });
  api.get = async (url) => {
    calls.push({ method: "GET", url });
    if (url.endsWith("/feed")) return [other, record()];
    if (url.endsWith("/me")) return [record()];
    return [];
  };

  const stories = await fetchStatusStories();
  assert.deepEqual(calls.map((call) => call.url), [
    "/api/v1/statuses/feed",
    "/api/v1/statuses/me",
  ]);
  assert.equal(stories.length, 2);
});

test("loads the owner-only status viewer list", async () => {
  const { fetchStatusViewers } = loadStatusService();
  api.get = async (url) => {
    calls.push({ method: "GET", url });
    return {
      status_id: record().id,
      views_count: 2,
      viewers: [
        { id: "viewer-1", name: "Ada Mutesi", avatar_url: null, viewed_at: "2026-11-05T11:00:00.000Z" },
        { id: "viewer-2", name: "Kigali Events", avatar_url: "https://cdn.eventis.rw/avatar.jpg", viewed_at: "2026-11-05T10:30:00.000Z" },
      ],
    };
  };

  const response = await fetchStatusViewers(record().id);
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    `GET /api/v1/statuses/${record().id}/views`,
  ]);
  assert.equal(response.views_count, 2);
  assert.equal(response.viewers[0].name, "Ada Mutesi");
});

test("view and delete use the status endpoints", async () => {
  const { recordStatusView, deleteStatus } = loadStatusService();
  await recordStatusView(record().id);
  await deleteStatus(record().id);

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    `POST /api/v1/statuses/${record().id}/views`,
    `DELETE /api/v1/statuses/${record().id}`,
  ]);
});
