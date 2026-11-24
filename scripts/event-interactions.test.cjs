const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

test("comment service uses paginated listing and the author edit endpoint", async () => {
  const calls = [];
  const api = {
    get: async (url) => { calls.push({ method: "GET", url }); },
    patch: async (url, body) => { calls.push({ method: "PATCH", url, body }); },
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "services", "eventInteractionService.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exportsObject = {};
  new Function("require", "exports", compiled)((name) => {
    if (name === "@/utils/apiClient") return { api };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exportsObject);

  await exportsObject.listEventComments("event/1", 2);
  await exportsObject.updateEventComment("comment/1", "Updated");
  assert.deepEqual(calls, [
    { method: "GET", url: "/api/v1/events/event%2F1/comments?page=2&limit=100" },
    { method: "PATCH", url: "/api/v1/comments/comment%2F1", body: { body: "Updated" } },
  ]);
});
