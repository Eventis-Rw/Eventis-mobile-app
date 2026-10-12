import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Event, EventCategory } from "@/constants/events";
import { USE_PROFILE_API } from "@/services/profileService";
import { api } from "@/utils/apiClient";

/**
 * Publisher tools for individual posters and businesses: their own events
 * (create, edit, pause, delete), performance analytics and paid promotions.
 *
 * BACKEND STATUS: the events API is read-only and has no owner filter, and
 * there are no analytics or promotion modules. Until they ship, this service
 * keeps a local demo store shared by all accounts on the device, so events a
 * publisher creates also appear in discovery (see `fetchEvents`). The same
 * EXPO_PUBLIC_USE_PROFILE_API flag switches to the proposed endpoints below.
 */

export type PublisherEventStatus = "published" | "paused";

/** A publisher's own event. `paused` events are hidden from discovery but keep their bookings. */
export interface PublisherEvent extends Event {
  ownerId: string;
  status: PublisherEventStatus;
  createdAt: string;
}

export interface PublisherEventInput {
  title: string;
  description: string;
  category: Exclude<EventCategory, "All">;
  location: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, 24-hour */
  time: string;
  capacity: number;
  isPaid: boolean;
  price: number;
  /** Organiser's payment site; required for paid events (customers pay there). */
  websiteUrl?: string;
}

export const EVENT_TITLE_MAX = 90;
export const EVENT_DESCRIPTION_MAX = 2000;

export function validateEventInput(input: PublisherEventInput, today = localDate(new Date())): string | null {
  if (!input.title.trim()) return "Add an event title.";
  if (input.title.trim().length > EVENT_TITLE_MAX) return `Keep the title under ${EVENT_TITLE_MAX} characters.`;
  if (!input.description.trim()) return "Add a description.";
  if (input.description.length > EVENT_DESCRIPTION_MAX) return "The description is too long.";
  if (!input.category) return "Choose a category.";
  if (!input.location.trim()) return "Add the venue or location.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(new Date(input.date).getTime())) {
    return "Enter the date as YYYY-MM-DD.";
  }
  if (input.date < today) return "The event date can't be in the past.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Enter the time as HH:MM, e.g. 18:30.";
  if (!Number.isInteger(input.capacity) || input.capacity < 1) return "Capacity must be at least 1.";
  if (input.isPaid) {
    if (!(input.price > 0)) return "Paid events need a ticket price.";
    if (!isWebsite(input.websiteUrl)) return "Paid events need your payment website (https://…).";
  }
  return null;
}

export function isWebsite(value?: string): boolean {
  if (!value?.trim()) return false;
  return /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value.trim());
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface EventPerformance {
  eventId: string;
  title: string;
  views: number;
  websiteClicks: number;
  attendees: number;
  capacity: number;
}

export interface PublisherAnalytics {
  /** True while numbers come from the local demo rather than tracked activity. */
  isSample: boolean;
  totals: {
    views: number;
    websiteClicks: number;
    /** websiteClicks / views, 0–1. */
    clickThroughRate: number;
    attendees: number;
    capacity: number;
    /** attendees / capacity, 0–1. */
    fillRate: number;
    bannerImpressions: number;
    bannerClicks: number;
  };
  events: EventPerformance[];
}

// ---------------------------------------------------------------------------
// Promotions (home page placements are paid; Eventis reviews each request)
// ---------------------------------------------------------------------------

export type PromotionPlacement =
  | "home_banner"
  | "featured"
  | "category_highlight"
  | "nearby_promoted"
  | "sponsored_ad";

export const PROMOTION_PLACEMENTS: { key: PromotionPlacement; title: string; description: string }[] = [
  { key: "home_banner", title: "Home page banner", description: "A banner in the carousel at the top of Home." },
  { key: "featured", title: "Featured events", description: "A spot in the Featured section on Home." },
  { key: "category_highlight", title: "Category highlight", description: "Pinned at the top of its category." },
  { key: "nearby_promoted", title: "Nearby & trending", description: "Boosted for people near your venue." },
  { key: "sponsored_ad", title: "Sponsored ad", description: "Marked as sponsored in the discovery feed." },
];

export const PROMOTION_DURATIONS = [3, 7, 14, 30] as const;

export type PromotionStatus = "in_review" | "active" | "ended" | "rejected";

export interface Promotion {
  id: string;
  eventId: string;
  eventTitle: string;
  placement: PromotionPlacement;
  durationDays: number;
  status: PromotionStatus;
  requestedAt: string;
  impressions: number;
  clicks: number;
}

export interface PromotionRequest {
  eventId: string;
  eventTitle: string;
  placement: PromotionPlacement;
  durationDays: number;
}

