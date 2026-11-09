import { Platform } from "react-native";

import type { StoryOverlay } from "@/components/StoryCanvas";
import type { PublishedStory } from "@/services/storyService";
import { api, ApiError } from "@/utils/apiClient";

export type StatusMediaType = "image" | "video" | "text";
export type StatusFit = "cover" | "contain";

export interface ApiStatus {
  id: string;
  user_id: string;
  event_id: string | null;
  media_url: string | null;
  media_type: StatusMediaType;
  caption: string | null;
  fit: StatusFit;
  background: string;
  overlays: unknown;
  created_at: string;
  expires_at: string;
  views_count: number;
  owner: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface StatusViewer {
  id: string;
  name: string;
  avatar_url: string | null;
  viewed_at: string;
}

export interface StatusViewerList {
  status_id: string;
  views_count: number;
  viewers: StatusViewer[];
}

export interface StatusMediaAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface StatusCreateInput {
  mediaType: StatusMediaType;
  media?: StatusMediaAsset;
  caption?: string;
  fit?: StatusFit;
  background?: string;
  overlays?: StoryOverlay[];
  eventId?: string;
}

const STATUS_PATH = "/api/v1/statuses";
const STATUS_MEDIA_PATH = "/api/v1/statuses/media";
const MAX_CAPTION_LENGTH = 1000;
const MAX_OVERLAYS = 8;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
};
const EXTENSION_MIMES: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXTENSIONS).flatMap(([mime, extensions]) =>
    extensions.map((extension) => [extension, mime] as const),
  ),
);
const PRIMARY_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function extensionOf(value?: string | null): string | undefined {
  const match = value?.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase();
}

