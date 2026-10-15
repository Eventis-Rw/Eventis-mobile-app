import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  MOCK_LOVE_PROFILES,
  type LoveConnectionStatus,
  type LoveGender,
  type LoveProfile,
  type MyLoveProfile,
  type MyLoveProfileInput,
} from "@/constants/loveProfiles";
import { api, ApiError } from "@/utils/apiClient";
import {
  FREE_LOVE_PHOTO_LIMIT,
  isAdult,
  MIN_LOVE_AGE,
  normalizeLoveUsername,
  validateLoveBio,
  validateLoveGender,
  validateLoveInterests,
  validateLoveNeighborhood,
  validateLoveUsername,
} from "@/utils/findLoveProfile";

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

export { MIN_LOVE_AGE };

const PROFILES_TIMEOUT_MS = 5000;
const DEMO_REQUESTS_KEY = "@eventis_love_demo_requests_v1";
const DEMO_MY_PROFILE_KEY = "@eventis_love_demo_my_profile_v1";

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

function normalizeGender(value: unknown): LoveGender | null {
  const gender = String(value ?? "").toLowerCase();
  if (["man", "men", "male", "m", "he"].includes(gender)) return "Man";
  if (["woman", "women", "female", "f", "she"].includes(gender)) return "Woman";
  return null;
}