export function validatePromotionRequest(input: Partial<PromotionRequest>): string | null {
  if (!input.eventId) return "Choose an event to promote.";
  if (!input.placement) return "Choose where to promote it.";
  if (!PROMOTION_DURATIONS.includes(input.durationDays as (typeof PROMOTION_DURATIONS)[number])) {
    return "Choose how long to run the promotion.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Local demo storage
// ---------------------------------------------------------------------------

const EVENTS_KEY = "@eventis_publisher_events";
const promotionsKey = (userId: string) => `@eventis_publisher_promotions:${userId}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEMO_LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 350;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<T> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  return value;
}

function localDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const CATEGORY_IMAGE: Partial<Record<EventCategory, string>> = { Tech: "tech", Business: "tech", Food: "food" };

function addHours(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  return `${String(((h || 0) + hours) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function toEventFields(input: PublisherEventInput) {
  const price = input.isPaid ? Math.round(input.price) : 0;
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    location: input.location.trim(),
    city: input.location.split(",").pop()?.trim() || input.location.trim(),
    date: input.date,
    time: input.time,
    endTime: addHours(input.time, 3),
    price,
    isPaid: input.isPaid && price > 0,
    capacity: input.capacity,
    organizerWebsite: input.isPaid ? input.websiteUrl?.trim() : undefined,
  };
}

/** Small stable number per id so demo analytics don't jump between renders. */
function seedOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Demo only: every published event in the local store, for public discovery. */
export async function fetchDemoPublishedEvents(): Promise<PublisherEvent[]> {
  if (USE_PROFILE_API) return [];
  const all = await readJson<PublisherEvent[]>(EVENTS_KEY, []);
  return all.filter((e) => e.status === "published");
}

// INTEGRATION POINT: GET /api/v1/organisers/me/events -> { events: PublisherEvent[] }
// Includes paused and past events; replaces matching by organiser name.
export async function fetchPublisherEvents(userId: string): Promise<PublisherEvent[]> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const all = await readJson<PublisherEvent[]>(EVENTS_KEY, []);
    return all.filter((e) => e.ownerId === userId).sort((a, b) => a.date.localeCompare(b.date));
  }
  const resp = await api.get<{ events: PublisherEvent[] }>("/api/v1/organisers/me/events");
  return resp.events;
}

export async function fetchPublisherEvent(userId: string, eventId: string): Promise<PublisherEvent | undefined> {
  const events = await fetchPublisherEvents(userId);
  return events.find((e) => e.id === eventId);
}

// INTEGRATION POINT: POST /api/v1/events -> { event: PublisherEvent }
export async function createPublisherEvent(
  userId: string,
  organizerName: string,
  input: PublisherEventInput,
): Promise<PublisherEvent> {
  const problem = validateEventInput(input);
  if (problem) throw new Error(problem);
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const all = await readJson<PublisherEvent[]>(EVENTS_KEY, []);
    const event: PublisherEvent = {
      id: "pub_" + Date.now().toString(36),
      ...toEventFields(input),
      currency: "RWF",
      organizer: organizerName,
      attendees: 0,
      image: CATEGORY_IMAGE[input.category] ?? "concert",
      tags: [input.category.toLowerCase()],
      isFeatured: false,
      isSponsored: false,
      distance: 0,
      rating: 0,
      reviewCount: 0,
      ownerId: userId,
      status: "published",
      createdAt: new Date().toISOString(),
    };
    await writeJson(EVENTS_KEY, [...all, event]);
    return event;
  }
  const resp = await api.post<{ event: PublisherEvent }>("/api/v1/events", input);
  return resp.event;
}

// INTEGRATION POINT: PATCH /api/v1/events/:id -> { event: PublisherEvent }
export async function updatePublisherEvent(
  userId: string,
  eventId: string,
  input: PublisherEventInput,
): Promise<PublisherEvent> {
  const problem = validateEventInput(input);
  if (problem) throw new Error(problem);
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return mutateDemoEvent(userId, eventId, (e) => ({ ...e, ...toEventFields(input) }));
  }
  const resp = await api.patch<{ event: PublisherEvent }>(`/api/v1/events/${encodeURIComponent(eventId)}`, input);
  return resp.event;
}

// INTEGRATION POINT: PATCH /api/v1/events/:id/status { status } -> { event: PublisherEvent }
export async function setPublisherEventStatus(
  userId: string,
  eventId: string,
  status: PublisherEventStatus,
): Promise<PublisherEvent> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return mutateDemoEvent(userId, eventId, (e) => ({ ...e, status }));
  }
  const resp = await api.patch<{ event: PublisherEvent }>(
    `/api/v1/events/${encodeURIComponent(eventId)}/status`,
    { status },
  );
  return resp.event;
}

