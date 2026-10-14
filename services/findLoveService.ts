import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  MOCK_LOVE_PROFILES,
  type LoveConnectionStatus,
  type LoveGender,
  type LoveProfile,
} from "@/constants/loveProfiles";
import { api } from "@/utils/apiClient";

/**
 * FindLove data: member profiles and connection requests.
 *
 * BACKEND STATUS: no FindLove endpoints are confirmed yet (see
 * docs/findlove-inspection-and-plan.md, Q-B1 and Q-B8). Until they ship, this
 * service runs a local demo. Set EXPO_PUBLIC_USE_FINDLOVE_API=true to call the
 * endpoints below instead; their errors are surfaced, never replaced by demo data.
 *
 * Screens and contexts never call `api` for FindLove directly, so the endpoint
 * paths and response mapping here are the single integration point.
 */

/** Master switch. Off: no FindLove tab, screens, providers or network calls. */
export const FIND_LOVE_ENABLED = process.env.EXPO_PUBLIC_FINDLOVE_ENABLED === "true";
export const USE_FINDLOVE_API = process.env.EXPO_PUBLIC_USE_FINDLOVE_API === "true";

export const MIN_LOVE_AGE = 18;

const PROFILES_TIMEOUT_MS = 5000;
const DEMO_REQUESTS_KEY = "@eventis_love_demo_requests_v1";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("FindLove is taking too long to respond.")), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeGender(value: unknown): LoveGender {
  const gender = String(value ?? "").toLowerCase();
  if (["he", "man", "male"].includes(gender)) return "He";
  if (["she", "woman", "female"].includes(gender)) return "She";
  return "They";
}

function normalizeConnectionStatus(value: unknown): LoveConnectionStatus {
  return value === "pending" || value === "connected" ? value : "none";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Maps one API row to a profile. FindLove is 18+ only, so a row without a
 * whole-number age of at least 18 is dropped rather than given a default.
 */
export function normalizeLoveProfile(value: unknown): LoveProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = String(source.id ?? source.profileId ?? "");
  if (!id) return null;

  const age = typeof source.age === "number" ? source.age : Number(source.age ?? Number.NaN);
  if (!Number.isInteger(age) || age < MIN_LOVE_AGE) return null;

  const name = String(source.name ?? source.displayName ?? source.username ?? "Eventis member");
  return {
    id,
    userId: String(source.userId ?? source.user_id ?? id),
    username: String(source.username ?? source.handle ?? name),
    name,
    gender: normalizeGender(source.gender ?? source.pronoun),
    age,
    city: String(source.city ?? "Kigali"),
    occupation: String(source.occupation ?? source.jobTitle ?? "Eventis member"),
    bio: String(source.bio ?? source.about ?? ""),
    interests: Array.isArray(source.interests) ? source.interests.map(String) : [],
    imageUrl: String(source.imageUrl ?? source.profileImage ?? source.avatarUrl ?? ""),
    visibility: source.visibility === "private" ? "private" : "public",
    isOnline: Boolean(source.isOnline ?? source.online ?? false),
    lastActiveAt: optionalString(source.lastActiveAt),
    neighborhood: optionalString(source.neighborhood ?? source.neighbourhood),
    active: Boolean(source.active ?? source.isActive ?? true),
    eligible: Boolean(source.eligible ?? source.isEligible ?? true),
    verified: Boolean(source.verified ?? source.isVerified ?? false),
    connectionStatus: normalizeConnectionStatus(source.connectionStatus),
  };
}

export function readLoveProfilesResponse(value: unknown): LoveProfile[] {
  const source = value as { profiles?: unknown[] } | unknown[];
  const rows = Array.isArray(source) ? source : Array.isArray(source?.profiles) ? source.profiles : [];
  return rows.map(normalizeLoveProfile).filter((profile): profile is LoveProfile => profile !== null);
}

async function readDemoRequests(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(DEMO_REQUESTS_KEY);
    const ids: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

// INTEGRATION POINT: GET /api/v1/love-profiles -> LoveProfile[] | { profiles: LoveProfile[] }
// connectionStatus on each row is the caller's status with that member.
export async function fetchLoveProfiles(): Promise<LoveProfile[]> {
  if (!USE_FINDLOVE_API) {
    await wait(400);
    const requested = new Set(await readDemoRequests());
    return MOCK_LOVE_PROFILES.map((profile) =>
      requested.has(profile.id) && (profile.connectionStatus ?? "none") === "none"
        ? { ...profile, connectionStatus: "pending" as const }
        : profile,
    );
  }
  const response = await withTimeout(api.get<unknown>("/api/v1/love-profiles"), PROFILES_TIMEOUT_MS);
  return readLoveProfilesResponse(response);
}

// INTEGRATION POINT: POST /api/v1/love-profiles/:id/connections -> { connectionStatus }
// Returns the status the server recorded. Throws if the request was not saved.
export async function requestLoveConnection(profileId: string): Promise<LoveConnectionStatus> {
  if (!USE_FINDLOVE_API) {
    await wait(300);
    const requested = await readDemoRequests();
    if (!requested.includes(profileId)) {
      await AsyncStorage.setItem(DEMO_REQUESTS_KEY, JSON.stringify([...requested, profileId]));
    }
    return "pending";
  }
  const response = await api.post<{ connectionStatus?: unknown } | undefined>(
    `/api/v1/love-profiles/${encodeURIComponent(profileId)}/connections`,
  );
  const status = normalizeConnectionStatus(response?.connectionStatus);
  return status === "none" ? "pending" : status;
}
