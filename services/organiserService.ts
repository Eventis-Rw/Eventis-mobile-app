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

export interface SubscriptionPlan {
  id: string;
  name: string;
  /** Whole Rwandan francs. */
  price: number;
  interval: "month" | "year";
  features: string[];
  recommended?: boolean;
}

export type PaymentMethod = "mtn_momo" | "airtel_money";

export interface OrganiserSubscription {
  id: string;
  planId: string;
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
    id: "organiser_monthly",
    name: "Monthly",
    price: 15000,
    interval: "month",
    features: ["Unlimited event posts", "Organiser stories", "Booking insights"],
  },
  {
    id: "organiser_yearly",
    name: "Yearly",
    price: 150000,
    interval: "year",
    features: ["Everything in Monthly", "Two months free", "Priority listing review"],
    recommended: true,
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
  input: { planId: string; paymentMethod: PaymentMethod; payerPhone: string },
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
    renewsAt.setMonth(renewsAt.getMonth() + (plan?.interval === "year" ? 12 : 1));
    return {
      status: "succeeded",
      subscription: {
        id: "sub_" + Date.now().toString(36),
        planId: input.planId,
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
// POST /api/v1/organisers/me/organisation -> { organisation: Organisation }
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
  const resp = await api.post<{ organisation: Organisation }>("/api/v1/organisers/me/organisation", body);
  return resp.organisation;
}

export function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function formatPlanPrice(plan: Pick<SubscriptionPlan, "price" | "interval">): string {
  return `FRw ${plan.price.toLocaleString("en-US")} / ${plan.interval}`;
}
