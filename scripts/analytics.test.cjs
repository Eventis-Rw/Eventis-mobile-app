const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
let storage = new Map();
let failWrites = false;
function load(file, resolve = () => undefined) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const result = {};
  new Function("require", "exports", js)((name) => {
    if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { if (failWrites) throw Error("Storage unavailable"); storage.set(key, value); },
    } };
    const dependency = resolve(name); if (!dependency) throw Error(`Unexpected dependency ${name}`); return dependency;
  }, result);
  return result;
}
const service = load("services/analyticsService.ts");
const { summarizeLocalAnalytics } = load("utils/localAnalytics.ts");
const { createQualifiedViewTracker } = load("utils/qualifiedViews.ts");
const event = (viewerId = "customer", extra = {}) => ({ type: "feed_view", entityType: "event", entityId: "e1", ownerId: "host", viewerId, source: "home", ...extra });
beforeEach(() => { storage = new Map(); failWrites = false; });

test("qualified views reset for fast scrolls, backgrounding and overlays; re-renders don't add timers", () => {
  const timers = new Map(); const seen = []; let seq = 0;
  const tracker = createQualifiedViewTracker((item) => seen.push(item.id), (fn, ms) => { assert.equal(ms, 1000); timers.set(++seq, fn); return seq; }, (id) => timers.delete(id));
  const item = { id: "e1" };
  tracker.update([item], true); tracker.update([item], true); assert.equal(timers.size, 1);
  tracker.update([], true); assert.equal(timers.size, 0); assert.deepEqual(seen, []);
  tracker.update([item], true); tracker.update([item], false); assert.equal(timers.size, 0);
  tracker.update([item], true); const [id, fn] = [...timers][0]; timers.delete(id); fn();
  assert.deepEqual(seen, ["e1"]); tracker.update([item], true); assert.equal(timers.size, 0);
  tracker.dispose(); assert.equal(timers.size, 0);
});

test("views persist, deduplicate across surfaces/reloads, and separate viewers and view types", async () => {
  assert.equal(await service.recordAnalytics(event()), true);
  assert.equal(await service.recordAnalytics(event("customer", { source: "search" })), false);
  const reloaded = load("services/analyticsService.ts");
  assert.equal(await reloaded.recordAnalytics(event()), false);
  await service.recordAnalytics(event("other"));
  await service.recordAnalytics(event("customer", { type: "detail_view" }));
  const records = await service.getAnalyticsRecords(); assert.equal(records.length, 3);
  assert.equal(new Set(records.map((r) => r.id)).size, 3);
  const [first, ...rest] = records;
  storage.set(service.ANALYTICS_KEY, JSON.stringify([{ ...first, occurredAt: Date.now() - service.VIEW_WINDOW_MS - 1 }, ...rest]));
  assert.equal(await service.recordAnalytics(event()), true);
});

test("owner previews are excluded and anonymous identity is stable", async () => {
  assert.equal(await service.recordAnalytics(event("host")), false);
  await service.recordAnalytics({ ...event(), viewerId: undefined, entityId: "anonymous1" });
  await service.recordAnalytics({ ...event(), viewerId: undefined, entityId: "anonymous2" });
  const anonymous = (await service.getAnalyticsRecords()).filter((r) => r.entityId.startsWith("anonymous"));
  assert.equal(anonymous.length, 2); assert.equal(anonymous[0].viewerId, anonymous[1].viewerId);
  assert.ok(anonymous[0].viewerId.startsWith("guest_"));
});

test("concurrent actions retain every event; acknowledgement is scoped and preserves local totals", async () => {
  await Promise.all(Array.from({ length: 20 }, () => service.recordAnalytics(event("customer", { type: "share" }))));
  await service.recordAnalytics(event("other", { type: "share" }));
  const pending = await service.getPendingAnalytics("customer", 5); assert.equal(pending.length, 5);
  await service.acknowledgeAnalytics("other", pending.map((r) => r.id));
  assert.equal((await service.getPendingAnalytics("customer")).length, 20);
  await service.acknowledgeAnalytics("customer", pending.map((r) => r.id));
  assert.equal((await service.getPendingAnalytics("customer")).length, 15);
  assert.equal((await service.getAnalyticsRecords()).length, 21);
});

test("malformed and expired activity is discarded and failed writes don't create counts", async () => {
  await service.recordAnalytics(event());
  const [valid] = await service.getAnalyticsRecords();
  storage.set(service.ANALYTICS_KEY, JSON.stringify([null, {}, valid, valid, { ...valid, id: "old", occurredAt: Date.now() - 91 * 86400000 }, { ...valid, id: "future", occurredAt: Date.now() + 60000 }]));
  assert.equal((await service.getAnalyticsRecords()).length, 1);
  failWrites = true;
  await assert.rejects(service.recordAnalytics(event("other")), /Storage unavailable/);
  assert.equal((await service.getAnalyticsRecords()).length, 1);
});

