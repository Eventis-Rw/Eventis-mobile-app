import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CATEGORIES,
  type Event,
  type EventCategory,
} from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
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
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const categories = CATEGORIES;
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setEvents(await fetchEvents());
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't load events");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

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
        isLoading,
        error,
        refreshEvents,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}
