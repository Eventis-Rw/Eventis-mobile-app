import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CATEGORIES,
  type Event,
  type EventCategory,
} from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import type { fetchHomeEventPage } from "@/services/eventApi";
import { fetchEvents } from "@/utils/eventsService";

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
}

interface EventsContextValue {
  events: Event[];
  featuredEvents: Event[];
  activeCategory: EventCategory;
  setActiveCategory: (category: EventCategory) => void;
  filteredEvents: Event[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getEventById: (id: string) => Event | undefined;
  categories: string[];
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  ensureEvents: () => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [catalogue, setCatalogue] = useState<{ userId: string; items: Event[] } | null>(null);
  const categories = CATEGORIES;
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settledUserId, setSettledUserId] = useState<string | null>(null);
  const userId = user?.id;
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const refreshInFlight = useRef<string | null>(null);

  const refreshEvents = useCallback(async () => {
    if (!userId) {
      setCatalogue(null);
      setError(null);
      setSettledUserId(null);
      setIsLoading(false);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["home-events", userId], refetchType: "none" });
    if (refreshInFlight.current === userId) return;
    refreshInFlight.current = userId;
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchEvents();
      if (activeUserId.current === userId) setCatalogue({ userId, items: next });
    } catch (e) {
      if (activeUserId.current === userId) setError(e instanceof Error && e.message ? e.message : "Couldn't load events");
    } finally {
      if (refreshInFlight.current === userId) refreshInFlight.current = null;
      if (activeUserId.current === userId) {
        setSettledUserId(userId);
        setIsLoading(false);
      }
    }
  }, [userId, queryClient]);

  const ensureEvents = useCallback(() => {
    if (userId && settledUserId !== userId) void refreshEvents();
  }, [userId, settledUserId, refreshEvents]);
  useEffect(() => {
    if (!userId) void refreshEvents();
  }, [userId, refreshEvents]);
  const events = useMemo(() => catalogue && catalogue.userId === userId ? catalogue.items : [], [catalogue, userId]);

  const featuredEvents = useMemo(
    () => events.filter((e) => e.isFeatured),
    [events]
  );

  const filteredEvents = useMemo(() => {
    let results = events;
    if (activeCategory !== "All") {
      results = results.filter((e) => e.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return results;
  }, [events, activeCategory, searchQuery]);

  const getEventById = useCallback(
    (id: string) => events.find((e) => e.id === id),
    [events]
  );

  return (
    <EventsContext.Provider
      value={{
        events,
        featuredEvents,
        activeCategory,
        setActiveCategory,
        filteredEvents,
        searchQuery,
        setSearchQuery,
        getEventById,
        categories,
        isLoading: isLoading || Boolean(userId && settledUserId !== userId),
        error,
        refreshEvents,
        ensureEvents,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(loadCatalogue = true) {
  const ctx = useContext(EventsContext);
  const ensureEvents = ctx?.ensureEvents;
  useEffect(() => { if (loadCatalogue) ensureEvents?.(); }, [loadCatalogue, ensureEvents]);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}

/** Feed navigation can reuse the loaded card. Cold links fall back to the catalogue. */
export function useListedEvent(id: string | undefined) {
  const { user } = useAuth();
  const client = useQueryClient();
  const fromFeed = useMemo(() => {
    if (!user?.id || !id) return;
    const feeds = client.getQueriesData<InfiniteData<Awaited<ReturnType<typeof fetchHomeEventPage>>>>({
      queryKey: ["home-events", user.id],
      predicate: query => !query.state.isInvalidated && Date.now() - query.state.dataUpdatedAt < 30_000,
    });
    for (const [, data] of feeds) {
      for (const page of data?.pages ?? []) {
        const hit = page.items.find(item => item.id === id);
        if (hit) return hit;
      }
    }
  }, [id, user?.id, client]);
  const catalogue = useEvents(!!id && !fromFeed);
  return {
    event: fromFeed ?? (id ? catalogue.getEventById(id) : undefined),
    isLoading: !!id && !fromFeed && catalogue.isLoading,
  };
}
