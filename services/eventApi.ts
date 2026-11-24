import { CATEGORIES, type Event, type EventCategory } from "@/constants/events";
import { File as ExpoFile } from "expo-file-system";
import { Platform } from "react-native";
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
  status: "draft" | "published" | "paused" | "cancelled";
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
  imageMimeType?: string;
  imageFileName?: string;
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

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-tiff": "tiff",
};

// Extensions the API accepts for each mime type (storage.service.ts's own expectedExt map).
// The picker's reported fileName and mimeType can disagree (e.g. an iOS asset named
// "IMG_1234.HEIC" whose mimeType comes back "image/jpeg" after OS-level transcoding),
// so the extension actually sent must be reconciled to the mime type, not trusted as is.
const ACCEPTABLE_IMAGE_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "image/bmp": ["bmp"],
  "image/x-ms-bmp": ["bmp"],
  "image/tiff": ["tiff", "tif"],
  "image/x-tiff": ["tiff", "tif"],
};

function inferImageMimeType(uri: string, name?: string) {
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(name ?? uri)?.[1]?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", jpe: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", avif: "image/avif", heic: "image/heic",
    heif: "image/heif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff",
  };
  return (extension && byExtension[extension]) || "image/jpeg";
}

function imageFileName(input: EventWriteInput, mimeType: string) {
  const fallbackExt = IMAGE_EXTENSIONS[mimeType] ?? "jpg";
  const acceptableExts = ACCEPTABLE_IMAGE_EXTENSIONS[mimeType] ?? [fallbackExt];
  const withMimeMatchingExtension = (name: string) => {
    const currentExt = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
    if (currentExt && acceptableExts.includes(currentExt)) return name;
    return `${name.replace(/\.[a-z0-9]+$/i, "")}.${fallbackExt}`;
  };

  const suppliedName = input.imageFileName?.trim();
  if (suppliedName) return withMimeMatchingExtension(suppliedName.replace(/[\\/]/g, "_"));
  const leaf = input.image.split(/[\\/]/).pop()?.split(/[?#]/)[0];
  if (leaf && /\.[a-z0-9]{2,5}$/i.test(leaf)) return withMimeMatchingExtension(leaf);
  return `cover.${fallbackExt}`;
}

async function appendCoverImage(form: FormData, input: EventWriteInput) {
  if (!/^(file|content|blob):/i.test(input.image)) {
    throw new Error("Choose an event image from your device before publishing.");
  }
  let mimeType = input.imageMimeType?.toLowerCase() || inferImageMimeType(input.image, input.imageFileName);
  if (!mimeType.startsWith("image/")) mimeType = inferImageMimeType(input.image, input.imageFileName);
  if (mimeType === "image/jpg" || mimeType === "image/pjpeg") mimeType = "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(input.image);
    if (!response.ok) throw new Error("We couldn't read the selected event image.");
    const blob = await response.blob();
    if (!input.imageMimeType && blob.type.startsWith("image/")) mimeType = blob.type;
    form.append("cover_image", blob, imageFileName(input, mimeType));
    return;
  }

  try {
    const file = new ExpoFile(input.image);
    const bytes = await file.bytes();
    form.append("cover_image", {
      name: imageFileName(input, mimeType),
      type: mimeType,
      bytes: () => bytes,
    } as unknown as Blob);
  } catch {
    throw new Error("We couldn't read this image from your device. Choose it again from your gallery.");
  }
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
  return listApiEventsAt("/api/v1/events");
}

export async function listApiPublisherEvents(): Promise<ApiEvent[]> {
  return listApiEventsAt("/api/v1/events/me/events");
}

async function listApiEventsAt(path: string): Promise<ApiEvent[]> {
  const limit = 100;
  const records: ApiEvent[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const result = await api.get<ApiEventPage>(
      `${path}?page=${page}&limit=${limit}`,
    );
    records.push(...result.items);
    total = result.total;
    if (result.items.length === 0 || page * result.limit >= result.total) break;
    page += 1;
  }

  return records;
}

export async function updateApiEventStatus(
  id: string,
  status: "published" | "paused",
): Promise<ApiEvent> {
  return api.patch<ApiEvent>(`/api/v1/events/${encodeURIComponent(id)}`, {
    status,
  });
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
    capacity: input.capacity > 0 ? input.capacity : null,
    is_paid: input.isPaid,
    // Paid entry: optional price (null clears it), required external ticket link.
    // Free entry: the API clears both.
    ...(input.isPaid ? { price_minor: input.price > 0 ? String(Math.round(input.price)) : null } : {}),
    currency: "RWF",
    ...(input.isPaid && input.websiteUrl?.trim() ? { booking_url: input.websiteUrl.trim() } : {}),
    tags: [input.category.toLowerCase()],
  };
}

async function createEventForm(input: EventWriteInput): Promise<FormData> {
  const form = new FormData();
  for (const [key, value] of Object.entries(toApiPayload(input, "published"))) {
    form.append(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  await appendCoverImage(form, input);
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
    await appendCoverImage(form, input);
    return api.patchForm<ApiEvent>(
      `/api/v1/events/${encodeURIComponent(id)}`,
      form,
    );
  }
  return api.patch<ApiEvent>(`/api/v1/events/${encodeURIComponent(id)}`, payload);
}
