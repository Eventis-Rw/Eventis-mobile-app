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
    ? [...scheduleFlyerDemoEvents(FEATURED_DEMO_POSTS), ...scheduleGenericDemoEvents(MOCK_EVENTS)]
    : await api.get<Event[]>("/api/v1/events");

  // Expired events remain the organizer's historical data, but never appear in public discovery.
  return events.filter((event) => getEventTiming(event).kind !== "ended");
}

// Demo records follow the current calendar so presentations always show upcoming content.
function scheduleFlyerDemoEvents(events: Event[]): Event[] {
  const weekdayById: Record<string, number> = {
    "demo-friday-fiesta": 5,
    "demo-thursday-rewind": 4,
    "demo-grill-and-chill": 6,
  };

  return events.map((event) => ({
    ...event,
    date: formatLocalDate(nextWeekdayOccurrence(weekdayById[event.id] ?? 6, event.time)),
  }));
}

function scheduleGenericDemoEvents(events: Event[]): Event[] {
  const dayOffsets = [0, 1, 2, 2, 3, 4, 5, 6, 7, 9, 11, 14];
  return events.map((event, index) => ({
    ...event,
    date: formatLocalDate(addDays(new Date(), dayOffsets[index] ?? index + 2)),
  }));
}

function nextWeekdayOccurrence(targetWeekday: number, time: string) {
  const now = new Date();
  const occurrence = new Date(now);
  const [hours, minutes] = time.split(":").map(Number);
  const daysAhead = (targetWeekday - now.getDay() + 7) % 7;

  occurrence.setDate(now.getDate() + daysAhead);
  occurrence.setHours(hours || 0, minutes || 0, 0, 0);

  // Once a demo event's four-hour window has passed, show next week's occurrence.
  if (occurrence.getTime() + 4 * 60 * 60 * 1000 < now.getTime()) {
    occurrence.setDate(occurrence.getDate() + 7);
  }

  return occurrence;
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
