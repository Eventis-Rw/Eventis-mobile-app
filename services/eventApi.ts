import { CATEGORIES, type Event, type EventCategory } from "@/constants/events";
import { api } from "@/utils/apiClient";

export const USE_EVENTS_API = process.env.EXPO_PUBLIC_USE_EVENTS_API !== "false";

export interface ApiEvent {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  category: string | null;
  location: string;
  city: string | null;
  start_date: string;
  time: string;
  end_date: string | null;
  end_time: string | null;
  status: "draft" | "published" | "cancelled";
  capacity: number | null;
  is_paid: boolean;
  price_minor: string | null;
  currency: string;
  booking_url: string | null;
  instructions: string | null;
  tags: string[];
  organisation_id: string | null;
  views_count: number;
  saves_count: number;
  rating_avg: number;
  review_count: number;
  poster_id: string;
  created_at: string;
  updated_at: string;
}

interface ApiEventPage {
  items: ApiEvent[];
  page: number;
  limit: number;
  total: number;
}

export interface EventWriteInput {
  image: string;
  title: string;
  description: string;
  category: Exclude<EventCategory, "All">;
  location: string;
  date: string;
  time: string;
  capacity: number;
  isPaid: boolean;
  price: number;
  websiteUrl?: string;
}

export function mapApiEvent(record: ApiEvent, organizer = "Event organiser"): Event {
  const category = CATEGORIES.find(
    (candidate): candidate is Exclude<EventCategory, "All"> =>
      candidate !== "All" &&
      candidate.toLowerCase() === (record.category ?? "").trim().toLowerCase(),
  );

  return {
    id: record.id || record.event_id,
    ownerId: record.poster_id,
    organisationId: record.organisation_id ?? undefined,
    title: record.title,
    category: category ?? "Community",
    description: record.description ?? "",
    location: record.location,
    city: record.city ?? record.location.split(",").pop()?.trim() ?? record.location,
    date: record.start_date.slice(0, 10),
    time: record.time,
    endTime: record.end_time ?? "",
    price: record.price_minor === null ? 0 : Number(record.price_minor),
    currency: record.currency,
    organizer,
    organizerWebsite: record.booking_url ?? undefined,
    attendees: 0,
    capacity: record.capacity ?? 0,
    image: record.cover_image ?? "",
    tags: record.tags,
    isFeatured: false,
    isSponsored: false,
    isPaid: record.is_paid,
    distance: 0,
    rating: record.rating_avg,
    reviewCount: record.review_count,
    viewCount: record.views_count,
    savesCount: record.saves_count,
    instructions: record.instructions?.split(/\r?\n/).filter(Boolean),
  };
}

export async function listApiEvents(): Promise<ApiEvent[]> {
  const limit = 100;
  const records: ApiEvent[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const result = await api.get<ApiEventPage>(
      `/api/v1/events?page=${page}&limit=${limit}`,
    );
    records.push(...result.items);
    total = result.total;
    if (result.items.length === 0 || page * result.limit >= result.total) break;
    page += 1;
  }

  return records;
}

export async function getApiEvent(id: string): Promise<ApiEvent> {
  return api.get<ApiEvent>(`/api/v1/events/${encodeURIComponent(id)}`);
}

function toApiPayload(
  input: EventWriteInput,
  status?: "published",
) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    location: input.location.trim(),
    city: input.location.split(",").pop()?.trim() || input.location.trim(),
    start_date: input.date,
    time: input.time,
    timezone: "Africa/Kigali",
    ...(status ? { status } : {}),
    capacity: input.capacity,
    is_paid: input.isPaid,
    ...(input.isPaid ? { price_minor: String(Math.round(input.price)) } : {}),
    currency: "RWF",
    ...(input.isPaid && input.websiteUrl ? { booking_url: input.websiteUrl.trim() } : {}),
    tags: [input.category.toLowerCase()],
  };
}

async function createEventForm(input: EventWriteInput): Promise<FormData> {
  if (!/^(file|content|blob):/i.test(input.image)) {
    throw new Error("Select an event image from this device to publish it.");
  }
  const imageResponse = await fetch(input.image);
  if (!imageResponse.ok) throw new Error("We couldn't read the selected event image.");

  const form = new FormData();
  for (const [key, value] of Object.entries(toApiPayload(input, "published"))) {
    form.append(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  form.append("cover_image", await imageResponse.blob(), "cover.jpg");
  return form;
}

export async function createApiEvent(input: EventWriteInput): Promise<ApiEvent> {
  const form = await createEventForm(input);
  return api.postForm<ApiEvent>("/api/v1/events", form);
}

export async function updateApiEvent(
  id: string,
  input: EventWriteInput,
): Promise<ApiEvent> {
  const payload = toApiPayload(input);
  if (/^(file|content|blob):/i.test(input.image)) {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      form.append(key, Array.isArray(value) ? value.join(",") : String(value));
    }
    const imageResponse = await fetch(input.image);
    if (!imageResponse.ok) throw new Error("We couldn't read the selected event image.");
    form.append("cover_image", await imageResponse.blob(), "cover.jpg");
    return api.patchForm<ApiEvent>(
      `/api/v1/events/${encodeURIComponent(id)}`,
      form,
    );
  }
  return api.patch<ApiEvent>(`/api/v1/events/${encodeURIComponent(id)}`, payload);
}
