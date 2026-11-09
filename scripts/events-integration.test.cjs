const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

process.env.EXPO_PUBLIC_USE_EVENTS_API = "true";

const calls = [];
const record = (overrides = {}) => ({
  id: "event-1",
  event_id: "event-1",
  title: "Kigali Music Night",
  description: "Live music",
  cover_image: "https://cdn.eventis.rw/event.jpg",
  category: "Music",
  location: "Kigali Arena",
  city: "Kigali",
  start_date: "2026-12-10",
  time: "18:30",
  end_date: null,
  end_time: null,
  status: "published",
  capacity: 250,
  is_paid: true,
  price_minor: "5000",
  currency: "RWF",
  booking_url: "https://tickets.eventis.rw",
  instructions: "Bring an ID",
  tags: ["music"],
  organisation_id: null,
  views_count: 21,
  rating_avg: 4.5,
  review_count: 4,
  poster_id: "poster-1",
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-02T10:00:00.000Z",
  ...overrides,
});

const api = {
  get: async (url) => {
    calls.push({ method: "GET", url });
    throw new Error(`Unexpected GET ${url}`);
  },
  postForm: async (url, body) => {
    calls.push({ method: "POST", url, body });
    return record();
  },
  patch: async (url, body) => {
    calls.push({ method: "PATCH", url, body });
    return record({ title: body.title });
  },
  patchForm: async (url, body) => {
    calls.push({ method: "PATCH_FORM", url, body });
    return record();
  },
};

class FakeFormData {
  parts = new Map();
  append(key, value, filename) {
    this.parts.set(key, { value, filename });
  }
}

function loadEventApi() {
  const source = fs.readFileSync(path.join(__dirname, "..", "services", "eventApi.ts"), "utf8");
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
      if (name === "@/constants/events") {
        return {
          CATEGORIES: ["All", "Music", "Sports", "Business", "Food", "Tech", "Art", "Nightlife", "Community"],
        };
      }
      if (name === "@/utils/apiClient") return { api };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    exportsObject,
    process,
  );
  return exportsObject;
}

function loadPublisherService(eventApi) {
  const source = fs.readFileSync(path.join(__dirname, "..", "services", "publisherService.ts"), "utf8");
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
        return {
          __esModule: true,
          default: {
            getItem: async () => null,
            setItem: async () => {},
          },
        };
      }
      if (name === "@/services/eventApi") return eventApi;
      if (name === "@/services/profileService") return { USE_PROFILE_API: false };
      if (name === "@/utils/apiClient") return { api };
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
    throw new Error(`Unexpected GET ${url}`);
  };
  api.postForm = async (url, body) => {
    calls.push({ method: "POST", url, body });
    return record();
  };
  api.patch = async (url, body) => {
    calls.push({ method: "PATCH", url, body });
    return record({ title: body.title });
  };
  api.patchForm = async (url, body) => {
    calls.push({ method: "PATCH_FORM", url, body });
    return record();
  };
  global.FormData = FakeFormData;
  global.fetch = async () => ({ ok: true, blob: async () => ({ type: "image/jpeg" }) });
});

test("API event records map into the existing app event shape", () => {
  const { mapApiEvent } = loadEventApi();
  const event = mapApiEvent(record());

  assert.equal(event.id, "event-1");
  assert.equal(event.ownerId, "poster-1");
  assert.equal(event.category, "Music");
  assert.equal(event.date, "2026-12-10");
  assert.equal(event.price, 5000);
  assert.equal(event.image, "https://cdn.eventis.rw/event.jpg");
  assert.equal(event.organizer, "Event organiser");
  assert.equal(event.instructions[0], "Bring an ID");
});

