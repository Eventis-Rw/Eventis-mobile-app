const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file, api) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", "process", compiled)(
    (name) => {
      if (name === "@/utils/apiClient") return { api, ApiError: Error };
      if (name === "@react-native-async-storage/async-storage")
        return { default: {} };
      if (name === "@/utils/formDataFile")
        return { appendLocalFile: async () => {} };
      throw Error(`Unexpected dependency ${name}`);
    },
    exports,
    {
      env: {
        NODE_ENV: "test",
        EXPO_PUBLIC_USE_PROFILE_API: "true",
        EXPO_PUBLIC_USE_ORGANISER_API: "true",
      },
    },
  );
  return exports;
}
const categories = [
  { id: "music-id", slug: "music", name: "Music" },
  { id: "arts-id", slug: "arts", name: "Arts & Culture" },
];

test("discovery preferences round-trip API category IDs, labels and location", async () => {
  let saved = { preferredLocation: "Kigali", categoryIds: ["arts-id"] };
  const service = load("services/profileService.ts", {
    get: async (url) => {
      if (url === "/api/v1/events/categories") return { items: categories };
      assert.equal(url, "/api/v1/me/preferences");
      return saved;
    },
    patch: async (url, body) => {
      assert.equal(url, "/api/v1/me/preferences");
      saved = body;
      return body;
    },
  });
  assert.deepEqual(await service.fetchDiscoveryPreferences("u1"), {
    categories: ["Art"],
    location: "Kigali",
  });
  assert.deepEqual(
    await service.updateDiscoveryPreferences("u1", {
      categories: ["Music", "Music", "All"],
      location: "  Huye  ",
    }),
    { categories: ["Music"], location: "Huye" },
  );
  assert.deepEqual(saved, {
    preferredLocation: "Huye",
    categoryIds: ["music-id"],
  });
  await service.updateDiscoveryPreferences("u1", { categories: [] });
  assert.equal(saved.preferredLocation, null);
  await assert.rejects(
    service.updateDiscoveryPreferences("u1", {
      categories: ["Removed category"],
    }),
    /no longer available/,
  );
});

test("a publisher with no API profile receives editable defaults and can save categories", async () => {
  let saved = null;
  const service = load("services/profileService.ts", {
    get: async (url) =>
      url === "/api/v1/events/categories"
        ? { items: categories }
        : (assert.equal(url, "/api/v1/me/publisher-profile"), saved),
    patch: async (url, body) => {
      assert.equal(url, "/api/v1/me/publisher-profile");
      saved = body;
      return body;
    },
  });
  assert.deepEqual(await service.fetchPublisherProfile("u1"), {
    categories: [],
    socialLinks: {},
  });
  const result = await service.updatePublisherProfile("u1", {
    categories: ["Art"],
    contactEmail: "demo@example.test",
    socialLinks: {},
  });
  assert.equal(result.contactEmail, "demo@example.test");
  assert.deepEqual(result.categories, ["Art"]);
  assert.deepEqual(saved.categoryIds, ["arts-id"]);
  assert.equal("categories" in saved, false);
  await service.updatePublisherProfile("u1", { contactEmail: undefined, taxId: undefined });
  assert.equal(
    saved.contactEmail,
    null,
    "clearing a contact field must remove the server value",
  );
  assert.equal("taxId" in saved, false, "an unchanged private TIN must be preserved");
});

test("organisation create/update accept the API's direct response and recover the server selection", async () => {
  const record = {
    id: "org-1",
    name: "Demo Collective",
    description: "Music and community events",
    activities: "Music",
    location: "Kigali",
    verificationStatus: "VERIFIED",
  };
  const service = load("services/organiserService.ts", {
    post: async (url) => (assert.equal(url, "/api/v1/organisations"), record),
    patch: async (url) => (
      assert.equal(url, "/api/v1/organisations/org-1"),
      { ...record, name: "Updated" }
    ),
    get: async (url) => (
      assert.equal(url, "/api/v1/me/organisations"),
      { items: [record], activeOrganisationId: record.id }
    ),
  });
  const org = await service.createOrganisation(record);
  assert.equal(org.id, "org-1");
  assert.equal(org.verificationStatus, "verified");
  assert.equal((await service.updateOrganisation(org, record)).name, "Updated");
  const restored = await service.fetchMyOrganisations();
  assert.equal(restored.activeOrganisationId, org.id);
  assert.equal(restored.organisations[0].id, org.id);
});

test("expired organiser subscriptions do not reopen setup", () => {
  const service = load("services/organiserService.ts", {});
  const now = Date.parse("2026-11-22T10:00:00Z");
  const row = {
    id: "sub",
    planId: "plan",
    status: "ACTIVE",
    startsAt: "2026-10-01T00:00:00Z",
    expiresAt: "2026-11-01T00:00:00Z",
    postsRemaining: null,
  };
  assert.equal(service.activeOrganiserSubscription([row], now), undefined);
  assert.equal(
    service.activeOrganiserSubscription(
      [{ ...row, expiresAt: "2026-12-01T00:00:00Z" }],
      now,
    ).status,
    "active",
  );
});

test("an organisation's selected logo survives saving, reloading and removal", async () => {
  const publicUrl = "https://media.example.test/bucket/logo.jpg";
  let row = { id: "org", name: "Eventis" };
  let uploads = 0;
  const service = load("services/organiserService.ts", {
    postForm: async (url, form) => {
      assert.equal(url, "/api/v1/uploads");
      assert.equal(form.get("purpose"), "ORG_LOGO");
      uploads++;
      return { key: "bucket/logo.jpg", url: publicUrl };
    },
    post: async (_, body) => (row = { ...row, ...body }),
    patch: async (_, body) => (row = { ...row, ...body }),
    get: async () => ({ items: [row], activeOrganisationId: row.id }),
  });
  const created = await service.createOrganisation({ name: "Eventis", logoUri: "file:///crop.jpg" });
  assert.equal(created.logoUrl, publicUrl);
  await service.updateOrganisation(created, { name: "New name", logoUri: publicUrl });
  const [restored] = (await service.fetchMyOrganisations()).organisations;
  assert.equal(restored.logoUrl, publicUrl);
  assert.equal(uploads, 1);
  const cleared = await service.updateOrganisation(restored, { name: "New name", logoUri: undefined });
  assert.equal(cleared.logoUrl, undefined);
});
