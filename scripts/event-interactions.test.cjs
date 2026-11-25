const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadService(api) {
  const source = fs.readFileSync(path.join(__dirname, "..", "services", "eventInteractionService.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exportsObject = {};
  new Function("require", "exports", compiled)((name) => {
    if (name === "@/utils/apiClient") return { api };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exportsObject);

  return exportsObject;
}

test("comment service uses paginated listing and the author edit endpoint", async () => {
  const calls = [];
  const api = {
    get: async (url) => { calls.push({ method: "GET", url }); },
    patch: async (url, body) => { calls.push({ method: "PATCH", url, body }); },
  };
  const exportsObject = loadService(api);

  await exportsObject.listEventComments("event/1", 2);
  await exportsObject.updateEventComment("comment/1", "Updated");
  assert.deepEqual(calls, [
    { method: "GET", url: "/api/v1/events/event%2F1/comments?page=2&limit=100" },
    { method: "PATCH", url: "/api/v1/comments/comment%2F1", body: { body: "Updated" } },
  ]);
});

test("host comments follow the event identity and other commenters keep their personal photos", () => {
  const { commentAuthor } = loadService({});
  const event = { ownerId: "host", organizer: "Kigali Universe", organizerAvatarUrl: "org.jpg" };
  const comment = { userId: "member", user: { username: "Prince", avatarUrl: "personal.jpg" } };
  assert.deepEqual(commentAuthor({ ...comment, userId: "host" }, event), { name: "Kigali Universe", photo: "org.jpg" });
  assert.deepEqual(commentAuthor(comment, event), { name: "Prince", photo: "personal.jpg" });
  assert.equal(commentAuthor(comment, event, { id: "member", avatarUrl: "new.jpg" }).photo, "new.jpg");
  assert.equal(commentAuthor(comment, event, { id: "member" }).photo, undefined);
});
