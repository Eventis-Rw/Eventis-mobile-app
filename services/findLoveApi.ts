import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LoveConnectionStatus, LoveMembership, MyLoveProfileInput } from "@/constants/loveProfiles";
import { api } from "@/utils/apiClient";
import { isAnyAgeRange, LOVE_AGE_RANGE_MAX, LOVE_AGE_RANGE_MIN, type LoveAgeRange } from "@/utils/findLoveAgeRange";
import {
  MAX_AUTOMATIC_ATTEMPTS,
  type AgeVerification,
  type AgeVerificationStatus,
  type IdDocumentType,
} from "@/utils/findLoveAgeVerification";
import type { LoveAccountType, MembershipInterval } from "@/utils/findLoveMembership";
import { appendLocalFile } from "@/utils/formDataFile";
import { LOVE_NEIGHBORHOODS, type LoveGender, type LoveInterestedIn, type LoveRelationshipGoal } from "@/utils/findLoveProfile";

/**
 * Talks to the real FindLove endpoints (Eventis-api, /api/v1/findlove/*) and
 * maps their shapes to the ones the screens already use. findLoveService.ts
 * calls these only when EXPO_PUBLIC_USE_FINDLOVE_API=true.
 *
 * The member's own age-range preference isn't stored by the backend, so it
 * lives in AsyncStorage on this device. Membership is real: it is read from
 * GET /findlove/subscription (see apiFetchFindLoveSubscription), which the
 * server updates once a manual payment (services/manualPaymentsService.ts)
 * is approved.
 */

const BASE = "/api/v1/findlove";

// ---- Enum mapping ----------------------------------------------------------------

const GENDER_TO_API: Record<LoveGender, string> = {
  Man: "MAN",
  Woman: "WOMAN",
  "Prefer not to say": "PREFER_NOT_TO_SAY",
};

const INTERESTED_IN_TO_API: Record<LoveInterestedIn, string> = {
  Man: "MEN",
  Woman: "WOMEN",
  All: "EVERYONE",
};

const GOAL_TO_API: Record<LoveRelationshipGoal, string> = {
  "Long-term relationship": "LONG_TERM",
  Marriage: "MARRIAGE",
  "Something casual": "CASUAL",
  "New friends": "FRIENDSHIP",
  "Still figuring it out": "NOT_SURE",
};

const GOAL_FROM_API: Record<string, LoveRelationshipGoal> = {
  LONG_TERM: "Long-term relationship",
  MARRIAGE: "Marriage",
  CASUAL: "Something casual",
  SHORT_TERM: "Something casual",
  FRIENDSHIP: "New friends",
  NOT_SURE: "Still figuring it out",
};

const VERIFICATION_STATUS_FROM_API: Record<string, AgeVerificationStatus> = {
  PROCESSING: "processing",
  MANUAL_REVIEW: "manual_review",
  VERIFIED: "verified",
  REJECTED: "rejected",
  FAILED: "failed",
};

const DOCUMENT_TO_API: Record<IdDocumentType, string> = {
  national_id: "NATIONAL_ID",
  passport: "PASSPORT",
};

// ---- Uploads -----------------------------------------------------------------------

type UploadPurpose = "AGE_ID" | "LOVE_PHOTO";

function mimeFor(uri: string): { type: string; ext: string } {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return { type: "image/png", ext: "png" };
  if (lower.endsWith(".webp")) return { type: "image/webp", ext: "webp" };
  return { type: "image/jpeg", ext: "jpg" };
}

/** POST /api/v1/uploads (multipart: purpose, file) -> { key, url } */
async function uploadImage(uri: string, purpose: UploadPurpose): Promise<{ key: string; url: string | null }> {
  const form = new FormData();
  form.append("purpose", purpose);
  const { type, ext } = mimeFor(uri);
  const name = `${purpose.toLowerCase()}.${ext}`;
  await appendLocalFile(form, "file", uri, name, type);
  const reply = await api.postForm<{ key?: string; url?: string | null }>("/api/v1/uploads", form);
  if (!reply?.key) throw new Error("The photo upload didn't return a reference. Please try again.");
  if (reply.url) photoKeyByUrl.set(reply.url, reply.key);
  return { key: reply.key, url: reply.url ?? null };
}

/**
 * The screens keep photo URLs; the API wants storage keys. Every URL we've seen
 * from the server is remembered with its key so an unchanged photo is sent back
 * as the same key instead of being uploaded again.
 */