// INTEGRATION POINT: DELETE /api/v1/events/:id
export async function deletePublisherEvent(userId: string, eventId: string): Promise<void> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const all = await readJson<PublisherEvent[]>(EVENTS_KEY, []);
    const target = all.find((e) => e.id === eventId);
    if (!target || target.ownerId !== userId) throw new Error("This event no longer exists.");
    await writeJson(
      EVENTS_KEY,
      all.filter((e) => e.id !== eventId),
    );
    return;
  }
  await api.delete(`/api/v1/events/${encodeURIComponent(eventId)}`);
}

async function mutateDemoEvent(
  userId: string,
  eventId: string,
  change: (event: PublisherEvent) => PublisherEvent,
): Promise<PublisherEvent> {
  const all = await readJson<PublisherEvent[]>(EVENTS_KEY, []);
  const target = all.find((e) => e.id === eventId);
  if (!target || target.ownerId !== userId) throw new Error("This event no longer exists.");
  const updated = change(target);
  await writeJson(
    EVENTS_KEY,
    all.map((e) => (e.id === eventId ? updated : e)),
  );
  return updated;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** Rolls per-event numbers up into totals; shared by the demo and API mapping. */
export function summariseAnalytics(
  events: EventPerformance[],
  banners: { impressions: number; clicks: number },
  isSample: boolean,
): PublisherAnalytics {
  const sum = (pick: (e: EventPerformance) => number) => events.reduce((total, e) => total + pick(e), 0);
  const views = sum((e) => e.views);
  const websiteClicks = sum((e) => e.websiteClicks);
  const attendees = sum((e) => e.attendees);
  const capacity = sum((e) => e.capacity);
  return {
    isSample,
    totals: {
      views,
      websiteClicks,
      clickThroughRate: views ? websiteClicks / views : 0,
      attendees,
      capacity,
      fillRate: capacity ? Math.min(1, attendees / capacity) : 0,
      bannerImpressions: banners.impressions,
      bannerClicks: banners.clicks,
    },
    events,
  };
}

// INTEGRATION POINT: GET /api/v1/organisers/me/analytics -> PublisherAnalytics
export async function fetchPublisherAnalytics(
  userId: string,
  events: Pick<Event, "id" | "title" | "attendees" | "capacity" | "viewCount" | "organizerWebsite">[],
): Promise<PublisherAnalytics> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const performance = events.map((e) => {
      const seed = seedOf(e.id);
      const views = e.viewCount ?? 120 + (seed % 1800);
      return {
        eventId: e.id,
        title: e.title,
        views,
        websiteClicks: e.organizerWebsite ? Math.round(views * (0.02 + (seed % 6) / 100)) : 0,
        attendees: e.attendees,
        capacity: e.capacity,
      };
    });
    const promotions = await readJson<Promotion[]>(promotionsKey(userId), []);
    const banners = promotions.reduce(
      (acc, p) => ({ impressions: acc.impressions + p.impressions, clicks: acc.clicks + p.clicks }),
      { impressions: 0, clicks: 0 },
    );
    return summariseAnalytics(performance, banners, true);
  }
  return api.get<PublisherAnalytics>("/api/v1/organisers/me/analytics");
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/promotions?owner=me -> { promotions: Promotion[] }
export async function fetchPromotions(userId: string): Promise<Promotion[]> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return readJson<Promotion[]>(promotionsKey(userId), []);
  }
  const resp = await api.get<{ promotions: Promotion[] }>("/api/v1/promotions?owner=me");
  return resp.promotions;
}

// INTEGRATION POINT: POST /api/v1/promotions -> { promotion: Promotion }
// Pricing depends on placement, duration, reach, category and area, so the
// team confirms the quote before anything is charged.
export async function requestPromotion(userId: string, input: PromotionRequest): Promise<Promotion> {
  const problem = validatePromotionRequest(input);
  if (problem) throw new Error(problem);
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await readJson<Promotion[]>(promotionsKey(userId), []);
    const duplicate = current.find(
      (p) => p.eventId === input.eventId && p.placement === input.placement && p.status === "in_review",
    );
    if (duplicate) throw new Error("You already have this placement in review for this event.");
    const promotion: Promotion = {
      id: "promo_" + Date.now().toString(36),
      ...input,
      status: "in_review",
      requestedAt: new Date().toISOString(),
      impressions: 0,
      clicks: 0,
    };
    await writeJson(promotionsKey(userId), [promotion, ...current]);
    return promotion;
  }
  const resp = await api.post<{ promotion: Promotion }>("/api/v1/promotions", input);
  return resp.promotion;
}
