import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, ApiError } from "@/utils/apiClient";

/**
 * Profile & settings data that the core auth/bookings/events APIs don't cover:
 * notification preferences, discovery preferences, saved organisers, reviews
 * and business verification.
 *
 * BACKEND STATUS: the API's `identity`, `notification` and `org` modules are
 * scaffolds only. Until they ship, this service runs a local demo that persists
 * to device storage per user (same approach as `organiserService.ts`). Set
 * EXPO_PUBLIC_USE_PROFILE_API=true to call the proposed endpoints below instead.
 *
 * Screens never call `api` for these features directly, so the endpoint paths
 * and response mapping here are the single integration point.
 */
export const USE_PROFILE_API = process.env.EXPO_PUBLIC_USE_PROFILE_API === "true";

/**
 * Which profile/settings features have a working data source. The UI hides
 * anything set to false instead of rendering a dead control. When the real API
 * is enabled, switch off any feature whose endpoint hasn't shipped yet.
 */
export const PROFILE_FEATURES = {
  notificationPreferences: true,
  discoveryPreferences: true,
  savedOrganisers: true,
  reviews: true,
  businessVerification: true,
  /** No visibility model exists in the API or the app yet. */
  accountVisibility: false,
  /** Chat has no blocking in the approved scope. */
  blockedUsers: false,
  /** The app ships English only; there is no i18n layer. */
  languagePreference: false,
} as const;

export type ProfileFeature = keyof typeof PROFILE_FEATURES;

export interface NotificationPreferences {
  eventRecommendations: boolean;
  categoryUpdates: boolean;
  bookingUpdates: boolean;
  savedOrganiserUpdates: boolean;
  promotional: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  eventRecommendations: true,
  categoryUpdates: true,
  bookingUpdates: true,
  savedOrganiserUpdates: true,
  promotional: false,
};

export interface DiscoveryPreferences {
  /** Event category names, matching `Event.category`. */
  categories: string[];
  location?: string;
}

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = { categories: [] };

/**
 * An organiser the user bookmarked. This is a private bookmark list, not a
 * social follow: it has no counts and the organiser is never notified.
 */
export interface SavedOrganiser {
  id: string;
  name: string;
  type?: "business" | "individual";
  logoUrl?: string;
  location?: string;
  savedAt: string;
}