export function resolveStatusMediaFile(
  asset: Pick<StatusMediaAsset, "uri" | "fileName" | "mimeType">,
  mediaType: Exclude<StatusMediaType, "text">,
  index = 0,
): { name: string; type: string } {
  const declared = asset.mimeType?.trim().toLowerCase();
  const uriExtension = extensionOf(asset.fileName) ?? extensionOf(asset.uri);
  const type =
    (declared && declared !== "application/octet-stream" ? declared : undefined) ??
    (uriExtension ? EXTENSION_MIMES[uriExtension] : undefined) ??
    (mediaType === "video" ? "video/mp4" : "image/jpeg");
  const fileNameExtension = extensionOf(asset.fileName);
  const matchingExtensions = MIME_EXTENSIONS[type] ?? [];
  const extension =
    fileNameExtension && matchingExtensions.includes(fileNameExtension)
      ? fileNameExtension
      : PRIMARY_EXTENSIONS[type] ?? uriExtension ?? (mediaType === "video" ? "mp4" : "jpg");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`;
  return { name: `status-${suffix}.${extension}`, type };
}

async function appendMedia(
  form: FormData,
  asset: StatusMediaAsset,
  mediaType: Exclude<StatusMediaType, "text">,
  index: number,
): Promise<void> {
  const file = resolveStatusMediaFile(asset, mediaType, index);
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("We couldn't read the selected media.");
    form.append("media", await response.blob(), file.name);
    return;
  }
  form.append("media", { uri: asset.uri, name: file.name, type: file.type } as unknown as Blob);
}

export function validateStatusInput(input: StatusCreateInput): string | null {
  if (input.mediaType === "text" && !input.caption?.trim()) {
    return "Add some text before publishing your status.";
  }
  if (input.mediaType !== "text" && !input.media?.uri) {
    return "Choose an image or video before publishing your status.";
  }
  if ((input.caption?.trim().length ?? 0) > MAX_CAPTION_LENGTH) {
    return `Keep the caption under ${MAX_CAPTION_LENGTH} characters.`;
  }
  if ((input.overlays?.length ?? 0) > MAX_OVERLAYS) {
    return `You can add up to ${MAX_OVERLAYS} layers.`;
  }
  return null;
}

export async function uploadStatusMedia(
  asset: StatusMediaAsset,
  mediaType: Exclude<StatusMediaType, "text">,
  index = 0,
): Promise<string> {
  const form = new FormData();
  await appendMedia(form, asset, mediaType, index);
  const response = await api.postForm<{ media_url?: unknown }>(STATUS_MEDIA_PATH, form);
  if (typeof response?.media_url !== "string" || !response.media_url) {
    throw new Error("The server didn't return the uploaded media URL.");
  }
  return response.media_url;
}

export async function createStatus(input: StatusCreateInput): Promise<ApiStatus> {
  const problem = validateStatusInput(input);
  if (problem) throw new Error(problem);
  const mediaUrl =
    input.mediaType === "text" || !input.media
      ? undefined
      : await uploadStatusMedia(input.media, input.mediaType);
  const body: Record<string, unknown> = {
    media_type: input.mediaType,
    fit: input.fit ?? "cover",
    background: input.background ?? "#101827",
    overlays: input.overlays ?? [],
  };
  if (mediaUrl) body.media_url = mediaUrl;
  if (input.caption?.trim()) body.caption = input.caption.trim();
  if (input.eventId) body.event_id = input.eventId;
  return api.post<ApiStatus>(STATUS_PATH, body);
}

export async function publishStatus(input: StatusCreateInput): Promise<PublishedStory> {
  return mapApiStatus(await createStatus(input));
}

export async function fetchStatusStories(): Promise<PublishedStory[]> {
  const [feed, mine] = await Promise.all([
    api.get<ApiStatus[]>(`${STATUS_PATH}/feed`),
    api.get<ApiStatus[]>(`${STATUS_PATH}/me`),
  ]);
  const unique = new Map<string, PublishedStory>();
  for (const record of [...(Array.isArray(feed) ? feed : []), ...(Array.isArray(mine) ? mine : [])]) {
    const story = mapApiStatus(record);
    unique.set(story.id, story);
  }
  return Array.from(unique.values());
}

export async function deleteStatus(id: string): Promise<void> {
  await api.delete(`${STATUS_PATH}/${encodeURIComponent(id)}`);
}

export async function recordStatusView(id: string): Promise<void> {
  await api.post(`${STATUS_PATH}/${encodeURIComponent(id)}/views`);
}

export async function fetchStatusViewers(id: string): Promise<StatusViewerList> {
  const response = await api.get<StatusViewerList>(
    `${STATUS_PATH}/${encodeURIComponent(id)}/views`,
  );
  return {
    status_id: response?.status_id ?? id,
    views_count:
      typeof response?.views_count === "number" ? response.views_count : 0,
    viewers: Array.isArray(response?.viewers)
      ? response.viewers.filter(
          (viewer): viewer is StatusViewer =>
            Boolean(viewer) &&
            typeof viewer.id === "string" &&
            typeof viewer.name === "string" &&
            typeof viewer.viewed_at === "string",
        )
      : [],
  };
}

export function describeStatusError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function normalizeOverlays(value: unknown): StoryOverlay[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): StoryOverlay[] => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    if (typeof source.text !== "string" || !source.text.trim()) return [];
    const style = source.style === "classic" || source.style === "label" ? source.style : "bold";
    return [{
      id: typeof source.id === "string" && source.id ? source.id : `layer-${index}`,
      text: source.text,
      kind: source.kind === "sticker" ? "sticker" : "text",
      x: numberInRange(source.x, 0.5, 0, 1),
      y: numberInRange(source.y, 0.5, 0, 1),
      color: typeof source.color === "string" && source.color ? source.color : "#FFFFFF",
      style,
      size: numberInRange(source.size, 24, 1, 200),
    }];
  }).slice(0, MAX_OVERLAYS);
}

function captionOverlay(caption: string | null): StoryOverlay[] {
  if (!caption?.trim()) return [];
  return [{
    id: "caption",
    text: caption.trim(),
    kind: "text",
    x: 0.5,
    y: 0.83,
    color: "#FFFFFF",
    style: "label",
    size: 23,
  }];
}

export function mapApiStatus(record: ApiStatus): PublishedStory {
  const overlays = normalizeOverlays(record.overlays);
  return {
    id: record.id,
    ownerId: record.user_id,
    eventId: record.event_id ?? undefined,
    mediaType: record.media_type,
    mediaUrl: record.media_url ?? undefined,
    organizerName: record.owner?.name || "Event organiser",
    organizerAvatar: record.owner?.avatar_url ?? "",
    background: record.background || "#101827",
    fit: record.fit === "contain" ? "contain" : "cover",
    overlays: overlays.length ? overlays : captionOverlay(record.caption),
    createdAt: Date.parse(record.created_at),
    expiresAt: Date.parse(record.expires_at),
    viewsCount: typeof record.views_count === "number" ? record.views_count : 0,
    source: "api",
  };
}