const photoKeyByUrl = new Map<string, string>();

async function toPhotoKeys(photoUrls: string[]): Promise<string[]> {
  const keys: string[] = [];
  for (const url of photoUrls) {
    const known = photoKeyByUrl.get(url);
    if (known) keys.push(known);
    else if (/^https?:\/\//.test(url)) keys.push(url); // Cloudinary keys are their URLs.
    else keys.push((await uploadImage(url, "LOVE_PHOTO")).key);
  }
  return keys;
}

// ---- Local mock: age-range preference (the backend doesn't store it yet) -------------

const LOCAL_EXTRAS_KEY = "@eventis_love_api_local_extras_v1";

interface LocalExtras {
  ageRange?: LoveAgeRange;
}

async function readLocalExtras(): Promise<Record<string, LocalExtras>> {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_EXTRAS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, LocalExtras>) : {};
  } catch {
    return {};
  }
}

async function writeLocalExtras(userId: string, patch: LocalExtras): Promise<void> {
  const all = await readLocalExtras();
  await AsyncStorage.setItem(LOCAL_EXTRAS_KEY, JSON.stringify({ ...all, [userId]: { ...all[userId], ...patch } }));
}

// ---- Membership and installment plans ----------------------------------------------

interface ApiAccountSubscriptionResponse {
  account_type: "private" | "public";
  has_active_subscription: boolean;
  subscription: { account_type: "private" | "public"; expires_at: string } | null;
}

/**
 * GET /findlove/subscription -> the member's real membership. An active
 * subscription wins; otherwise the account's chosen (unpaid) type, Public by
 * default. This is what reload() in MyLoveProfileContext relies on to pick up
 * a membership the moment an admin approves a manual payment.
 */
export async function apiFetchFindLoveSubscription(): Promise<LoveMembership> {
  const reply = await api.get<ApiAccountSubscriptionResponse>(`${BASE}/subscription`);
  if (reply?.has_active_subscription && reply.subscription) {
    return {
      type: reply.subscription.account_type === "private" ? "private" : "public",
      status: "active",
      expiresAt: reply.subscription.expires_at,
    };
  }
  return { type: reply?.account_type === "private" ? "private" : "public", status: "pending_payment" };
}

export interface ApiInstallmentPlan {
  id: string;
  accountType: LoveAccountType;
  interval: MembershipInterval;
  durationDays: number;
  priceMinor: string;
  currency: string;
}

const INTERVAL_TO_API: Record<MembershipInterval, "weekly" | "monthly" | "yearly"> = {
  week: "weekly",
  month: "monthly",
  year: "yearly",
};
const INTERVAL_FROM_API: Record<string, MembershipInterval> = { weekly: "week", monthly: "month", yearly: "year" };

/** GET /installments?account_type=public|private (active only) -> the real, paid plans. */
export async function apiFetchInstallmentPlans(accountType: LoveAccountType): Promise<ApiInstallmentPlan[]> {
  const reply = await api.get<{ items?: Record<string, unknown>[] }>(
    `/api/v1/installments?account_type=${encodeURIComponent(accountType)}`,
  );
  return (reply?.items ?? [])
    .map((row): ApiInstallmentPlan | null => {
      const id = String(row.id ?? "");
      const interval = INTERVAL_FROM_API[String(row.interval)];
      if (!id || !interval) return null;
      return {
        id,
        accountType: row.account_type === "private" ? "private" : "public",
        interval,
        durationDays: Number(row.duration_days ?? 0),
        priceMinor: String(row.price_minor ?? "0"),
        currency: String(row.currency ?? "RWF"),
      };
    })
    .filter((plan): plan is ApiInstallmentPlan => plan !== null);
}

/** The active installment plan for `accountType`/`interval`, or null when none is on offer. */
export async function apiFindInstallmentPlan(
  accountType: LoveAccountType,
  interval: MembershipInterval,
): Promise<ApiInstallmentPlan | null> {
  const plans = await apiFetchInstallmentPlans(accountType);
  const apiInterval = INTERVAL_TO_API[interval];
  return plans.find((plan) => INTERVAL_TO_API[plan.interval] === apiInterval) ?? null;
}

// ---- Age verification -------------------------------------------------------------

/** GET /findlove/age-verification -> latest row, or null when none was sent. */
export async function apiFetchAgeVerification(): Promise<AgeVerification | null> {
  const row = await api.get<Record<string, unknown> | null>(`${BASE}/age-verification`);
  return row ? readVerification(row) : null;
}

