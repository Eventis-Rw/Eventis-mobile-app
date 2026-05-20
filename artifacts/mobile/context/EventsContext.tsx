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
  isLoading: boolean;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

function normaliseEvent(raw: Record<string, unknown>): Event {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    category: String(raw.category ?? "") as EventCategory,
    description: String(raw.description ?? ""),
    location: String(raw.location ?? ""),
    city: String(raw.city ?? ""),
    date: String(raw.date ?? ""),
    time: String(raw.time ?? ""),
    endTime: String(raw.endTime ?? (raw.end_time ?? "")),
    price: Number(raw.price ?? 0),
    currency: String(raw.currency ?? "GBP"),
    organizer: String(raw.organizer ?? ""),
    organizerWebsite: raw.organizerWebsite
      ? String(raw.organizerWebsite)
      : (raw.organizer_website ? String(raw.organizer_website) : undefined),
    attendees: Number(raw.attendees ?? 0),
    capacity: Number(raw.capacity ?? 0),
    image: String(raw.image ?? "concert"),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    isFeatured: Boolean(raw.isFeatured ?? raw.is_featured),
    isSponsored: Boolean(raw.isSponsored ?? raw.is_sponsored),
    isPaid: Boolean(raw.isPaid ?? raw.is_paid),
    distance: Number(raw.distance ?? 0),
    rating: Number(raw.rating ?? 0),
    reviewCount: Number(raw.reviewCount ?? raw.review_count ?? 0),
  };
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ events: Record<string, unknown>[] }>("/events");
      if (data.events?.length) {
        setEvents(data.events.map(normaliseEvent));
      }
    } catch {
      setEvents(MOCK_EVENTS);
    } finally {
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
        categories: CATEGORIES,
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
