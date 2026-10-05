import type { Event } from "@/constants/events";
import { MOCK_EVENTS } from "@/constants/mockData";
import { FEATURED_DEMO_POSTS } from "@/constants/featuredDemoPosts";
import { api } from "@/utils/apiClient";

// Mock data stays the default until the backend's events endpoint ships.
// Set EXPO_PUBLIC_USE_EVENTS_API=true to load events from the API instead.
export const USE_EVENTS_API = process.env.EXPO_PUBLIC_USE_EVENTS_API === "true";

// Screens read events through EventsContext only, so this is the single place to change.
export async function fetchEvents(): Promise<Event[]> {
  if (!USE_EVENTS_API) return [...FEATURED_DEMO_POSTS, ...MOCK_EVENTS];
  // TODO: map the API response to `Event` once its shape is final.
  return api.get<Event[]>("/api/v1/events");
}
