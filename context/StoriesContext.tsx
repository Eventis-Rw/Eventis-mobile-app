import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { StoryViewer } from "@/components/StoryViewer";
import { makeDemoStories } from "@/constants/demoStories";
import { buildStorySession } from "@/utils/storyPlayback";
import { resolveStoryMedia } from "@/services/storyMedia";
import { deleteLocalStory, getDemoStoriesCreatedAt, getStoryFeed, getViewedStories, groupStories, persistStoryView, storyKey, subscribeStories,
  type PublishedStory, type StoryCollection, type ViewedStories } from "@/services/storyService";

type Session = NonNullable<ReturnType<typeof buildStorySession>>;
type StoriesState = {
  collections: StoryCollection[]; loading: boolean; error: string | null;
  openStories: (ownerId: string, ownOnly?: boolean) => void;
  refresh: () => Promise<void>;
};
const StoriesContext = createContext<StoriesState | null>(null);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? "guest";
  // Keyed scope also clears any active session when switching accounts.
  return <StoriesScope key={viewerId} viewerId={viewerId} ownId={user?.id}>{children}</StoriesScope>;
}

function StoriesScope({ children, viewerId, ownId }: { children: React.ReactNode; viewerId: string; ownId?: string }) {
  const [items, setItems] = useState<PublishedStory[]>([]);
  const [viewed, setViewed] = useState<ViewedStories>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [session, setSession] = useState<Session | null>(null);
  const optimistic = useRef<ViewedStories>({});
  const pending = useRef(new Map<string, PublishedStory>());
  const request = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      for (const [id, story] of pending.current) {
        await persistStoryView(viewerId, story);
        pending.current.delete(id);
      }
      const [local, savedViews, epoch] = await Promise.all([getStoryFeed(), getViewedStories(viewerId), getDemoStoriesCreatedAt()]);
      const resolved = await resolveStoryMedia(local);
      if (!mounted.current || version !== request.current) return;
      setItems([...resolved, ...makeDemoStories(epoch)]);
      setViewed({ ...savedViews, ...optimistic.current });
      setNow(Date.now());
      setError(null);
    } catch {
      if (mounted.current && version === request.current) setError("Stories couldn't sync. Tap to retry.");
    } finally {
      if (mounted.current && version === request.current) setLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const unsubscribe = subscribeStories(() => { void refresh(); });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const onFocus = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("@eventis_stories_") || event.key?.startsWith("@eventis_story_views_")) void refresh();
    };
    const canUseBrowserEvents =
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function";
    if (canUseBrowserEvents) {
      window.addEventListener("focus", onFocus);
      window.addEventListener("storage", onStorage);
    }
    return () => {
      mounted.current = false;
      request.current++;
      unsubscribe();
      subscription.remove();
      if (canUseBrowserEvents) {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("storage", onStorage);
      }
    };
  }, [refresh]);

  useEffect(() => {
    const nextExpiry = Math.min(...items.filter((item) => item.expiresAt > now).map((item) => item.expiresAt));
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = setTimeout(() => setNow(Date.now()), Math.max(0, nextExpiry - Date.now()) + 10);
    return () => clearTimeout(timeout);
  }, [items, now]);

  const collections = useMemo(() => groupStories(items, viewed, ownId, now), [items, viewed, ownId, now]);
  const markViewed = useCallback((story: PublishedStory) => {
    const id = storyKey(story);
    if (optimistic.current[id]) return;
    optimistic.current[id] = story.expiresAt;
    pending.current.set(id, story);
    setViewed((previous) => ({ ...previous, [id]: story.expiresAt }));
    void persistStoryView(viewerId, story).then(() => pending.current.delete(id)).catch(() => {
      if (mounted.current) setError("Watched status couldn't sync. Tap to retry.");
    });
  }, [viewerId]);
  const openStories = useCallback((ownerId: string, ownOnly = false) => {
    setNow(Date.now());
    setSession(buildStorySession(groupStories(items, viewed, ownId), ownerId, viewed, ownOnly));
  }, [items, viewed, ownId]);
  const close = useCallback(() => setSession(null), []);
  const remove = useCallback(async (story: PublishedStory) => {
    if (story.ownerId !== ownId) return;
    await deleteLocalStory(ownId, story.id);
    setItems((previous) => previous.filter((item) => storyKey(item) !== storyKey(story)));
  }, [ownId]);
  const value = useMemo(() => ({ collections, loading, error, refresh, openStories }), [collections, loading, error, refresh, openStories]);
  return (
    <StoriesContext.Provider value={value}>
      {children}
      {session ? <StoryViewer session={session} collections={collections} ownId={ownId}
        onViewed={markViewed} onClose={close} onDelete={remove} /> : null}
    </StoriesContext.Provider>
  );
}
export function useStories() {
  const value = useContext(StoriesContext);
  if (!value) throw new Error("useStories must be used within StoriesProvider");
  return value;
}

