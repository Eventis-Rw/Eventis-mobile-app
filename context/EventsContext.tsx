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
  MOCK_EVENTS,
  type Event,
  type EventCategory,
} from "@/constants/mockData";
import { api } from "@/utils/apiClient";

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
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ApiCategory[]>("/api/v1/categories");
      if (data.length) {
        setCategories(["All", ...data.map((category) => category.name)]);
      }
    } catch {
      setCategories(CATEGORIES);
    } finally {
      setEvents(MOCK_EVENTS);
      setIsLoading(false);
    }
  }, []);

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
