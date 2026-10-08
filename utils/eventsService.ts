import type { Event } from "@/constants/events";
import { MOCK_EVENTS } from "@/constants/mockData";
import { FEATURED_DEMO_POSTS } from "@/constants/featuredDemoPosts";
import { getEventTiming } from "@/constants/eventPresentation";
import { api } from "@/utils/apiClient";

// Mock data stays the default until the backend's events endpoint ships.
// Set EXPO_PUBLIC_USE_EVENTS_API=true to load events from the API instead.
export const USE_EVENTS_API = process.env.EXPO_PUBLIC_USE_EVENTS_API === "true";

// Screens read events through EventsContext only, so this is the single place to change.
export async function fetchEvents(): Promise<Event[]> {
  const events = !USE_EVENTS_API
    ? [...FEATURED_DEMO_POSTS, ...scheduleGenericDemoEvents(MOCK_EVENTS)]
    : await api.get<Event[]>("/api/v1/events");

  // Expired events remain the organizer's historical data, but never appear in public discovery.
  return events.filter((event) => getEventTiming(event).kind !== "ended");
}

// The generic records are presentation fixtures, so keep them useful as the calendar advances.
// Supplied flyers retain their printed dates and naturally disappear after they end.
function scheduleGenericDemoEvents(events: Event[]): Event[] {
  const dayOffsets = [0, 1, 2, 2, 3, 4, 5, 6, 7, 9, 11, 14];
  return events.map((event, index) => ({
    ...event,
    date: formatLocalDate(addDays(new Date(), dayOffsets[index] ?? index + 2)),
  }));
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
