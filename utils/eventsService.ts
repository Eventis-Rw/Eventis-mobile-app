import { MOCK_EVENTS, type Event } from "@/constants/mockData";

// The backend has no events endpoint yet, so events come from mock data.
// When it ships, replace the body with an `api.get` call (see utils/apiClient.ts)
// and map the response to `Event`. Screens read events through EventsContext
// only, so this is the single place to change.
export async function fetchEvents(): Promise<Event[]> {
  return MOCK_EVENTS;
}
