import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { StoryViewer } from "@/components/StoryViewer";
import { buildStorySession } from "@/utils/storyPlayback";
import { deleteStatus, fetchStatusStories, recordStatusView } from "@/services/statusService";
import { deleteLocalStory, getStoryFeed, getViewedStories, groupStories, persistStoryView, storyKey, subscribeStories,
  type PublishedStory, type StoryCollection, type ViewedStories } from "@/services/storyService";
import { ApiError, getToken } from "@/utils/apiClient";

type Session = NonNullable<ReturnType<typeof buildStorySession>>;
type StoriesState = {
  collections: StoryCollection[]; loading: boolean; error: string | null; viewerOpen: boolean;
  openStories: (collectionId: string, ownOnly?: boolean) => void;
  addPublishedStory: (story: PublishedStory) => void;
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
  const recentPublications = useRef(new Map<string, PublishedStory>());
  const addPublishedStory = useCallback((story: PublishedStory) => {
    recentPublications.current.set(story.id, story);
    setItems(current => [...current.filter(item => item.id !== story.id), story]);
    setNow(Date.now());
  }, []);
  const request = useRef(0);
  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const fetchStories = useCallback(async () => {
    const version = ++request.current;
    try {
      for (const [id, story] of pending.current) {
        await persistStoryView(viewerId, story);
        pending.current.delete(id);
      }
      const [savedViews, token] = await Promise.all([getViewedStories(viewerId), getToken()]);
      const useStatusApi = token !== null && !token.startsWith("demo_token_");
      let remote: PublishedStory[] = [];
      if (useStatusApi) {
        try {
          remote = await fetchStatusStories();
        } catch {
          // If remote fetch fails, we continue with local stories
        }
      }
      const local = await getStoryFeed();
      if (!mounted.current || version !== request.current) return;
      const synced = new Map<string, PublishedStory>();
      for (const item of [...remote, ...local]) {
        synced.set(item.id, item);
      }
      for (const [id, item] of recentPublications.current) {
        const serverStory = synced.get(id);
        if (item.expiresAt <= Date.now() || (serverStory && (!item.organisationId || serverStory.organisationId))) {
          recentPublications.current.delete(id);
        } else {
          synced.set(id, item);
        }
      }
      setItems([...synced.values()]);
      setViewed({ ...savedViews, ...optimistic.current });
      setNow(Date.now());
      setError(null);
    } catch {
      if (mounted.current && version === request.current) setError("Stories couldn't sync. Tap to retry.");
    } finally {
      if (mounted.current && version === request.current) setLoading(false);
    }
  }, [viewerId]);
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const operation = fetchStories().finally(() => {
      if (inFlight.current === operation) inFlight.current = null;
    });
    inFlight.current = operation;
    return operation;
  }, [fetchStories]);

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
      inFlight.current = null;
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
    if (story.source === "api") void recordStatusView(story.id).catch(() => {});
  }, [viewerId]);
  const openStories = useCallback((collectionId: string, ownOnly = false) => {
    setNow(Date.now());
    setSession(buildStorySession(groupStories(items, viewed, ownId), collectionId, viewed, ownOnly));
  }, [items, viewed, ownId]);
  const close = useCallback(() => setSession(null), []);
  const remove = useCallback(async (story: PublishedStory) => {
    if (story.ownerId !== ownId) throw new Error("You can only delete your own stories.");
    if (story.source === "api") {
      try {
        await deleteStatus(story.id);
      } catch (error) {
        // Already gone (e.g. an earlier attempt succeeded): just drop it from the list.
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    } else {
      await deleteLocalStory(story.ownerId, story.id);
    }
    if (inFlight.current) {
      request.current++;
      inFlight.current = null;
      void refresh();
    }
    recentPublications.current.delete(story.id);
    setItems((previous) => previous.filter((item) => storyKey(item) !== storyKey(story)));
  }, [ownId, refresh]);
  const viewerOpen = session !== null;
  const value = useMemo(() => ({ collections, loading, error, refresh, addPublishedStory, openStories, viewerOpen }), [collections, loading, error, refresh, addPublishedStory, openStories, viewerOpen]);
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

