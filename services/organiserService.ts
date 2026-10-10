import { api, ApiError } from "@/utils/apiClient";

/**
 * Organiser onboarding: subscription + organisation setup.
 *
 * BACKEND STATUS: the API's `org` and `payments` modules are scaffolds only and
 * there is no subscription contract yet. Until they ship, this service runs a
 * local demo (same approach as `utils/eventsService.ts`). Set
 * EXPO_PUBLIC_USE_ORGANISER_API=true to call the endpoints below instead.
 *
 * Screens talk to this file only (via AuthContext), so the endpoint paths and
 * response mapping here are the single integration point to update once the
 * real contracts exist.
 */
export const USE_ORGANISER_API = process.env.EXPO_PUBLIC_USE_ORGANISER_API === "true";

/** RWF has no minor unit (see @eventis/contracts money ADR), so amounts are whole francs. */
export const SUBSCRIPTION_CURRENCY = "RWF";

export type SubscriptionInterval = "day" | "week" | "month" | "year";

export interface SubscriptionPlan {
  id: string;
  name: string;
  /** Whole Rwandan francs per single interval. */
  price: number;
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
  renewsAt: string;
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
}

/** Only used by the local demo so failure/cancel screens can be reviewed without a backend. */
export type DemoOutcome = "succeeded" | "failed" | "cancelled";

const DEMO_PLANS: SubscriptionPlan[] = [
  {
    id: "organiser_daily",
    name: "Daily",
    price: 1500,
    interval: "day",
    description: "Ideal for single-day club nights, workshops & pop-ups",
    features: [
      "Instant event activation",
      "Real-time attendee RSVP & tickets",
      "Live check-in & door QR scan",
      "Basic attendance analytics",
    ],
    durations: [1, 3, 7],
    badge: "Flexible",
  },
  {
    id: "organiser_weekly",
    name: "Weekly",
    price: 6000,
    interval: "week",
    description: "Best for weekend fests, tournaments & multi-day expos",
    features: [
      "Multiple event postings",
      "Featured placement in Discover",
      "Direct attendee announcements",
      "Organiser stories & updates",
    ],
    durations: [1, 2, 4],
    badge: "Popular",
  },
  {
    id: "organiser_monthly",
    name: "Monthly",
    price: 18000,
    interval: "month",
    description: "Most loved by venues, clubs, promoters & active brands",
    features: [
      "Unlimited event listings",
      "Official Verified Organiser badge",
      "Top priority discovery & push alerts",
      "Comprehensive revenue & analytics",
      "Export guest lists & CSV reports",
    ],
    recommended: true,
    durations: [1, 3, 6, 12],
    badge: "Best Value",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// INTEGRATION POINT: GET /api/v1/organisers/plans -> SubscriptionPlan[]
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!USE_ORGANISER_API) {
    await wait(500);
    return DEMO_PLANS;
  }
  return api.get<SubscriptionPlan[]>("/api/v1/organisers/plans");
}

// INTEGRATION POINT: POST /api/v1/organisers/subscriptions -> SubscriptionResult
// Mobile money is asynchronous (the payer approves a USSD prompt). If the API
// answers with a pending payment, poll it here until it is terminal so the
// screens keep receiving a final SubscriptionResult.
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
    const renewsAt = new Date();
    const plan = DEMO_PLANS.find((p) => p.id === input.planId);
    const duration = Math.max(1, input.duration ?? 1);
    if (plan?.interval === "day") {
      renewsAt.setDate(renewsAt.getDate() + duration);
    } else if (plan?.interval === "week") {
      renewsAt.setDate(renewsAt.getDate() + duration * 7);
    } else if (plan?.interval === "year") {
      renewsAt.setFullYear(renewsAt.getFullYear() + duration);
    } else {
      renewsAt.setMonth(renewsAt.getMonth() + duration);
    }
    return {
      status: "succeeded",
      subscription: {
        id: "sub_" + Date.now().toString(36),
        planId: input.planId,
        duration,
        status: "active",
        renewsAt: renewsAt.toISOString(),
      },
    };
  }
  try {
    return await api.post<SubscriptionResult>("/api/v1/organisers/subscriptions", input);
  } catch (error) {
    return { status: "failed", message: describeError(error, "We couldn't reach the payment service.") };
  }
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

export function formatPlanPrice(
  plan: Pick<SubscriptionPlan, "price" | "interval">,
  duration: number = 1,
): string {
  const total = plan.price * Math.max(1, duration);
  if (duration <= 1) {
    return `FRw ${total.toLocaleString("en-US")} / ${plan.interval}`;
  }
  const unit = duration > 1 ? `${plan.interval}s` : plan.interval;
  return `FRw ${total.toLocaleString("en-US")} (${duration} ${unit})`;
}
