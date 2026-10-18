import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ImageSourcePropType } from "react-native";
import type { StoryOverlay } from "@/components/StoryCanvas";

export type PublishedStory = {
  id: string;
  ownerId: string;
  organisationId?: string;
  mediaType?: "image" | "video" | "text";
  mediaUrl?: string;
  durationMs?: number;
  eventId?: string;
  eventTitle?: string;
  organizerName: string;
  organizerAvatar: string;
  storyImage?: ImageSourcePropType;
  background: string;
  fit: "cover" | "contain";
  overlays: StoryOverlay[];
  createdAt: number;
  expiresAt: number;
};
const key = (userId: string) => `@eventis_stories_v1:${userId}`;
const DAY = 24 * 60 * 60 * 1000;
export type StoryDraft = Omit<PublishedStory, "id" | "ownerId" | "createdAt" | "expiresAt">;
export type ViewedStories = Record<string, number>;
export type StoryCollection = { ownerId: string; organizerName: string; organizerAvatar: string; items: PublishedStory[]; hasUnwatched: boolean };
export const storyKey = (story: Pick<PublishedStory, "ownerId" | "id">) => `${story.ownerId}:${story.id}`;
const listeners = new Set<() => void>();
export function subscribeStories(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
let writes: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.then(work, work);
  writes = result.catch(() => {});
  return result;
}
export function isStoryAvailable(story: PublishedStory, now = Date.now()) {
  return Boolean(story.id && story.ownerId && Number.isFinite(story.createdAt) && story.createdAt <= now && Number.isFinite(story.expiresAt) && story.expiresAt > now &&
    (story.mediaType === "video" ? story.mediaUrl : story.storyImage || story.mediaUrl ||
      (Array.isArray(story.overlays) && story.overlays.some((layer) => typeof layer?.text === "string" && layer.text.trim()))));
}
export function groupStories(items: PublishedStory[], viewed: ViewedStories, ownId?: string, now = Date.now()): StoryCollection[] {
  const unique = new Map<string, PublishedStory>();
  for (const item of items) if (isStoryAvailable(item, now)) unique.set(storyKey(item), item);
  const groups = new Map<string, PublishedStory[]>();
  for (const item of unique.values()) groups.set(item.ownerId, [...(groups.get(item.ownerId) ?? []), item]);
  return Array.from(groups, ([ownerId, stories]) => {
    stories.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    const latest = stories[stories.length - 1];
    return { ownerId, organizerName: latest.organizerName, organizerAvatar: latest.organizerAvatar, items: stories,
      hasUnwatched: stories.some((story) => !viewed[storyKey(story)]) };
  }).sort((a, b) => Number(b.ownerId === ownId) - Number(a.ownerId === ownId) ||
    Number(b.hasUnwatched) - Number(a.hasUnwatched) || b.items[b.items.length - 1].createdAt - a.items[a.items.length - 1].createdAt || a.ownerId.localeCompare(b.ownerId));
}

/** Demo stories remain on this device and expire after 24 hours. */
export async function getLocalStories(userId: string): Promise<PublishedStory[]> {
  const value = await AsyncStorage.getItem(key(userId));
  if (!value) return [];
  let stories: PublishedStory[];
  try { stories = JSON.parse(value); } catch { return []; }
  if (!Array.isArray(stories)) return [];
  return stories.filter((story) => story && typeof story === "object").map((story) => ({ ...story, ownerId: userId }))
    .filter((story) => isStoryAvailable(story));
}

export async function publishLocalStories(userId: string, drafts: StoryDraft[]): Promise<PublishedStory[]> {
  if (!userId || !drafts.length) throw new Error("Add a photo, video or some text first.");
  return serialized(async () => {
    const now = Date.now();
    const added = drafts.map((draft, index): PublishedStory => ({ ...draft, ownerId: userId,
      id: `story_${now}_${String(index).padStart(4, "0")}_${Math.random().toString(36).slice(2, 10)}`, createdAt: now, expiresAt: now + DAY }));
    if (added.some((story) => !isStoryAvailable(story, now))) throw new Error("Add a photo, video or some text first.");
    const current = await getLocalStories(userId);
    await AsyncStorage.setItem(key(userId), JSON.stringify([...current, ...added]));
    listeners.forEach((listener) => listener());
    return added;
  });
}
export async function publishLocalStory(userId: string, draft: StoryDraft) {
  return (await publishLocalStories(userId, [draft]))[0];
}
export async function deleteLocalStory(userId: string, id: string) {
  return serialized(async () => {
    const current = await getLocalStories(userId);
    await AsyncStorage.setItem(key(userId), JSON.stringify(current.filter((story) => story.id !== id)));
    listeners.forEach((listener) => listener());
  });
}
export async function getStoryFeed(): Promise<PublishedStory[]> {
  const keys = await AsyncStorage.getAllKeys();
  const owners = keys.filter((value) => value.startsWith("@eventis_stories_v1:"));
  return (await Promise.all(owners.map((value) => getLocalStories(value.slice("@eventis_stories_v1:".length))))).flat();
}
const viewedKey = (viewerId: string) => `@eventis_story_views_v1:${viewerId}`;
export async function getViewedStories(viewerId: string): Promise<ViewedStories> {
  const raw = await AsyncStorage.getItem(viewedKey(viewerId));
  let data: ViewedStories;
  try { data = JSON.parse(raw ?? "{}"); } catch { return {}; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data).filter(([, expiresAt]) => typeof expiresAt === "number" && expiresAt > Date.now()));
}
export async function persistStoryView(viewerId: string, story: PublishedStory) {
  return serialized(async () => {
    const viewed = await getViewedStories(viewerId);
    viewed[storyKey(story)] = story.expiresAt;
    await AsyncStorage.setItem(viewedKey(viewerId), JSON.stringify(viewed));
  });
}
/** Give demo stories real, stable lifetimes instead of recreating them on every mount. */
export async function getDemoStoriesCreatedAt(): Promise<number> {
  return serialized(async () => {
    const stored = await AsyncStorage.getItem("@eventis_story_demo_epoch");
    if (stored && Number.isFinite(Number(stored))) return Number(stored);
    const now = Date.now();
    await AsyncStorage.setItem("@eventis_story_demo_epoch", String(now));
    return now;
  });
}
