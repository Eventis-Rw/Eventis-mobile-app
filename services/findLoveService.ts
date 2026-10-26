import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import {
  DEMO_LAST_ACTIVE_MINUTES,
  MOCK_LOVE_PROFILES,
  type LoveConnectionStatus,
  type LoveGender,
  type LoveProfile,
  type MyLoveProfile,
  type MyLoveProfileInput,
} from "@/constants/loveProfiles";
import { api, ApiError } from "@/utils/apiClient";
import {
  afterFailedRead,
  AGE_VERIFICATION_NOT_STARTED,
  canSubmitAgeVerification,
  missingSides,
  normalizeAgeVerification,
  type AgeVerification,
  type IdDocumentType,
  type IdSide,
} from "@/utils/findLoveAgeVerification";
import {
  activeAccountType,
  canConnect,
  normalizeMembership,
  PRIVATE_MEMBERSHIP_PLAN,
  PUBLIC_MEMBERSHIP,
  type LoveAccountType,
  type LoveMembership,
} from "@/utils/findLoveMembership";
import {
  FREE_LOVE_PHOTO_LIMIT,
  isAdult,
  MIN_LOVE_AGE,
  normalizeLoveUsername,
  validateLoveBio,
  validateLoveCountry,
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
const DEMO_AGE_VERIFICATION_KEY = "@eventis_love_demo_age_verification_v1";

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

/**
 * Another member's account type. A membership object wins (checked for status
 * and expiry); otherwise the server's accountType. Unknown means Public.
 */
function readAccountType(source: Record<string, unknown>): LoveAccountType {
  if (source.membership && typeof source.membership === "object") return activeAccountType(normalizeMembership(source.membership));
  return source.accountType === "private" || source.visibility === "private" ? "private" : "public";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Two-letter country code, uppercased; anything else is treated as unknown. */
function optionalCountry(value: unknown): string | undefined {
  const code = optionalString(value)?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : undefined;
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
    country: optionalCountry(source.country ?? source.countryCode),
    occupation: String(source.occupation ?? source.jobTitle ?? "Eventis member"),
    bio: String(source.bio ?? source.about ?? ""),
    interests: Array.isArray(source.interests) ? source.interests.map(String) : [],
    imageUrl: String(source.imageUrl ?? source.profileImage ?? source.avatarUrl ?? ""),
    postImageUrls: readPostImages(source.postImageUrls ?? source.posts),
    accountType: readAccountType(source),
    isOnline: Boolean(source.isOnline ?? source.online ?? false),
    lastActiveAt: optionalString(source.lastActiveAt),
    neighborhood: optionalString(source.neighborhood ?? source.neighbourhood),
    active: Boolean(source.active ?? source.isActive ?? true),
    eligible: Boolean(source.eligible ?? source.isEligible ?? true),
    verified: Boolean(source.verified ?? source.isVerified ?? false),
    connectionStatus: normalizeConnectionStatus(source.connectionStatus),
  };
}

/** Accepts plain URLs or post objects ({ imageUrl } / { url }). */
function readPostImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((post) => (typeof post === "string" ? post : post && typeof post === "object" ? (post as Record<string, unknown>).imageUrl ?? (post as Record<string, unknown>).url : ""))
    .filter((url): url is string => typeof url === "string" && url.length > 0);
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

// INTEGRATION POINT: GET /api/v1/love-profiles?country=RW -> LoveProfile[] | { profiles: LoveProfile[] }
// The server must only return members from the requested country (the caller's
// own); LoveProfilesContext filters again so a missed filter can't leak others.
// connectionStatus on each row is the caller's status with that member.
// lastActiveAt drives presence (utils/findLoveDiscovery.ts). accountType is the
// member's ACTUAL type (active membership), so badges never show an unpaid Private.
export async function fetchLoveProfiles(country?: string): Promise<LoveProfile[]> {
  if (!USE_FINDLOVE_API) {
    await wait(400);
    const requested = new Set(await readDemoRequests());
    const now = Date.now();
    const rows = country ? MOCK_LOVE_PROFILES.filter((profile) => profile.country === country) : MOCK_LOVE_PROFILES;
    return rows.map((profile) => {
      const minutes = DEMO_LAST_ACTIVE_MINUTES[profile.id];
      return {
        ...profile,
        lastActiveAt: minutes === undefined ? profile.lastActiveAt : new Date(now - minutes * 60000).toISOString(),
        connectionStatus:
          requested.has(profile.id) && (profile.connectionStatus ?? "none") === "none" ? "pending" : profile.connectionStatus,
      };
    });
  }
  const path = country ? `/api/v1/love-profiles?country=${encodeURIComponent(country)}` : "/api/v1/love-profiles";
  const response = await withTimeout(api.get<unknown>(path), PROFILES_TIMEOUT_MS);
  return readLoveProfilesResponse(response);
}

/** The member needs an active Private membership to connect with this person. */
export class MembershipRequiredError extends Error {
  constructor(message = "Connecting with Private members needs a Private membership.") {
    super(message);
    this.name = "MembershipRequiredError";
  }
}

// INTEGRATION POINT: POST /api/v1/love-profiles/:id/connections -> { connectionStatus }
// Returns the status the server recorded. Throws if the request was not saved.
// The server MUST check membership (canConnect in utils/findLoveMembership.ts)
// and answer 403 when the caller needs Private; that becomes MembershipRequiredError.
export async function requestLoveConnection(profileId: string, userId?: string): Promise<LoveConnectionStatus> {
  if (!USE_FINDLOVE_API) {
    await wait(300);
    // Play the server's part: check membership before saving the request.
    const target = MOCK_LOVE_PROFILES.find((profile) => profile.id === profileId);
    const me = userId ? normalizeMyLoveProfile((await readDemoMyProfiles())[userId]) : null;
    if (target && !canConnect(activeAccountType(me?.membership), target.accountType).allowed) {
      throw new MembershipRequiredError();
    }
    const requested = await readDemoRequests();
    if (!requested.includes(profileId)) {
      await AsyncStorage.setItem(DEMO_REQUESTS_KEY, JSON.stringify([...requested, profileId]));
    }
    return "pending";
  }
  let response: { connectionStatus?: unknown } | undefined;
  try {
    response = await api.post<{ connectionStatus?: unknown } | undefined>(
      `/api/v1/love-profiles/${encodeURIComponent(profileId)}/connections`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) throw new MembershipRequiredError(err.message || undefined);
    throw err;
  }
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
      | "country"
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
  const countryError = validateLoveCountry(input.country);
  if (countryError) throw new LoveProfileInputError("country", countryError);
  // Photos are optional; members can add them later from Edit profile.
  if (input.photoUrls.length > FREE_LOVE_PHOTO_LIMIT) {
    throw new LoveProfileInputError("photoUrls", `You can add up to ${FREE_LOVE_PHOTO_LIMIT} photos.`);
  }
  const bioError = validateLoveBio(input.bio);
  if (bioError) throw new LoveProfileInputError("bio", bioError);
  const interestsError = validateLoveInterests(input.interests ?? []);
  if (interestsError) throw new LoveProfileInputError("interests", interestsError);
  const neighborhoodError = validateLoveNeighborhood(input.neighborhood, input.country);
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
    membership: normalizeMembership(source.membership),
    photoUrls: photos.map(String).filter(Boolean).slice(0, FREE_LOVE_PHOTO_LIMIT),
    country: optionalCountry(source.country ?? source.countryCode),
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
// The server must check username format and uniqueness (409 when taken), refuse
// members whose ID isn't verified, and store the date of birth read from the ID
// rather than the one sent here.
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
    // The profile form never changes membership. Choosing Private only starts
    // it as "pending_payment" until payment is confirmed.
    const existing = all[userId] ? normalizeMembership(all[userId].membership) : null;
    const membership: LoveMembership =
      existing ?? (input.accountType === "private" ? { type: "private", status: "pending_payment" } : PUBLIC_MEMBERSHIP);
    const saved: MyLoveProfile = {
      username,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      membership,
      photoUrls: input.photoUrls,
      country: input.country,
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
    photoUrls: input.photoUrls,
    country: input.country,
    ...cleanExtras(input),
    ...(isNew ? { confirmedAdult: true, accountType: input.accountType ?? "public" } : {}),
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
// ---- Private membership checkout ---------------------------------------------

export type LovePaymentMethod = "mtn_momo" | "airtel_money";

/** Only used by the local demo so failure and cancel screens can be reviewed. */
export type LoveDemoOutcome = "succeeded" | "failed" | "cancelled";

export type LoveCheckoutResult =
  | { status: "succeeded" }
  /** Not confirmed yet; Private turns on once the server confirms the payment. */
  | { status: "pending" }
  | { status: "failed"; message: string }
  | { status: "cancelled" };

const PAYMENT_POLL_MS = 3000;
const PAYMENT_POLL_LIMIT_MS = 2 * 60 * 1000;

function readPayment(value: unknown): { paymentId: string; status: string; message?: string } {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    paymentId: String(source.paymentId ?? source.id ?? ""),
    status: String(source.status ?? "pending"),
    message: optionalString(source.message),
  };
}

// INTEGRATION POINT:
//   POST /api/v1/love-profiles/me/membership/checkout { planId, paymentMethod, payerPhone }
//     -> { paymentId, status }
//   GET  /api/v1/love-profiles/me/membership/payments/:paymentId
//     -> { status: "pending" | "succeeded" | "failed" | "cancelled", message? }
// Mobile money is asynchronous (the payer approves a USSD prompt), so the
// payment is polled until it is final. The server activates Private only once
// the payment provider confirms; callers then reload the profile to read the
// membership rather than trusting this result.
export async function buyPrivateMembership(
  userId: string,
  input: { paymentMethod: LovePaymentMethod; payerPhone: string },
  demoOutcome: LoveDemoOutcome = "succeeded",
): Promise<LoveCheckoutResult> {
  if (!USE_FINDLOVE_API) {
    await wait(2200);
    if (demoOutcome === "failed") {
      return { status: "failed", message: "The payment was declined. Check your balance and try again." };
    }
    if (demoOutcome === "cancelled") return { status: "cancelled" };
    const all = await readDemoMyProfiles();
    if (!all[userId]) return { status: "failed", message: "Create your FindLove profile first." };
    const expiresAt = new Date(Date.now() + PRIVATE_MEMBERSHIP_PLAN.periodDays * 24 * 60 * 60 * 1000).toISOString();
    const updated: MyLoveProfile = { ...all[userId], membership: { type: "private", status: "active", expiresAt } };
    await AsyncStorage.setItem(DEMO_MY_PROFILE_KEY, JSON.stringify({ ...all, [userId]: updated }));
    return { status: "succeeded" };
  }

  let payment = readPayment(
    await api.post<unknown>("/api/v1/love-profiles/me/membership/checkout", { planId: PRIVATE_MEMBERSHIP_PLAN.id, ...input }),
  );
  const { paymentId } = payment;
  const startedAt = Date.now();
  // The checkout reply may already be final; otherwise poll until it is.
  while (payment.status === "pending" && paymentId) {
    if (Date.now() - startedAt >= PAYMENT_POLL_LIMIT_MS) return { status: "pending" };
    await wait(PAYMENT_POLL_MS);
    payment = readPayment(
      await api.get<unknown>(`/api/v1/love-profiles/me/membership/payments/${encodeURIComponent(paymentId)}`),
    );
  }
  if (payment.status === "succeeded") return { status: "succeeded" };
  if (payment.status === "cancelled") return { status: "cancelled" };
  if (payment.status === "pending") return { status: "pending" };
  return { status: "failed", message: payment.message ?? "The payment did not go through. Please try again." };
}

// ---- ID age check --------------------------------------------------------------

/** Only used by the local demo so every result screen can be reviewed. */
export type LoveDemoVerificationOutcome = "verified" | "unreadable" | "manual_review" | "rejected";

export interface AgeVerificationInput {
  documentType: IdDocumentType;
  /** Local photo URIs, one per side the document needs. */
  photos: Partial<Record<IdSide, string>>;
  /** The member ticked "I'm 18 or older and this is my own ID". */
  confirmedAdult: boolean;
}

const AGE_VERIFICATION_PATH = "/api/v1/users/me/age-verification";

/** Demo date of birth "read" from the ID: 25 years ago today. */
function demoDateOfBirth(now: Date): string {
  const dob = new Date(now);
  dob.setFullYear(now.getFullYear() - 25);
  return dob.toISOString().slice(0, 10);
}

const VERIFICATION_POLL_MS = 3000;
const VERIFICATION_POLL_LIMIT_MS = 60 * 1000;

async function readDemoVerifications(): Promise<Record<string, AgeVerification>> {
  try {
    const stored = await AsyncStorage.getItem(DEMO_AGE_VERIFICATION_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, AgeVerification>) : {};
  } catch {
    return {};
  }
}

async function writeDemoVerification(userId: string, verification: AgeVerification): Promise<void> {
  const all = await readDemoVerifications();
  await AsyncStorage.setItem(DEMO_AGE_VERIFICATION_KEY, JSON.stringify({ ...all, [userId]: verification }));
}

// INTEGRATION POINT: GET /api/v1/users/me/age-verification
//   -> { status, attemptsLeft, reason?, dateOfBirth?, updatedAt? }; 404 when nothing was sent yet.
// Belongs to the Eventis account: it's checked before a FindLove profile exists.
export async function fetchAgeVerification(userId: string): Promise<AgeVerification> {
  if (!USE_FINDLOVE_API) {
    await wait(150);
    const stored = (await readDemoVerifications())[userId];
    return stored ? normalizeAgeVerification(stored) : AGE_VERIFICATION_NOT_STARTED;
  }
  try {
    return normalizeAgeVerification(
      await withTimeout(api.get<unknown>(AGE_VERIFICATION_PATH), PROFILES_TIMEOUT_MS),
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return AGE_VERIFICATION_NOT_STARTED;
    throw err;
  }
}

/** A photo as a multipart part: a file reference on native, a Blob on web. */
async function appendPhoto(form: FormData, field: string, uri: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, `${field}.jpg`);
  } else {
    form.append(field, { uri, name: `${field}.jpg`, type: "image/jpeg" } as unknown as Blob);
  }
}

// INTEGRATION POINT:
//   POST /api/v1/users/me/age-verification  multipart: documentType, confirmedAdult, front, back?
//     -> { status, attemptsLeft, reason?, dateOfBirth? }
// The server stores the photos securely, reads them (OCR), rejects anyone under
// 18, counts failed reads and moves the case to manual review after the last
// one. Once verified, the date of birth read from the ID is the one the profile
// uses. The server must also refuse FindLove requests (including creating a
// profile) from members who aren't verified; the app's gate is only for the UI.
// A "processing" reply is polled for up to a minute, then returned as is.
export async function submitAgeVerification(
  userId: string,
  input: AgeVerificationInput,
  demoOutcome: LoveDemoVerificationOutcome = "verified",
): Promise<AgeVerification> {
  if (missingSides(input.documentType, input.photos).length) {
    throw new Error("Add a photo of every side of your ID first.");
  }
  if (!input.confirmedAdult) throw new Error("Confirm that you are 18 or older and that this is your own ID.");

  if (!USE_FINDLOVE_API) {
    await wait(2500);
    const current = await fetchAgeVerification(userId);
    if (!canSubmitAgeVerification(current)) return current;
    const now = new Date();
    const next: AgeVerification =
      demoOutcome === "verified"
        ? { status: "verified", attemptsLeft: current.attemptsLeft, dateOfBirth: demoDateOfBirth(now), updatedAt: now.toISOString() }
        : demoOutcome === "rejected"
          ? {
              status: "rejected",
              attemptsLeft: current.attemptsLeft,
              reason: "The date of birth on your ID shows you are under 18.",
              updatedAt: now.toISOString(),
            }
          : demoOutcome === "manual_review"
            ? { status: "manual_review", attemptsLeft: current.attemptsLeft, updatedAt: now.toISOString() }
            : afterFailedRead(current, "We couldn't read your ID. Make sure the whole card is in the photo, in focus and without glare.", now);
    await writeDemoVerification(userId, next);
    return next;
  }

  const form = new FormData();
  form.append("documentType", input.documentType);
  form.append("confirmedAdult", "true");
  for (const [side, uri] of Object.entries(input.photos)) {
    if (uri) await appendPhoto(form, side, uri);
  }
  let verification = normalizeAgeVerification(await api.postForm<unknown>(AGE_VERIFICATION_PATH, form));
  const startedAt = Date.now();
  while (verification.status === "processing" && Date.now() - startedAt < VERIFICATION_POLL_LIMIT_MS) {
    await wait(VERIFICATION_POLL_MS);
    verification = await fetchAgeVerification(userId);
  }
  return verification;
}

/** Demo only: forget this account's ID check so every step can be tried again. */
export async function resetDemoAgeVerification(userId: string): Promise<void> {
  if (USE_FINDLOVE_API) return;
  const all = await readDemoVerifications();
  delete all[userId];
  await AsyncStorage.setItem(DEMO_AGE_VERIFICATION_KEY, JSON.stringify(all));
}