function normalizeConnectionStatus(value: unknown): LoveConnectionStatus {
  return value === "pending" || value === "connected" ? value : "none";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Maps one API row to a profile. FindLove is 18+ only and gender is required,
 * so a row without a whole-number age of at least 18 or a known gender is
 * dropped rather than given a default.
 */
export function normalizeLoveProfile(value: unknown): LoveProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = String(source.id ?? source.profileId ?? "");
  if (!id) return null;

  const age = typeof source.age === "number" ? source.age : Number(source.age ?? Number.NaN);
  if (!Number.isInteger(age) || age < MIN_LOVE_AGE) return null;

  const gender = normalizeGender(source.gender);
  if (!gender) return null;

  const name = String(source.name ?? source.displayName ?? source.username ?? "Eventis member");
  return {
    id,
    userId: String(source.userId ?? source.user_id ?? id),
    username: String(source.username ?? source.handle ?? name),
    name,
    gender,
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

// ---- The member's own profile ------------------------------------------------

/** Thrown when the input breaks a FindLove rule; `field` names the form field. */
export class LoveProfileInputError extends Error {
  constructor(
    public readonly field:
      | "username"
      | "gender"
      | "dateOfBirth"
      | "photoUrls"
      | "confirmedAdult"
      | "bio"
      | "interests"
      | "neighborhood",
    message: string,
  ) {
    super(message);
    this.name = "LoveProfileInputError";
  }
}

/** Same checks the server is expected to run; the form calls them first. */
export function checkMyLoveProfileInput(input: MyLoveProfileInput, isNew: boolean, today: Date = new Date()): void {
  const usernameError = validateLoveUsername(input.username);
  if (usernameError) throw new LoveProfileInputError("username", usernameError);
  const genderError = validateLoveGender(input.gender);
  if (genderError) throw new LoveProfileInputError("gender", genderError);
  if (!isAdult(input.dateOfBirth, today)) {
    throw new LoveProfileInputError("dateOfBirth", `FindLove is only for people aged ${MIN_LOVE_AGE} and over.`);
  }
  if (isNew && !input.confirmedAdult) {
    throw new LoveProfileInputError("confirmedAdult", `Confirm that you are ${MIN_LOVE_AGE} or older.`);
  }
  // Photos are optional; members can add them later from Edit profile.
  if (input.photoUrls.length > FREE_LOVE_PHOTO_LIMIT) {
    throw new LoveProfileInputError("photoUrls", `You can add up to ${FREE_LOVE_PHOTO_LIMIT} photos.`);
  }
  const bioError = validateLoveBio(input.bio);
  if (bioError) throw new LoveProfileInputError("bio", bioError);
  const interestsError = validateLoveInterests(input.interests ?? []);
  if (interestsError) throw new LoveProfileInputError("interests", interestsError);
  const neighborhoodError = validateLoveNeighborhood(input.neighborhood);
  if (neighborhoodError) throw new LoveProfileInputError("neighborhood", neighborhoodError);
}

/** Trims the optional extras and drops empty ones so storage and the API see one shape. */
function cleanExtras(input: Pick<MyLoveProfileInput, "bio" | "interests" | "neighborhood">) {
  return {
    bio: input.bio?.trim() || undefined,
    interests: [...new Set(input.interests ?? [])],
    neighborhood: input.neighborhood || undefined,
  };
}

/** Maps the API's own-profile response; returns null when it is unusable. */
export function normalizeMyLoveProfile(value: unknown): MyLoveProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const username = normalizeLoveUsername(String(source.username ?? ""));
  const gender = normalizeGender(source.gender);
  const dateOfBirth = String(source.dateOfBirth ?? source.date_of_birth ?? "");
  if (!username || !gender || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const photos = Array.isArray(source.photoUrls) ? source.photoUrls : Array.isArray(source.photos) ? source.photos : [];
  const now = new Date().toISOString();
  return {
    username,
    gender,
    dateOfBirth,
    visibility: source.visibility === "private" ? "private" : "public",
    photoUrls: photos.map(String).filter(Boolean).slice(0, FREE_LOVE_PHOTO_LIMIT),
    bio: optionalString(source.bio),
    interests: Array.isArray(source.interests) ? source.interests.map(String).filter(Boolean) : [],
    neighborhood: optionalString(source.neighborhood ?? source.neighbourhood),
    createdAt: optionalString(source.createdAt) ?? now,
    updatedAt: optionalString(source.updatedAt) ?? now,
  };
}

async function readDemoMyProfiles(): Promise<Record<string, MyLoveProfile>> {
  try {
    const stored = await AsyncStorage.getItem(DEMO_MY_PROFILE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, MyLoveProfile>) : {};
  } catch {
    return {};
  }
}

// INTEGRATION POINT: GET /api/v1/love-profiles/me -> MyLoveProfile, 404 when none exists yet.
export async function fetchMyLoveProfile(userId: string): Promise<MyLoveProfile | null> {
  if (!USE_FINDLOVE_API) {
    await wait(200);
    return normalizeMyLoveProfile((await readDemoMyProfiles())[userId]);
  }
  try {
    return normalizeMyLoveProfile(await withTimeout(api.get<unknown>("/api/v1/love-profiles/me"), PROFILES_TIMEOUT_MS));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// INTEGRATION POINT: POST (create) / PUT (update) /api/v1/love-profiles/me -> MyLoveProfile
// The server must re-check age, username format and uniqueness (409 when taken).
// Photos are local URIs until the presigned upload endpoint exists (Q-B1).
export async function saveMyLoveProfile(
  userId: string,
  input: MyLoveProfileInput,
  isNew: boolean,
): Promise<MyLoveProfile> {
  checkMyLoveProfileInput(input, isNew);
  const username = normalizeLoveUsername(input.username);

  if (!USE_FINDLOVE_API) {
    await wait(400);
    const taken = MOCK_LOVE_PROFILES.some((profile) => profile.username.toLowerCase() === username);
    if (taken) throw new LoveProfileInputError("username", "That username is taken. Try another one.");
    const all = await readDemoMyProfiles();
    const now = new Date().toISOString();
    const saved: MyLoveProfile = {
      username,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      visibility: input.visibility,
      photoUrls: input.photoUrls,
      ...cleanExtras(input),
      createdAt: all[userId]?.createdAt ?? now,
      updatedAt: now,
    };
    await AsyncStorage.setItem(DEMO_MY_PROFILE_KEY, JSON.stringify({ ...all, [userId]: saved }));
    return saved;
  }

  const body = {
    username,
    gender: input.gender.toLowerCase(),
    dateOfBirth: input.dateOfBirth,
    visibility: input.visibility,
    photoUrls: input.photoUrls,
    ...cleanExtras(input),
    ...(isNew ? { confirmedAdult: true } : {}),
  };
  try {
    const response = isNew
      ? await api.post<unknown>("/api/v1/love-profiles/me", body)
      : await api.put<unknown>("/api/v1/love-profiles/me", body);
    const saved = normalizeMyLoveProfile(response);
    if (!saved) throw new Error("FindLove saved your profile but sent back an unexpected reply. Pull to refresh.");
    return saved;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      throw new LoveProfileInputError("username", "That username is taken. Try another one.");
    }
    throw err;
  }
}