export interface Review {
  id: string;
  eventId: string;
  eventTitle: string;
  /** Whole stars, 1–5. */
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ReviewInput {
  eventId: string;
  eventTitle: string;
  rating: number;
  comment?: string;
}

/** `unverified` = nothing submitted yet. */
export type BusinessVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface VerificationRequirement {
  id: "phone" | "registration" | "tax_id" | "representative_id";
  label: string;
  description: string;
  completed: boolean;
}

export interface BusinessVerification {
  status: BusinessVerificationStatus;
  requirements: VerificationRequirement[];
  /** Shown when status is `rejected`. */
  rejectionReason?: string;
  submittedAt?: string;
}

export interface BusinessVerificationInput {
  registrationNumber: string;
  taxId: string;
  representativeName: string;
}

export const REVIEW_COMMENT_MAX = 500;

/** Stable id for an organiser while events only carry a display name. */
export function organiserIdFromName(name: string): string {
  return (
    "org_" +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export function validateReview(input: Pick<ReviewInput, "rating" | "comment">): string | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return "Choose a rating from 1 to 5 stars.";
  }
  if ((input.comment?.trim().length ?? 0) > REVIEW_COMMENT_MAX) {
    return `Keep your review under ${REVIEW_COMMENT_MAX} characters.`;
  }
  return null;
}

export function validateBusinessVerification(input: BusinessVerificationInput): string | null {
  if (!input.registrationNumber.trim()) return "Enter your business registration number.";
  if (!/^\d{9}$/.test(input.taxId.trim())) return "Enter your 9-digit TIN.";
  if (input.representativeName.trim().length < 2) return "Enter the name of the authorised representative.";
  return null;
}

export function describeProfileError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// Local demo storage
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "@eventis_profile";
const storageKey = (userId: string, slice: string) => `${STORAGE_PREFIX}:${userId}:${slice}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Keeps demo loading states visible without slowing tests down. */
const DEMO_LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 350;

async function readLocal<T>(userId: string, slice: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(storageKey(userId, slice));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocal<T>(userId: string, slice: string, value: T): Promise<T> {
  await AsyncStorage.setItem(storageKey(userId, slice), JSON.stringify(value));
  return value;
}

function baseRequirements(phoneVerified: boolean): VerificationRequirement[] {
  return [
    {
      id: "phone",
      label: "Verified phone number",
      description: "Confirm the account phone number with a one-time code.",
      completed: phoneVerified,
    },
    {
      id: "registration",
      label: "Business registration",
      description: "Your RDB company registration number.",
      completed: false,
    },
    {
      id: "tax_id",
      label: "Tax identification (TIN)",
      description: "Required before you can sell paid tickets.",
      completed: false,
    },
    {
      id: "representative_id",
      label: "Authorised representative",
      description: "The person allowed to act for the business.",
      completed: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/users/me/notification-preferences -> NotificationPreferences
export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const stored = await readLocal<Partial<NotificationPreferences>>(userId, "notifications", {});
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
  }
  return api.get<NotificationPreferences>("/api/v1/users/me/notification-preferences");
}

// INTEGRATION POINT: PATCH /api/v1/users/me/notification-preferences -> NotificationPreferences
export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await fetchNotificationPreferences(userId);
    return writeLocal(userId, "notifications", { ...current, ...patch });
  }
  return api.patch<NotificationPreferences>("/api/v1/users/me/notification-preferences", patch);
}

// ---------------------------------------------------------------------------
// Discovery preferences
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/users/me/preferences -> DiscoveryPreferences
export async function fetchDiscoveryPreferences(userId: string): Promise<DiscoveryPreferences> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return readLocal(userId, "preferences", DEFAULT_DISCOVERY_PREFERENCES);
  }
  return api.get<DiscoveryPreferences>("/api/v1/users/me/preferences");
}

// INTEGRATION POINT: PUT /api/v1/users/me/preferences -> DiscoveryPreferences
export async function updateDiscoveryPreferences(
  userId: string,
  preferences: DiscoveryPreferences,
): Promise<DiscoveryPreferences> {
  const clean: DiscoveryPreferences = {
    categories: Array.from(new Set(preferences.categories.filter((c) => c && c !== "All"))),
    location: preferences.location?.trim() || undefined,
  };
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return writeLocal(userId, "preferences", clean);
  }
  return api.put<DiscoveryPreferences>("/api/v1/users/me/preferences", clean);
}

// ---------------------------------------------------------------------------
// Saved organisers
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/users/me/saved-organisers -> { organisers: SavedOrganiser[] }
export async function fetchSavedOrganisers(userId: string): Promise<SavedOrganiser[]> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return readLocal<SavedOrganiser[]>(userId, "saved-organisers", []);
  }
  const resp = await api.get<{ organisers: SavedOrganiser[] }>("/api/v1/users/me/saved-organisers");
  return resp.organisers;
}

// INTEGRATION POINT: PUT /api/v1/users/me/saved-organisers/:id -> { organiser: SavedOrganiser }
export async function saveOrganiser(
  userId: string,
  organiser: Omit<SavedOrganiser, "savedAt">,
): Promise<SavedOrganiser> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await readLocal<SavedOrganiser[]>(userId, "saved-organisers", []);
    const existing = current.find((o) => o.id === organiser.id);
    if (existing) return existing;
    const saved: SavedOrganiser = { ...organiser, savedAt: new Date().toISOString() };
    await writeLocal(userId, "saved-organisers", [saved, ...current]);
    return saved;
  }
  const resp = await api.put<{ organiser: SavedOrganiser }>(
    `/api/v1/users/me/saved-organisers/${encodeURIComponent(organiser.id)}`,
    organiser,
  );
  return resp.organiser;
}

// INTEGRATION POINT: DELETE /api/v1/users/me/saved-organisers/:id
export async function removeSavedOrganiser(userId: string, organiserId: string): Promise<void> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await readLocal<SavedOrganiser[]>(userId, "saved-organisers", []);
    await writeLocal(
      userId,
      "saved-organisers",
      current.filter((o) => o.id !== organiserId),
    );
    return;
  }
  await api.delete(`/api/v1/users/me/saved-organisers/${encodeURIComponent(organiserId)}`);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/users/me/reviews -> { reviews: Review[] }
export async function fetchMyReviews(userId: string): Promise<Review[]> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return readLocal<Review[]>(userId, "reviews", []);
  }
  const resp = await api.get<{ reviews: Review[] }>("/api/v1/users/me/reviews");
  return resp.reviews;
}

// INTEGRATION POINT: POST /api/v1/events/:eventId/reviews -> { review: Review }
// One review per user per event: the demo replaces an earlier review of the same event.
export async function submitReview(userId: string, input: ReviewInput): Promise<Review> {
  const problem = validateReview(input);
  if (problem) throw new Error(problem);
  const body = { ...input, comment: input.comment?.trim() || undefined };
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await readLocal<Review[]>(userId, "reviews", []);
    const review: Review = {
      id: current.find((r) => r.eventId === input.eventId)?.id ?? "rev_" + Date.now().toString(36),
      ...body,
      createdAt: new Date().toISOString(),
    };
    await writeLocal(userId, "reviews", [review, ...current.filter((r) => r.eventId !== input.eventId)]);
    return review;
  }
  const resp = await api.post<{ review: Review }>(
    `/api/v1/events/${encodeURIComponent(input.eventId)}/reviews`,
    body,
  );
  return resp.review;
}

// INTEGRATION POINT: DELETE /api/v1/reviews/:id
export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const current = await readLocal<Review[]>(userId, "reviews", []);
    await writeLocal(
      userId,
      "reviews",
      current.filter((r) => r.id !== reviewId),
    );
    return;
  }
  await api.delete(`/api/v1/reviews/${encodeURIComponent(reviewId)}`);
}

// ---------------------------------------------------------------------------
// Business verification
// ---------------------------------------------------------------------------

// INTEGRATION POINT: GET /api/v1/organisations/:id/verification -> BusinessVerification
export async function fetchBusinessVerification(
  userId: string,
  organisationId: string,
  phoneVerified: boolean,
): Promise<BusinessVerification> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const stored = await readLocal<BusinessVerification | null>(userId, `verification:${organisationId}`, null);
    const requirements = (stored?.requirements ?? baseRequirements(phoneVerified)).map((r) =>
      r.id === "phone" ? { ...r, completed: phoneVerified } : r,
    );
    return { status: "unverified", ...stored, requirements };
  }
  return api.get<BusinessVerification>(`/api/v1/organisations/${encodeURIComponent(organisationId)}/verification`);
}

// INTEGRATION POINT: POST /api/v1/organisations/:id/verification -> BusinessVerification
// Document uploads will go through the presigned upload endpoint once it exists.
export async function submitBusinessVerification(
  userId: string,
  organisationId: string,
  phoneVerified: boolean,
  input: BusinessVerificationInput,
): Promise<BusinessVerification> {
  const problem = validateBusinessVerification(input);
  if (problem) throw new Error(problem);
  if (!phoneVerified) throw new Error("Verify your phone number before submitting business verification.");
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const verification: BusinessVerification = {
      status: "pending",
      submittedAt: new Date().toISOString(),
      requirements: baseRequirements(true).map((r) => ({ ...r, completed: true })),
    };
    return writeLocal(userId, `verification:${organisationId}`, verification);
  }
  return api.post<BusinessVerification>(
    `/api/v1/organisations/${encodeURIComponent(organisationId)}/verification`,
    input,
  );
}

/** Removes every locally stored profile slice for a user, e.g. after account deletion. */
export async function clearLocalProfileData(userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const prefix = `${STORAGE_PREFIX}:${userId}:`;
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(prefix)));
}