test("published events are loaded using the backend's paginated response envelope", async () => {
  const { listApiEvents } = loadEventApi();
  api.get = async (url) => {
    calls.push({ method: "GET", url });
    return url.includes("page=1")
      ? { items: [record()], page: 1, limit: 100, total: 101 }
      : { items: [record({ id: "event-2", event_id: "event-2" })], page: 2, limit: 100, total: 101 };
  };

  const events = await listApiEvents();
  assert.deepEqual(calls.map((call) => call.url), [
    "/api/v1/events?page=1&limit=100",
    "/api/v1/events?page=2&limit=100",
  ]);
  assert.equal(events.length, 2);
});

test("create uploads the cover and sends the backend's event field names", async () => {
  const { createApiEvent } = loadEventApi();
  const input = {
    image: "file:///event-cover.jpg",
    title: "Kigali Music Night",
    description: "Live music",
    category: "Music",
    location: "Kigali Arena",
    date: "2026-12-10",
    time: "18:30",
    capacity: 250,
    isPaid: true,
    price: 5000,
    websiteUrl: "https://tickets.eventis.rw",
  };

  await createApiEvent(input);
  const call = calls[0];
  assert.equal(call.method, "POST");
  assert.equal(call.url, "/api/v1/events");
  assert.equal(call.body.parts.get("start_date").value, "2026-12-10");
  assert.equal(call.body.parts.get("is_paid").value, "true");
  assert.equal(call.body.parts.get("price_minor").value, "5000");
  assert.equal(call.body.parts.get("booking_url").value, "https://tickets.eventis.rw");
  assert.equal(call.body.parts.get("status").value, "published");
  assert.equal(call.body.parts.get("cover_image").filename, "cover.jpg");
});

test("updates use PATCH and omit unsupported image/status fields when unchanged", async () => {
  const { updateApiEvent } = loadEventApi();
  const input = {
    image: "https://cdn.eventis.rw/event.jpg",
    title: "Updated Music Night",
    description: "New details",
    category: "Music",
    location: "Kigali Arena",
    date: "2026-12-11",
    time: "19:00",
    capacity: 300,
    isPaid: false,
    price: 0,
  };

  await updateApiEvent("event/1", input);
  const call = calls[0];
  assert.equal(call.method, "PATCH");
  assert.equal(call.url, "/api/v1/events/event%2F1");
  assert.equal(call.body.start_date, "2026-12-11");
  assert.equal(call.body.is_paid, false);
  assert.equal("status" in call.body, false);
  assert.equal("image" in call.body, false);
});

test("publisher create and update use backend event routes by default", async () => {
  const eventApi = loadEventApi();
  const publisherService = loadPublisherService(eventApi);
  const input = {
    image: "file:///event-cover.jpg",
    title: "Kigali Music Night",
    description: "Live music",
    category: "Music",
    location: "Kigali Arena",
    date: "2026-12-10",
    time: "18:30",
    capacity: 250,
    isPaid: false,
    price: 0,
  };

  const created = await publisherService.createPublisherEvent("poster-1", "Aline", input);
  assert.equal(calls[0].url, "/api/v1/events");
  assert.equal(created.ownerId, "poster-1");
  assert.equal(created.organizer, "Aline");

  const updated = await publisherService.updatePublisherEvent("poster-1", "event-1", {
    ...input,
    image: "https://cdn.eventis.rw/event.jpg",
    title: "Updated Music Night",
  });
  assert.equal(calls[1].method, "PATCH");
  assert.equal(calls[1].url, "/api/v1/events/event-1");
  assert.equal(updated.title, "Updated Music Night");
});

test("publisher detail reads only return events owned by the active user", async () => {
  const eventApi = loadEventApi();
  const publisherService = loadPublisherService(eventApi);
  api.get = async (url) => {
    calls.push({ method: "GET", url });
    return record();
  };

  const owned = await publisherService.fetchPublisherEvent("poster-1", "event-1");
  const notOwned = await publisherService.fetchPublisherEvent("poster-2", "event-1");
  assert.equal(owned.id, "event-1");
  assert.equal(notOwned, undefined);
  assert.equal(calls[0].url, "/api/v1/events/event-1");
});