test("analytics isolate owners, split source/periods, and calculate unique reach and engagement", () => {
  const now = new Date(2026, 9, 18, 12).getTime(); let seq = 0;
  const r = (type, viewer = "customer", extra = {}) => ({ ...event(viewer), id: String(++seq), schemaVersion: 1, sessionId: "session", occurredAt: now, type, ...extra });
  const records = [r("feed_view"), r("feed_view"), r("feed_view", "other", { source: "search" }), r("detail_view"),
    r("save"), r("share"), r("link_copy"), r("unsave"), r("website_click"), r("directions_click"),
    r("feed_view", "host"), r("feed_view", "outsider", { entityId: "not-owned" }), r("feed_view", "past", { occurredAt: now - 10 * 86400000 }),
    r("detail_view", "past", { occurredAt: now - 10 * 86400000 }), r("detail_view", "past2", { occurredAt: now - 10 * 86400000 })];
  const report = summarizeLocalAnalytics([...records, records[0]], [{ id: "e1", title: "Event" }], "host", 7, now);
  assert.equal(report.views, 1); assert.equal(report.impressions, 3); assert.equal(report.reach, 2); assert.equal(report.engagementRate, 0.5);
  assert.equal(report.previousViews, 2); assert.equal(report.change, -0.5);
  assert.equal(report.saves, 1); assert.equal(report.unsaves, 1); assert.equal(report.shares, 1); assert.equal(report.linkCopies, 1);
  assert.equal(report.websiteClicks, 1); assert.equal(report.directionsClicks, 1);
  assert.equal(report.sources.find((s) => s.source === "search").impressions, 1);
  assert.equal(report.sources.find((s) => s.source === "search").views, 0);
  assert.equal(report.daily.reduce((n, day) => n + day.views, 0), 1);
  assert.equal(report.topEvents.length, 1); assert.equal(report.topEvents[0].views, 1);
  assert.equal(report.topEvents[0].impressions, 3);
});

test("event rankings prefer qualified detail views over feed exposure and ignore seeded totals", () => {
  const now = Date.now();
  const records = Array.from({ length: 10 }, (_, index) => ({ ...event(), id: String(index), occurredAt: now }));
  records.push({ ...event(), id: "detail", entityId: "e2", type: "detail_view", occurredAt: now });
  const report = summarizeLocalAnalytics(records, [{ id: "e1", title: "Popular feed", viewCount: 9000 }, { id: "e2", title: "Opened event" }], "host", 7, now);
  assert.equal(report.topEvents[0].id, "e2");
  assert.equal(report.topEvents[1].views, 0);
  assert.equal(report.impressions, 10); assert.equal(report.views, 1);
});

test("native shares count only successful handoffs, include an event link, and tolerate unavailable haptics", async () => {
  let action = "shared"; let failure = false; let payload;
  const { shareEvent } = load("utils/shareEvent.ts", (name) => name === "react-native" ? { Share: {
    sharedAction: "shared", share: async (value) => { payload = value; if (failure) throw Error("Cancelled"); return { action }; },
  } } : name === "expo-haptics" ? { ImpactFeedbackStyle: { Light: "light" }, impactAsync: async () => { throw Error("Unavailable"); } } : undefined);
  const item = { id: "test-event", title: "Test event", date: "2026-10-20", location: "Venue", city: "Kigali" };
  assert.equal(await shareEvent(item), true);
  assert.match(payload.message, /https:\/\/eventis.app\/event\/test-event/);
  action = "dismissed"; assert.equal(await shareEvent(item), false);
  failure = true; assert.equal(await shareEvent(item), false);
});

test("story completion needs a recorded view and other owners/own previews never enter reports", () => {
  const now = Date.now(); let seq = 0;
  const r = (type, entityId, viewerId = "customer", ownerId = "host") => ({ id: String(++seq), schemaVersion: 1, sessionId: "s", entityType: "story", entityId, type, viewerId, ownerId, source: "stories", occurredAt: now });
  const report = summarizeLocalAnalytics([r("story_view", "one"), r("story_view", "two"), r("story_complete", "one"), r("story_complete", "never-viewed"),
    r("story_exit", "two"), r("story_event_click", "one"), r("story_view", "own", "host"), r("story_view", "foreign", "customer", "someone-else")], [], "host", 7, now);
  assert.equal(report.storyViews, 2); assert.equal(report.storyReach, 1); assert.equal(report.storyCompletion, 0.5);
  assert.equal(report.storyExits, 1); assert.equal(report.storyEventClicks, 1);
  assert.equal(report.storyRows.find((r) => r.id === "one").completion, 1);
});

test("empty analytics has no invented conversions, growth or completion rates", () => {
  const report = summarizeLocalAnalytics([], [], "host", 30);
  assert.equal(report.hasActivity, false); assert.equal(report.engagementRate, null); assert.equal(report.storyCompletion, null);
  assert.equal(report.change, null); assert.equal(report.comparisonAvailable, false); assert.equal(report.daily.length, 30);
});

test("deleting an account clears its own and attributed activity but preserves other accounts", async () => {
  await service.recordAnalytics(event());
  await service.recordAnalytics(event("other", { ownerId: "other-host", entityId: "e2" }));
  await service.recordAnalytics(event("host", { ownerId: "third-host", entityId: "e3" }));
  await service.deleteAccountAnalytics("host");
  const records = await service.getAnalyticsRecords();
  assert.equal(records.length, 1); assert.equal(records[0].entityId, "e2");
});