function readVerification(row: Record<string, unknown>): AgeVerification {
  const status = VERIFICATION_STATUS_FROM_API[String(row.status)] ?? "not_started";
  const reason = typeof row.rejectionReason === "string" && row.rejectionReason.trim() ? row.rejectionReason.trim() : undefined;
  const dob = typeof row.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth) ? row.dateOfBirth : undefined;
  const updatedAt = String(row.reviewedAt ?? row.submittedAt ?? "") || undefined;
  return {
    status,
    // The backend has no automatic reads to count yet.
    attemptsLeft: MAX_AUTOMATIC_ATTEMPTS,
    ...(reason ? { reason } : {}),
    ...(dob ? { dateOfBirth: dob } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/** Uploads each side privately (AGE_ID), then POST /findlove/age-verification with the keys. */
export async function apiSubmitAgeVerification(input: {
  documentType: IdDocumentType;
  photos: { front?: string; back?: string };
  dateOfBirth: string;
}): Promise<AgeVerification> {
  if (!input.photos.front) throw new Error("Add a photo of your ID first.");
  const front = await uploadImage(input.photos.front, "AGE_ID");
  const back = input.photos.back ? await uploadImage(input.photos.back, "AGE_ID") : null;
  const row = await api.post<Record<string, unknown>>(`${BASE}/age-verification`, {
    documentType: DOCUMENT_TO_API[input.documentType],
    frontKey: front.key,
    backKey: back?.key ?? null,
    dateOfBirth: input.dateOfBirth,
    adultConfirmed: true,
  });
  return readVerification(row);
}

// ---- Own profile -------------------------------------------------------------------

type ApiPhoto = { key?: string; url?: string | null; position?: number; isPrimary?: boolean };

function photoUrlsOf(row: Record<string, unknown>): string[] {
  const photos = Array.isArray(row.photos) ? (row.photos as ApiPhoto[]) : [];
  return [...photos]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.position ?? 0) - (b.position ?? 0))
    .map((photo) => {
      const url = photo.url ?? photo.key ?? "";
      if (url && photo.key) photoKeyByUrl.set(url, photo.key);
      return url;
    })
    .filter(Boolean);
}

/**
 * GET /findlove/profile -> the API row reshaped for normalizeMyLoveProfile, with
 * the locally mocked membership and age range attached. null when no profile yet.
 */
export async function apiFetchMyProfile(userId: string): Promise<Record<string, unknown> | null> {
  const row = await api.get<Record<string, unknown> | null>(`${BASE}/profile`);
  return row ? withLocalExtras(userId, row) : null;
}

async function withLocalExtras(userId: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const local = (await readLocalExtras())[userId] ?? {};
  // Membership is never mocked: it comes straight from the server so an
  // admin's approval of a manual payment shows up on the next reload().
  const membership = await apiFetchFindLoveSubscription().catch(
    (): LoveMembership => ({ type: "public", status: "pending_payment" }),
  );
  return {
    ...row,
    photoUrls: photoUrlsOf(row),
    relationshipGoal: GOAL_FROM_API[String(row.relationshipGoal)] ?? undefined,
    membership,
    ageRange: local.ageRange,
    updatedAt: row.lastActiveAt ?? row.createdAt,
  };
}

/** Create: POST /findlove/profile. Update: PATCH /findlove/profile + PUT /findlove/profile/photos. */
export async function apiSaveMyProfile(userId: string, input: MyLoveProfileInput, isNew: boolean): Promise<Record<string, unknown>> {
  const photoKeys = await toPhotoKeys(input.photoUrls);
  const city = LOVE_NEIGHBORHOODS.find((n) => n.name === input.neighborhood)?.city;
  const fields = {
    gender: GENDER_TO_API[input.gender],
    interestedIn: INTERESTED_IN_TO_API[input.interestedIn],
    dateOfBirth: input.dateOfBirth,
    country: input.country,
    ...(city ? { city } : {}),
    ...(input.neighborhood ? { neighborhood: input.neighborhood } : {}),
    bio: input.bio?.trim() || null,
    interests: [...new Set(input.interests ?? [])],
    relationshipGoal: input.relationshipGoal ? GOAL_TO_API[input.relationshipGoal] : null,
    lookingFor: input.lookingFor?.trim() || null,
  };

  let row: Record<string, unknown>;
  if (isNew) {
    row = await api.post<Record<string, unknown>>(`${BASE}/profile`, { username: input.username, ...fields, photoKeys });
  } else {
    await api.patch<Record<string, unknown>>(`${BASE}/profile`, fields);
    row = await api.put<Record<string, unknown>>(`${BASE}/profile/photos`, { photoKeys });
  }

  // Not stored by the backend yet: kept on this device.
  const ageRange = isAnyAgeRange(input.ageRange) ? undefined : input.ageRange;
  await writeLocalExtras(userId, { ageRange });
  return withLocalExtras(userId, row);
}

