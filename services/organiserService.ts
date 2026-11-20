import { api, ApiError } from "@/utils/apiClient";

/**
 * Organiser onboarding: subscription + organisation setup.
 *
 * BACKEND STATUS: without EXPO_PUBLIC_USE_ORGANISER_API=true this service runs
 * a fully local demo (same approach as `utils/eventsService.ts`). With it,
 * fetchSubscriptionPlans() reads the real GET /api/v1/organisations/plans,
 * but buying a plan goes through the manual-payment flow
 * (services/manualPaymentsService.ts, driven from app/organiser/subscribe.tsx)
 * rather than startSubscription() below, since payment review now happens out
 * of band on the backend.
 *
 * Screens talk to this file only (via AuthContext), so the endpoint paths and
 * response mapping here are the single integration point to update once more
 * of the real contracts exist.
 */
export const USE_ORGANISER_API = process.env.EXPO_PUBLIC_USE_ORGANISER_API === "true";

/** RWF has no minor unit (see @eventis/contracts money ADR), so amounts are whole francs. */
export const SUBSCRIPTION_CURRENCY = "RWF";

/**
 * "post" is a one-off pack of event posts that never expires; the rest are
 * time-based subscriptions with unlimited posting while they run.
 */
export type SubscriptionInterval = "post" | "month" | "quarter" | "year";

/** Singular/plural unit for a plan, e.g. "post", "posts", "quarters". */
export function intervalUnit(interval: SubscriptionInterval, count: number = 1): string {
  return count === 1 ? interval : `${interval}s`;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  /** Whole Rwandan francs per single interval (per post for the "post" plan). */
  price: number;
  /** Fixed totals that replace price x duration, e.g. { 2: 4180 } for a two-post pack. */
  bundlePrices?: Record<number, number>;
  interval: SubscriptionInterval;
  features: string[];
  recommended?: boolean;
  durations: number[];
  badge?: string;
  description?: string;
}

export type PaymentMethod = "mtn_momo" | "airtel_money";

export interface OrganiserSubscription {
  id: string;
  planId: string;
  duration?: number;
  status: "active";
  /** Time-based plans only; a post pack has no end date. */
  renewsAt?: string;
  /** Post packs only: how many event posts are still unused. */
  postsRemaining?: number;
}

/** Terminal outcome of a payment attempt. `cancelled` = the payer declined, nothing was charged. */
export type SubscriptionResult =
  | { status: "succeeded"; subscription: OrganiserSubscription }
  | { status: "failed"; message: string }
  | { status: "cancelled" };

export interface OrganisationInput {
  name: string;
  description: string;
  activities: string;
  location: string;
  website?: string;
  /** Local file/data URI picked on device. Uploaded before the organisation is created. */
  logoUri?: string;
}

export interface Organisation {
  id: string;
  name: string;
  description: string;
  activities: string;
  location: string;
  website?: string;
  logoUrl?: string;
  /** Set by the API once verification exists; the profile hides the badge when absent. */
  verificationStatus?: "verified" | "pending" | "rejected";
}

/** Only used by the local demo so failure/cancel screens can be reviewed without a backend. */
export type DemoOutcome = "succeeded" | "failed" | "cancelled";

