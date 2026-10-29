import Constants from "expo-constants";
import { Platform } from "react-native";
import { ApiError } from "@/utils/apiClient";
import type { LivePerson } from "./liveState";

export type LiveEventReference = {
  id: string;
  title: string;
  image?: string;
  date: string;
  time: string;
  location: string;
  description: string;
  isPaid: boolean;
  price: number;
  currency: string;
};
export type LiveListing = {
  id: string;
  host: LivePerson;
  title: string;
  mode: "video" | "voice";
  event?: LiveEventReference;
  startedAt: number;
  endsAt: number;
  availableUntil: number;
  viewers: number;
  chatEnabled: boolean;
};
export type LiveDirectory = {
  rooms: LiveListing[];
  occupied: number;
  capacity: number;
  queueLength: number;
  developmentAccess: boolean;
  durationMinutes: number;
  guests: number;
};
export type LiveReservation = {
  kind: "room";
  listing: LiveListing;
  roomName: string;
  hostIdentity: string;
  controlToken: string;
};
export type LiveQueueTicket = {
  kind: "queue";
  id: string;
  controlToken: string;
  position: number;
  ready: boolean;
};
export type LiveStartResult = LiveReservation | LiveQueueTicket;
export type LiveWatchSession = {
  listing: LiveListing;
  roomName: string;
  hostIdentity: string;
};
export type LiveStartDraft = {
  requestId: string;
  host: LivePerson;
  title: string;
  mode: "video" | "voice";
  event?: LiveEventReference;
  chatEnabled: boolean;
};

function baseUrl() {
  const configured =
    process.env.EXPO_PUBLIC_LIVE_API_URL || process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  const metro = Constants.expoConfig?.hostUri;
  const host =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.hostname
      : metro
        ? new URL(`http://${metro}`).hostname
        : Platform.OS === "android"
          ? "10.0.2.2"
          : "localhost";
  return `http://${host}:3000`;
}
export const LIVE_API_BASE = baseUrl();
export function publicLiveImage(value?: string): string | undefined {
  return value &&
    (/^https?:\/\//.test(value) || /^[a-zA-Z0-9_-]{1,80}$/.test(value))
    ? value.slice(0, 1200)
    : undefined;
}
export function publicLivePerson(person: LivePerson): LivePerson {
  const avatar = publicLiveImage(person.avatar);
  return {
    id: person.id,
    name: person.name.slice(0, 64),
    ...(avatar ? { avatar } : {}),
  };
}
export function liveRequestId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${LIVE_API_BASE}/api/v1/live${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        data.message || "Live is unavailable. Try again.",
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      "Couldn’t reach Live. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
export const liveDirectoryApi = {
  list: () => request<LiveDirectory>("/rooms"),
  start: (draft: LiveStartDraft) =>
    request<LiveStartResult>("/rooms", "POST", draft),
  watch: (id: string) =>
    request<LiveWatchSession>(`/rooms/${encodeURIComponent(id)}/watch`, "POST"),
  heartbeat: (id: string, token: string, live: boolean, viewers: number) =>
    request<{ ok: true }>(
      `/rooms/${encodeURIComponent(id)}/heartbeat`,
      "POST",
      { live, viewers },
      token,
    ),
  end: (id: string, token: string) =>
    request<{ ok: true }>(
      `/rooms/${encodeURIComponent(id)}`,
      "DELETE",
      undefined,
      token,
    ),
  pollQueue: (ticket: LiveQueueTicket) =>
    request<LiveQueueTicket>(
      `/queue/${encodeURIComponent(ticket.id)}/poll`,
      "POST",
      undefined,
      ticket.controlToken,
    ),
  claimQueue: (ticket: LiveQueueTicket) =>
    request<LiveReservation>(
      `/queue/${encodeURIComponent(ticket.id)}/claim`,
      "POST",
      undefined,
      ticket.controlToken,
    ),
  cancelQueue: (ticket: LiveQueueTicket) =>
    request<{ ok: true }>(
      `/queue/${encodeURIComponent(ticket.id)}`,
      "DELETE",
      undefined,
      ticket.controlToken,
    ),
};
