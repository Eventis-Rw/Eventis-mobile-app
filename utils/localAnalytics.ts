import type { AnalyticsRecord, AnalyticsType } from "@/services/analyticsService";

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const uniquePeople = (records: AnalyticsRecord[]) => new Set(records.map((r) => r.viewerId)).size;
const count = (records: AnalyticsRecord[], type: AnalyticsType) => records.filter((r) => r.type === type).length;

/** Owner event IDs are authoritative; never expose unrelated accounts' device activity. */
export function summarizeLocalAnalytics(records: AnalyticsRecord[], events: { id: string; title: string }[], ownerId: string, days: 7 | 30, now = Date.now()) {
  const allowed = new Map(events.map((event) => [event.id, event.title]));
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - days + 1);
  const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - days);
  const relevant = [...new Map(records.map((r) => [r.id, r])).values()].filter((r) => r.viewerId !== ownerId && r.occurredAt <= now &&
    (r.entityType === "event" ? allowed.has(r.entityId) && (!r.ownerId || r.ownerId === ownerId) : r.ownerId === ownerId));
  const current = relevant.filter((r) => r.occurredAt >= start.getTime());
  const previous = relevant.filter((r) => r.occurredAt >= previousStart.getTime() && r.occurredAt < start.getTime());
  const eventActivity = current.filter((r) => r.entityType === "event");
  // Keep the persisted feed_view type compatible with older journals: it means an impression.
  const impressions = eventActivity.filter((r) => r.type === "feed_view");
  const views = eventActivity.filter((r) => r.type === "detail_view");
  const previousViews = previous.filter((r) => r.entityType === "event" && r.type === "detail_view").length;
  const reached = new Set(impressions.map((r) => r.viewerId));
  const engaged = new Set(eventActivity.filter((r) => ["save", "share", "link_copy"].includes(r.type) && reached.has(r.viewerId)).map((r) => r.viewerId));
  const stories = current.filter((r) => r.entityType === "story");
  const storyViews = stories.filter((r) => r.type === "story_view");
  const storyRows = [...new Set(stories.map((r) => r.entityId))].map((id) => {
    const items = stories.filter((r) => r.entityId === id);
    const viewedBy = new Set(items.filter((r) => r.type === "story_view").map((r) => r.viewerId));
    const completedBy = new Set(items.filter((r) => r.type === "story_complete" && viewedBy.has(r.viewerId)).map((r) => r.viewerId));
    return { id, views: count(items, "story_view"), reach: viewedBy.size, completion: viewedBy.size ? completedBy.size / viewedBy.size : null,
      exits: count(items, "story_exit"), eventClicks: count(items, "story_event_click") };
  });
  const completions = new Set(stories.filter((r) => r.type === "story_complete").map((r) => `${r.entityId}:${r.viewerId}`));
  const viewedPairs = new Set(storyViews.map((r) => `${r.entityId}:${r.viewerId}`));
  const daily = Array.from({ length: days }, (_, index) => {
    const day = new Date(start); day.setDate(day.getDate() + index);
    const key = dateKey(day);
    return { date: key, label: day.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      views: views.filter((r) => dateKey(new Date(r.occurredAt)) === key).length };
  });
  const topEvents = events.map((event) => {
    const items = eventActivity.filter((r) => r.entityId === event.id);
    return { ...event, views: count(items, "detail_view"), impressions: count(items, "feed_view"), reach: uniquePeople(items.filter((r) => r.type === "feed_view")),
      saves: count(items, "save"), shares: count(items, "share") };
  }).sort((a, b) => b.views - a.views || b.impressions - a.impressions || a.title.localeCompare(b.title));
  const sources = (["home", "category", "search", "stories", "direct"] as const).map((source) => ({ source,
    views: views.filter((r) => r.source === source).length,
    impressions: impressions.filter((r) => r.source === source).length }));
  const oldest = relevant.length ? Math.min(...relevant.map((r) => r.occurredAt)) : null;
  return {
    views: views.length, impressions: impressions.length, reach: reached.size,
    saves: count(eventActivity, "save"), unsaves: count(eventActivity, "unsave"), shares: count(eventActivity, "share"), linkCopies: count(eventActivity, "link_copy"),
    engagementRate: reached.size ? engaged.size / reached.size : null,
    websiteClicks: count(eventActivity, "website_click"), directionsClicks: count(eventActivity, "directions_click"),
    storyViews: storyViews.length, storyReach: uniquePeople(storyViews),
    storyCompletion: viewedPairs.size ? [...viewedPairs].filter((key) => completions.has(key)).length / viewedPairs.size : null,
    storyExits: count(stories, "story_exit"), storyEventClicks: count(stories, "story_event_click"), storyRows,
    previousViews, change: previousViews ? (views.length - previousViews) / previousViews : null,
    comparisonAvailable: oldest !== null && oldest < start.getTime(),
    daily, topEvents, sources, hasActivity: current.length > 0, start: start.getTime(),
  };
}