const DEMO_PLANS: SubscriptionPlan[] = [
  {
    id: "organiser_post",
    name: "Pay per post",
    price: 2180,
    bundlePrices: { 2: 4180 },
    interval: "post",
    description: "Want to post quickly? Post one or two events and you're done. No subscription and no organisation to set up.",
    features: [
      "Pay only for the events you post",
      "Instant event activation",
      "Real-time attendee RSVP & tickets",
      "Live check-in & door QR scan",
    ],
    durations: [1, 2],
    badge: "No commitment",
  },
  {
    id: "organiser_monthly",
    name: "Monthly",
    price: 18000,
    interval: "month",
    description: "Keep posting all month. Ideal for venues, clubs and promoters.",
    features: [
      "Unlimited event listings",
      "Official Verified Organiser badge",
      "Featured placement in Discover",
      "Comprehensive revenue & analytics",
    ],
    durations: [1],
  },
  {
    id: "organiser_quarterly",
    name: "Quarterly",
    price: 48000,
    interval: "quarter",
    description: "Three months of unlimited posting at a lower monthly cost.",
    features: [
      "Unlimited event listings",
      "Official Verified Organiser badge",
      "Top priority discovery & push alerts",
      "Export guest lists & CSV reports",
    ],
    recommended: true,
    durations: [1],
    badge: "Popular",
  },
  {
    id: "organiser_yearly",
    name: "Yearly",
    price: 170000,
    interval: "year",
    description: "A full year of unlimited posting at the best price.",
    features: [
      "Unlimited event listings",
      "Official Verified Organiser badge",
      "Top priority discovery & push alerts",
      "Export guest lists & CSV reports",
      "Dedicated organiser support",
    ],
    durations: [1],
    badge: "Best Value",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The backend's organiser plan interval, mapped to this file's. */
const INTERVAL_FROM_API: Record<string, SubscriptionInterval> = {
  PAY_PER_POST: "post",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
};

function normalizeRemotePlan(value: unknown): SubscriptionPlan | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "");
  const interval = INTERVAL_FROM_API[String(row.interval)];
  if (!id || !interval) return null;
  return {
    id,
    name: String(row.name ?? "Organiser plan"),
    // Despite the field's name, priceMinor is the whole RWF price (e.g. 2180
    // means RWF 2,180), not cents — same convention as FindLove's installment
    // plans (see services/manualPaymentsService.ts's formatMinorAmount).
    price: Number(BigInt(String(row.priceMinor ?? "0"))),
    interval,
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    recommended: Boolean(row.recommended),
    // The real plan has one fixed term; the demo's multi-duration bundles don't apply.
    durations: [1],
    badge: typeof row.badge === "string" && row.badge ? row.badge : undefined,
  };
}

// GET /api/v1/organisations/plans (public) -> { items: OrganiserPlan[] }
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!USE_ORGANISER_API) {
    await wait(500);
    return DEMO_PLANS;
  }
  const reply = await api.get<{ items?: unknown[] }>("/api/v1/organisations/plans");
  return (reply?.items ?? []).map(normalizeRemotePlan).filter((plan): plan is SubscriptionPlan => plan !== null);
}

export interface RemoteOrganiserSubscription {
  id: string;
  planId: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  startsAt: string | null;
  expiresAt: string | null;
  postsRemaining: number | null;
}

function normalizeRemoteSubscription(value: unknown): RemoteOrganiserSubscription | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  const status = ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"].includes(String(row.status))
    ? (row.status as RemoteOrganiserSubscription["status"])
    : "PENDING";
  return {
    id,
    planId: String(row.planId ?? ""),
    status,
    startsAt: typeof row.startsAt === "string" ? row.startsAt : null,
    expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : null,
    postsRemaining: typeof row.postsRemaining === "number" ? row.postsRemaining : null,
  };
}

/**
 * GET /api/v1/me/organiser-subscriptions. Used to pick up a subscription an
 * admin just activated by approving a manual payment out of band (see
 * AuthContext's refreshOrganiserSubscription), not by this file's own
 * startSubscription flow.
 */
export async function fetchMyOrganiserSubscriptions(): Promise<RemoteOrganiserSubscription[]> {
  const reply = await api.get<{ items?: unknown[] }>("/api/v1/me/organiser-subscriptions");
  return (reply?.items ?? []).map(normalizeRemoteSubscription).filter((row): row is RemoteOrganiserSubscription => row !== null);
}

