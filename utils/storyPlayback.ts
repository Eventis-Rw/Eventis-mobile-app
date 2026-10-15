import { storyKey, type StoryCollection, type ViewedStories } from "@/services/storyService";

/** Testing resets apply only to saved state, never views accumulated this session. */
export function hydrateStoryViews(saved: ViewedStories, session: ViewedStories, ownId: string | undefined, resetOthers: boolean): ViewedStories {
  const retained = resetOthers
    ? Object.fromEntries(Object.entries(saved).filter(([key]) => ownId && key.startsWith(`${ownId}:`)))
    : saved;
  return { ...retained, ...session };
}

/** Freeze playback order at opening; ring updates must never reorder an active session. */
export function buildStorySession(collections: StoryCollection[], ownerId: string, viewed: ViewedStories, ownOnly = false) {
  const selectedIndex = collections.findIndex((group) => group.ownerId === ownerId);
  const selected = collections[selectedIndex];
  if (!selected?.items.length) return null;
  const previous = ownOnly ? [] : collections.slice(0, selectedIndex);
  const following = ownOnly ? [] : collections.slice(selectedIndex + 1).filter((group) => group.hasUnwatched);
  const groups = [...previous, selected, ...following];
  const ids = groups.flatMap((group, index) => {
    const firstUnwatched = group.items.findIndex((story) => !viewed[storyKey(story)]);
    return (index <= previous.length ? group.items : group.items.slice(Math.max(0, firstUnwatched))).map(storyKey);
  });
  const first = selected.items.findIndex((story) => !viewed[storyKey(story)]);
  return { ids, index: previous.reduce((count, group) => count + group.items.length, 0) + Math.max(0, first) };
}

/** Skip removed/expired items while preserving the session's original positions. */
export function resolveStoryIndex(ids: string[], available: Set<string>, start: number, direction: 1 | -1 = 1) {
  for (let index = start; index >= 0 && index < ids.length; index += direction) {
    if (available.has(ids[index])) return index;
  }
  return -1;
}

