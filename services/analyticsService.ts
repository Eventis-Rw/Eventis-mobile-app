import AsyncStorage from "@react-native-async-storage/async-storage";

export type AnalyticsType = "feed_view" | "detail_view" | "save" | "unsave" | "share" | "link_copy" | "website_click" | "directions_click" | "story_view" | "story_complete" | "story_exit" | "story_event_click";
export type AnalyticsSource = "home" | "category" | "search" | "details" | "stories" | "direct";
export type AnalyticsInput = {
  type: AnalyticsType; entityType: "event" | "story"; entityId: string;
  ownerId?: string; organisationId?: string; viewerId?: string; source: AnalyticsSource;
};
export type AnalyticsRecord = Omit<AnalyticsInput, "viewerId"> & {
  id: string; schemaVersion: 1; viewerId: string; sessionId: string; occurredAt: number; syncedAt?: number;
};
export const ANALYTICS_KEY = "@eventis_analytics_v1";
export const VIEW_WINDOW_MS = 30 * 60 * 1000;
const RETENTION_MS = 90 * 86400000;
const MAX_RECORDS = 10000;
const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const listeners = new Set<(records: AnalyticsRecord[]) => void>();
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.catch(() => undefined);
  return result;
}
const TYPES = new Set<AnalyticsType>(["feed_view", "detail_view", "save", "unsave", "share", "link_copy", "website_click", "directions_click", "story_view", "story_complete", "story_exit", "story_event_click"]);
const SOURCES = new Set<AnalyticsSource>(["home", "category", "search", "details", "stories", "direct"]);
export function isAnalyticsRecord(value: unknown, now = Date.now()): value is AnalyticsRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as AnalyticsRecord;
  return r.schemaVersion === 1 && typeof r.id === "string" && !!r.id && typeof r.viewerId === "string" && !!r.viewerId &&
    typeof r.entityId === "string" && !!r.entityId && typeof r.sessionId === "string" && !!r.sessionId &&
    TYPES.has(r.type) && SOURCES.has(r.source) && (r.entityType === "story" || r.entityType === "event") &&
    Number.isFinite(r.occurredAt) && r.occurredAt <= now && r.occurredAt > now - RETENTION_MS;
}
async function read(): Promise<AnalyticsRecord[]> {
  const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
  let parsed: unknown;
  try { parsed = JSON.parse(raw ?? "[]"); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return [...new Map(parsed.filter((r) => isAnalyticsRecord(r)).map((r) => [r.id, r])).values()].slice(-MAX_RECORDS);
}
export function getAnalyticsRecords() { return serialized(read); }
export function subscribeAnalytics(listener: (records: AnalyticsRecord[]) => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
async function save(records: AnalyticsRecord[]) {
  await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(records));
  listeners.forEach((listener) => listener(records));
}
/** Local collection only. No unimplemented endpoint is called. Owner previews are excluded. */
export function recordAnalytics(input: AnalyticsInput): Promise<boolean> {
  return serialized(async () => {
    if (!input.entityId || (input.ownerId && input.ownerId === input.viewerId)) return false;
    const now = Date.now();
    let viewerId = input.viewerId;
    if (!viewerId) {
      viewerId = await AsyncStorage.getItem("@eventis_analytics_guest_v1") ?? undefined;
      if (!viewerId) {
        viewerId = `guest_${now}_${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem("@eventis_analytics_guest_v1", viewerId);
      }
    }
    const records = await read();
    const deduplicated = ["feed_view", "detail_view", "story_view", "story_complete"].includes(input.type);
    if (deduplicated && records.some((r) => r.type === input.type && r.entityType === input.entityType && r.entityId === input.entityId &&
      r.viewerId === viewerId && now - r.occurredAt < VIEW_WINDOW_MS)) return false;
    const record: AnalyticsRecord = { ...input, viewerId, id: `activity_${now}_${Math.random().toString(36).slice(2)}`,
      schemaVersion: 1, sessionId, occurredAt: now };
    if (!isAnalyticsRecord(record, now)) return false;
    await save([...records, record].slice(-MAX_RECORDS));
    return true;
  });
}
/** Future transport integration: send these immutable IDs, acknowledge only server-accepted IDs. */
export async function getPendingAnalytics(viewerId: string, limit = 100) {
  return (await getAnalyticsRecords()).filter((r) => r.viewerId === viewerId && !r.syncedAt).slice(0, Math.max(0, limit));
}
export function acknowledgeAnalytics(viewerId: string, ids: string[]) {
  return serialized(async () => {
    const accepted = new Set(ids);
    const now = Date.now();
    await save((await read()).map((r) => r.viewerId === viewerId && accepted.has(r.id) ? { ...r, syncedAt: now } : r));
  });
}

/** Account deletion removes its viewer identity and activity owned by that account. */
export function deleteAccountAnalytics(userId: string) {
  return serialized(async () => save((await read()).filter((r) => r.viewerId !== userId && r.ownerId !== userId)));
}