// Superseded by the manual-payment flow (services/manualPaymentsService.ts,
// driven from app/organiser/subscribe.tsx) once EXPO_PUBLIC_USE_ORGANISER_API=true:
// the member picks a payment method, uploads a receipt and an admin approves
// it out of band. This function keeps the OLD mocked, instant-result checkout
// for the local demo (flag off) only; subscribe.tsx never calls it when the flag is on.
export async function startSubscription(
  input: {
    planId: string;
    paymentMethod: PaymentMethod;
    payerPhone: string;
    duration?: number;
  },
  demoOutcome: DemoOutcome = "succeeded",
): Promise<SubscriptionResult> {
  if (!USE_ORGANISER_API) {
    await wait(2200);
    if (demoOutcome === "failed") {
      return { status: "failed", message: "The payment was declined. Check your balance and try again." };
    }
    if (demoOutcome === "cancelled") return { status: "cancelled" };
    const plan = DEMO_PLANS.find((p) => p.id === input.planId);
    const duration = Math.max(1, input.duration ?? 1);
    const subscription: OrganiserSubscription = {
      id: "sub_" + Date.now().toString(36),
      planId: input.planId,
      duration,
      status: "active",
    };
    if (plan?.interval === "post") {
      subscription.postsRemaining = duration;
    } else {
      const renewsAt = new Date();
      if (plan?.interval === "year") renewsAt.setFullYear(renewsAt.getFullYear() + duration);
      else renewsAt.setMonth(renewsAt.getMonth() + duration * (plan?.interval === "quarter" ? 3 : 1));
      subscription.renewsAt = renewsAt.toISOString();
    }
    return { status: "succeeded", subscription };
  }
  throw new Error("Use the manual payment flow (app/organiser/subscribe.tsx) to buy an organiser plan.");
}

// INTEGRATION POINT: logo upload. The contracts expect files to go through a
// presigned upload endpoint and only object keys/URLs to be sent afterwards.
// POST /api/v1/organisations -> { organisation: Organisation }
export async function createOrganisation(
  input: OrganisationInput,
  demoShouldFail = false,
): Promise<Organisation> {
  if (!USE_ORGANISER_API) {
    await wait(1200);
    if (demoShouldFail) throw new Error("We couldn't save your organisation. Please try again.");
    const { logoUri, ...rest } = input;
    return { id: "org_" + Date.now().toString(36), ...rest, logoUrl: logoUri };
  }
  // TODO: upload `input.logoUri` via the presigned upload endpoint once it exists,
  // then send the returned key instead of the local URI.
  const { logoUri: _localLogo, ...body } = input;
  const resp = await api.post<{ organisation: Organisation }>("/api/v1/organisations", body);
  return resp.organisation;
}

// INTEGRATION POINT: PATCH /api/v1/organisations/:id -> { organisation: Organisation }
// Same logo caveat as createOrganisation. Organisers set up before the
// organisation record existed have no id yet, so the demo creates one.
export async function updateOrganisation(
  current: Organisation | undefined,
  input: OrganisationInput,
  demoShouldFail = false,
): Promise<Organisation> {
  if (!USE_ORGANISER_API) {
    await wait(1000);
    if (demoShouldFail) throw new Error("We couldn't save your changes. Please try again.");
    const { logoUri, ...rest } = input;
    return { id: current?.id ?? "org_" + Date.now().toString(36), ...rest, logoUrl: logoUri };
  }
  const { logoUri: _localLogo, ...body } = input;
  if (!current?.id) throw new Error("Choose an organisation before saving changes.");
  const resp = await api.patch<{ organisation: Organisation }>(`/api/v1/organisations/${current.id}`, body);
  return resp.organisation;
}

// INTEGRATION POINT: DELETE /api/v1/organisations/:id removes one organisation.
// The user's personal account and any other organisations remain available.
export async function deleteOrganisation(id: string): Promise<void> {
  if (!USE_ORGANISER_API) {
    await wait(600);
    return;
  }
  await api.delete(`/api/v1/organisations/${id}`);
}

export function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** What a plan costs for `duration` intervals; a bundle price wins over price x duration. */
export function planTotal(plan: Pick<SubscriptionPlan, "price" | "bundlePrices">, duration: number = 1): number {
  const count = Math.max(1, duration);
  return plan.bundlePrices?.[count] ?? plan.price * count;
}

export function formatPlanPrice(
  plan: Pick<SubscriptionPlan, "price" | "interval" | "bundlePrices">,
  duration: number = 1,
): string {
  const total = planTotal(plan, duration);
  if (duration <= 1) {
    return `FRw ${total.toLocaleString("en-US")} / ${plan.interval}`;
  }
  return `FRw ${total.toLocaleString("en-US")} (${duration} ${intervalUnit(plan.interval, duration)})`;
}
