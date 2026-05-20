import React, { createContext, useContext, useMemo, useState } from "react";

import {
  CATEGORIES,
  MOCK_EVENTS,
  type Event,
  type EventCategory,
} from "@/constants/mockData";

interface EventsContextValue {
  events: Event[];
  featuredEvents: Event[];
  activeCategory: EventCategory;
  setActiveCategory: (category: EventCategory) => void;
  filteredEvents: Event[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getEventById: (id: string) => Event | undefined;
  categories: EventCategory[];
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredEvents = useMemo(
    () => MOCK_EVENTS.filter((e) => e.isFeatured),
    []
  );

  const filteredEvents = useMemo(() => {
    let results = MOCK_EVENTS;
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
  }, [activeCategory, searchQuery]);

  const getEventById = (id: string) => MOCK_EVENTS.find((e) => e.id === id);

  return (
    <EventsContext.Provider
      value={{
        events: MOCK_EVENTS,
        featuredEvents,
        activeCategory,
        setActiveCategory,
        filteredEvents,
        searchQuery,
        setSearchQuery,
        getEventById,
        categories: CATEGORIES,
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