// ---- Discover and connections ------------------------------------------------------

function toLooseProfile(row: Record<string, unknown>): Record<string, unknown> {
  const [imageUrl = "", ...postImageUrls] = photoUrlsOf(row);
  return {
    ...row,
    name: row.username,
    occupation: row.occupation ?? "",
    relationshipGoal: GOAL_FROM_API[String(row.relationshipGoal)] ?? undefined,
    imageUrl,
    postImageUrls,
    neighborhood: row.neighborhood || undefined,
    // Only verified members can create a profile.
    verified: true,
    accountType: "public",
  };
}

/** GET /findlove/discover -> rows ready for normalizeLoveProfile. */
export async function apiDiscover(country: string | undefined, range?: LoveAgeRange): Promise<Record<string, unknown>[]> {
  const params = ["page=1", "limit=100"];
  if (country) params.push(`country=${encodeURIComponent(country)}`);
  if (range && !isAnyAgeRange(range)) {
    if (range.min > LOVE_AGE_RANGE_MIN) params.push(`minAge=${range.min}`);
    if (range.max < LOVE_AGE_RANGE_MAX) params.push(`maxAge=${range.max}`);
  }
  const reply = await api.get<{ items?: Record<string, unknown>[] }>(`${BASE}/discover?${params.join("&")}`);
  return (reply?.items ?? []).map(toLooseProfile);
}

type ApiConnection = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REMOVED";
  direction: "incoming" | "outgoing";
  message?: string | null;
  otherProfile?: Record<string, unknown> | null;
};

/** Profile id -> the connection with them, so accept/decline can find its id. */
const connectionByProfileId = new Map<string, ApiConnection>();

function statusOf(connection: ApiConnection): LoveConnectionStatus {
  if (connection.status === "ACCEPTED") return "connected";
  if (connection.status !== "PENDING") return "none";
  return connection.direction === "incoming" ? "received" : "pending";
}

/**
 * GET /findlove/connections for all three directions, as loose profile rows
 * carrying connectionStatus (and requestMessage for incoming requests).
 */
export async function apiConnections(): Promise<Record<string, unknown>[]> {
  const directions = ["incoming", "outgoing", "accepted"] as const;
  const replies = await Promise.all(
    directions.map((direction) => api.get<{ items?: ApiConnection[] }>(`${BASE}/connections?direction=${direction}`)),
  );
  connectionByProfileId.clear();
  const rows: Record<string, unknown>[] = [];
  for (const connection of replies.flatMap((reply) => reply?.items ?? [])) {
    const other = connection.otherProfile;
    if (!other?.id) continue;
    connectionByProfileId.set(String(other.id), connection);
    rows.push({
      ...toLooseProfile(other),
      connectionStatus: statusOf(connection),
      requestMessage: connection.direction === "incoming" ? connection.message ?? undefined : undefined,
    });
  }
  return rows;
}

/** POST /findlove/connections, or accepts their request when they asked first. */
export async function apiRequestConnection(profileId: string, message?: string): Promise<LoveConnectionStatus> {
  const existing = connectionByProfileId.get(profileId);
  if (existing && statusOf(existing) === "received") return apiRespondToConnection(profileId, true);
  const reply = await api.post<{ connection?: ApiConnection }>(`${BASE}/connections`, {
    profileId,
    ...(message ? { message } : {}),
  });
  if (reply?.connection) connectionByProfileId.set(profileId, reply.connection);
  return reply?.connection ? statusOf(reply.connection) : "pending";
}

/** PATCH /findlove/connections/:id { status: ACCEPTED | DECLINED } */
export async function apiRespondToConnection(profileId: string, accept: boolean): Promise<LoveConnectionStatus> {
  const existing = connectionByProfileId.get(profileId);
  if (!existing) throw new Error("That request is no longer waiting. Pull to refresh.");
  const reply = await api.patch<{ connection?: ApiConnection }>(`${BASE}/connections/${encodeURIComponent(existing.id)}`, {
    status: accept ? "ACCEPTED" : "DECLINED",
  });
  if (reply?.connection) connectionByProfileId.set(profileId, reply.connection);
  return reply?.connection ? statusOf(reply.connection) : accept ? "connected" : "none";
}

