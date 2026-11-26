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
const RECORD_PREFIX = ANALYTICS_KEY + ":record:";
const BATCH_SIZE = 200;
let cached: AnalyticsRecord[] | undefined;
const keyFor = (record: AnalyticsRecord) => RECORD_PREFIX + record.id;

function parse(raw: string | null) {
  try { return JSON.parse(raw ?? "null") as unknown; } catch { return null; }
}

async function removeKeys(keys: string[]) {
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    await AsyncStorage.multiRemove(keys.slice(i, i + BATCH_SIZE));
  }
}

async function writeRecords(records: AnalyticsRecord[]) {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    await AsyncStorage.multiSet(records.slice(i, i + BATCH_SIZE).map(r => [keyFor(r), JSON.stringify(r)]));
  }
}

async function loadRecords() {
  const legacy = await AsyncStorage.getItem(ANALYTICS_KEY);
  const old = parse(legacy);
  const records = new Map<string, AnalyticsRecord>();
  if (Array.isArray(old)) {
    for (const record of old) if (isAnalyticsRecord(record)) records.set(record.id, record);
  }
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(RECORD_PREFIX));
  const stored = new Set<string>();
  const obsolete: string[] = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    for (const [key, raw] of await AsyncStorage.multiGet(keys.slice(i, i + BATCH_SIZE))) {
      const record = parse(raw);
      if (isAnalyticsRecord(record) && keyFor(record) === key) {
        records.set(record.id, record);
        stored.add(record.id);
      } else {
        obsolete.push(key);
      }
    }
  }
  const sorted = [...records.values()].sort((a, b) => a.occurredAt - b.occurredAt);
  const retained = sorted.slice(-MAX_RECORDS);
  // Copy first. An interrupted migration can resume by immutable ID.
  if (legacy !== null) {
    await writeRecords(retained.filter(record => !stored.has(record.id)));
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  }
  await removeKeys([...obsolete.filter(key => !records.has(key.slice(RECORD_PREFIX.length))),
    ...sorted.slice(0, Math.max(0, sorted.length - MAX_RECORDS)).map(keyFor)]);
  return retained;
}

async function read(): Promise<AnalyticsRecord[]> {
  cached ??= await loadRecords();
  const cutoff = Date.now() - RETENTION_MS;
  let expired = 0;
  while (expired < cached.length && cached[expired].occurredAt <= cutoff) expired++;
  if (expired) {
    await removeKeys(cached.slice(0, expired).map(keyFor));
    cached = cached.slice(expired);
  }
  return cached;
}

export function getAnalyticsRecords(reload = false) {
  return serialized(async () => {
    if (reload) cached = undefined;
    return read();
  });
}
export function subscribeAnalytics(listener: (records: AnalyticsRecord[]) => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
function publish(records: AnalyticsRecord[]) {
  cached = records;
  listeners.forEach(listener => listener(records));
}
/** Saves a local activity record. Owner previews are excluded. */
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
    await AsyncStorage.setItem(keyFor(record), JSON.stringify(record));
    const overflow = records.length >= MAX_RECORDS;
    const next = overflow ? [...records.slice(1), record] : [...records, record];
    publish(next);
    if (overflow) {
      try { await AsyncStorage.removeItem(keyFor(records[0])); }
      catch {
        // The append is durable. On the next read, loadRecords retries the eviction.
        cached = undefined;
      }
    }
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
    const records = await read();
    const changed = records.filter(r => r.viewerId === viewerId && accepted.has(r.id) && !r.syncedAt);
    if (!changed.length) return;
    const updated = changed.map(r => ({ ...r, syncedAt: now }));
    try { await writeRecords(updated); } catch (error) { cached = undefined; throw error; }
    const byId = new Map(updated.map(r => [r.id, r]));
    publish(records.map(r => byId.get(r.id) ?? r));
  });
}

/** Account deletion removes its viewer identity and activity owned by that account. */
export function deleteAccountAnalytics(userId: string) {
  return serialized(async () => {
    const records = await read();
    const remove = records.filter(r => r.viewerId === userId || r.ownerId === userId);
    try { await removeKeys(remove.map(keyFor)); } catch (error) { cached = undefined; throw error; }
    publish(records.filter(r => r.viewerId !== userId && r.ownerId !== userId));
  });
}
