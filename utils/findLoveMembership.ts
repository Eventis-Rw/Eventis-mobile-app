/**
 * FindLove membership: Public and Private accounts, both paid subscriptions,
 * and what each may do. No React or storage imports, so screens, contexts, the
 * service and the tests share one definition.
 *
 * The server is the authority. It decides a member's membership (only after
 * confirmed payment) and must reject what these rules forbid. The app applies
 * the same rules so people get a plan screen or an upgrade prompt instead of an error.
 */

export type LoveAccountType = "public" | "private";

/**
 * - active: paid; privileges apply until expiresAt.
 * - pending_payment: chose a plan, payment not confirmed yet. No access.
 * - expired: the paid period ended. No access until renewed.
 */
export type LoveMembershipStatus = "active" | "pending_payment" | "expired";

export interface LoveMembership {
  type: LoveAccountType;
  status: LoveMembershipStatus;
  /** ISO timestamp. Privileges end at this moment. */
  expiresAt?: string;
}

/** A member who hasn't paid for any plan yet. Public until they choose otherwise. */
export const UNPAID_MEMBERSHIP: LoveMembership = { type: "public", status: "pending_payment" };

export type MembershipInterval = "week" | "month" | "year";

/** Both account types offer the same periods; only the price differs. */
export const MEMBERSHIP_INTERVALS: { id: MembershipInterval; label: string; periodLabel: string; periodDays: number }[] = [
  { id: "week", label: "Weekly", periodLabel: "week", periodDays: 7 },
  { id: "month", label: "Monthly", periodLabel: "month", periodDays: 30 },
  { id: "year", label: "Yearly", periodLabel: "year", periodDays: 365 },
];

/**
 * PLACEHOLDER prices in RWF until the team confirms them. The real price comes
 * from the server at checkout; this only drives the screens.
 */
const MEMBERSHIP_PRICES: Record<LoveAccountType, Record<MembershipInterval, number>> = {
  public: { week: 499, month: 999, year: 9999 },
  private: { week: 999, month: 2499, year: 24999 },
};

export const MEMBERSHIP_BENEFITS: Record<LoveAccountType, readonly string[]> = {
  public: ["Discover every member, Public and Private", "Connect and chat with Public members", "PUBLIC badge on your profile"],
  private: [
    "Discover every member, Public and Private",
    "Connect with Private members",
    "Connect with Public members too",
    "PRIVATE badge on your profile",
  ],
};

export interface MembershipPlan {
  /** Sent to checkout as planId, e.g. "findlove_private_month". */
  id: string;
  type: LoveAccountType;
  interval: MembershipInterval;
  price: number;
  periodDays: number;
  /** "week", "month" or "year", for "RWF 999 / week". */
  periodLabel: string;
}

export function membershipPlan(type: LoveAccountType, interval: MembershipInterval): MembershipPlan {
  const period = MEMBERSHIP_INTERVALS.find((i) => i.id === interval) ?? MEMBERSHIP_INTERVALS[1];
  return {
    id: `findlove_${type}_${period.id}`,
    type,
    interval: period.id,
    price: MEMBERSHIP_PRICES[type][period.id],
    periodDays: period.periodDays,
    periodLabel: period.periodLabel,
  };
}

/** The cheapest way in, e.g. "RWF 999 / week" for the "from" line on upgrade prompts. */
export function cheapestPlan(type: LoveAccountType): MembershipPlan {
  return membershipPlan(type, MEMBERSHIP_INTERVALS[0].id);
}

export function formatMembershipPrice(price: number): string {
  return `RWF ${price.toLocaleString("en-US")}`;
}

/** Paid and not yet expired, for either account type. Without this FindLove stays closed. */
export function hasActiveMembership(membership: LoveMembership | undefined, now: number = Date.now()): boolean {
  if (!membership || membership.status !== "active") return false;
  if (membership.expiresAt) {
    const ends = Date.parse(membership.expiresAt);
    if (Number.isNaN(ends) || ends <= now) return false;
  }
  return true;
}

/**
 * The account type whose connection rules apply right now. Choosing Private is
 * not enough: it takes an active, unexpired Private membership.
 */
export function activeAccountType(membership: LoveMembership | undefined, now: number = Date.now()): LoveAccountType {
  return membership?.type === "private" && hasActiveMembership(membership, now) ? "private" : "public";
}

/** Reads a membership from the API. Anything unclear falls back to unpaid Public, never to Private or paid. */
export function normalizeMembership(value: unknown): LoveMembership {
  if (!value || typeof value !== "object") return UNPAID_MEMBERSHIP;
  const source = value as Record<string, unknown>;
  const type: LoveAccountType = source.type === "private" ? "private" : "public";
  const status: LoveMembershipStatus =
    source.status === "active" || source.status === "expired" ? source.status : "pending_payment";
  const expiresAt = typeof source.expiresAt === "string" && source.expiresAt ? source.expiresAt : undefined;
  return { type, status, ...(expiresAt ? { expiresAt } : {}) };
}

export type ConnectDecision = { allowed: true } | { allowed: false; reason: "upgrade_required" };

/**
 * Who may START a connection:
 * - anyone may connect with a Public member;
 * - only Private members may connect with a Private member.
 *
 * Private -> Public is allowed, and the Public member may accept. This is the
 * proposed answer to the open team question; change it here if they decide otherwise.
 */
export function canConnect(viewer: LoveAccountType, target: LoveAccountType): ConnectDecision {
  if (target === "private" && viewer !== "private") return { allowed: false, reason: "upgrade_required" };
  return { allowed: true };
}