// ---- Chats ---------------------------------------------------------------------

/** A chat message as the screens use it (utils/findLoveChat LoveChatMessage, text only). */
export type ApiLoveChatMessage = {
  id: string;
  clientMessageId?: string | null;
  kind: "text";
  text: string;
  own: boolean;
  sentAt: string;
};

export type ApiLoveChatSummary = {
  profileId: string;
  connectionStatus: "PENDING" | "ACCEPTED";
  pendingMessages?: ApiLoveChatMessage[];
  lastMessage: ApiLoveChatMessage | null;
  unreadCount: number;
  readAt: string | null;
  updatedAt: string;
};

/** GET /findlove/chats -> one row per chat, with the unread count for the badge. */
export async function apiListChats(): Promise<ApiLoveChatSummary[]> {
  const reply = await api.get<{ items?: ApiLoveChatSummary[] }>(`${BASE}/chats`);
  return reply?.items ?? [];
}

/** GET /findlove/chats/:profileId/messages -> the newest page, oldest first. */
export async function apiChatMessages(
  profileId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{ items: ApiLoveChatMessage[]; canSend: boolean; otherReadAt: string | null; hasMore: boolean }> {
  const params = [`limit=${options.limit ?? 50}`];
  if (options.before) params.push(`before=${encodeURIComponent(options.before)}`);
  const reply = await api.get<{
    items?: ApiLoveChatMessage[];
    canSend?: boolean;
    otherReadAt?: string | null;
    hasMore?: boolean;
  }>(`${BASE}/chats/${encodeURIComponent(profileId)}/messages?${params.join("&")}`);
  return {
    items: reply?.items ?? [],
    canSend: reply?.canSend ?? true,
    otherReadAt: reply?.otherReadAt ?? null,
    hasMore: reply?.hasMore ?? false,
  };
}

/** POST /findlove/chats/:profileId/messages. clientMessageId makes retries safe. */
export async function apiSendChatMessage(profileId: string, text: string, clientMessageId: string): Promise<ApiLoveChatMessage> {
  const reply = await api.post<{ message?: ApiLoveChatMessage }>(`${BASE}/chats/${encodeURIComponent(profileId)}/messages`, {
    text,
    clientMessageId,
  });
  if (!reply?.message) throw new Error("FindLove sent back an unexpected reply. Pull to refresh.");
  return reply.message;
}

/** POST /findlove/chats/:profileId/read */
export async function apiMarkChatRead(profileId: string): Promise<string> {
  const reply = await api.post<{ readAt?: string }>(`${BASE}/chats/${encodeURIComponent(profileId)}/read`, {});
  return reply?.readAt ?? new Date().toISOString();
}

// ---- Notifications -----------------------------------------------------------------

/** A FindLove notification as GET /findlove/notifications returns it. */
export type ApiLoveNotification = {
  id: string;
  type: string;
  /** What the app shows an icon for: a request to answer, or connection news. */
  kind: "request" | "connection";
  title: string;
  body: string;
  /** The other member's FindLove profile, for opening their chat. */
  profileId: string | null;
  /** Which Inbox tab a request opens. */
  tab: "received" | "sent" | null;
  readAt: string | null;
  createdAt: string;
};

/** GET /findlove/notifications -> newest first, with the unread count for the bell. */
export async function apiListNotifications(limit = 50): Promise<{ items: ApiLoveNotification[]; unreadCount: number }> {
  const reply = await api.get<{ items?: ApiLoveNotification[]; unreadCount?: number }>(`${BASE}/notifications?page=1&limit=${limit}`);
  const items = reply?.items ?? [];
  return { items, unreadCount: reply?.unreadCount ?? items.filter((item) => !item.readAt).length };
}

/** POST /findlove/notifications/:id/read */
export async function apiMarkNotificationRead(id: string): Promise<void> {
  await api.post(`${BASE}/notifications/${encodeURIComponent(id)}/read`, {});
}

/** POST /findlove/notifications/read-all */
export async function apiMarkAllNotificationsRead(): Promise<void> {
  await api.post(`${BASE}/notifications/read-all`, {});
}
