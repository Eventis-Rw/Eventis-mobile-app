/**
 * FindLove membership: Public (free) and Private (paid) accounts, and what each
 * may do. No React or storage imports, so screens, contexts, the service and
 * the tests share one definition.
 *
 * The server is the authority. It decides a member's membership (Private only
 * after confirmed payment) and must reject connection requests these rules
 * forbid. The app applies the same rules so people get an upgrade prompt
 * instead of an error.
 */

export type LoveAccountType = "public" | "private";

/**
 * - active: privileges apply (Public is always active).
 * - pending_payment: chose Private, payment not confirmed yet. Treated as Public.
 * - expired: Private lapsed. Treated as Public.
 */
export type LoveMembershipStatus = "active" | "pending_payment" | "expired";

export interface LoveMembership {
  type: LoveAccountType;
  status: LoveMembershipStatus;
  /** ISO timestamp. Private privileges end at this moment. */
  expiresAt?: string;
}

export const PUBLIC_MEMBERSHIP: LoveMembership = { type: "public", status: "active" };

/**
 * PLACEHOLDER until the team confirms price and period (open question). The
 * real price comes from the server at checkout; this only drives the screens.
 */
export const PRIVATE_MEMBERSHIP_PLAN = {
  id: "findlove_private_monthly",
  price: 1180,
  periodDays: 30,
  periodLabel: "month",
  benefits: [
    "Connect with Private members",
    "Connect with Public members too",
    "PRIVATE badge on your profile",
    "Discover every member, Public and Private",
  ],
} as const;

export function formatMembershipPrice(price: number = PRIVATE_MEMBERSHIP_PLAN.price): string {
  return `RWF ${price.toLocaleString("en-US")}`;
}

/**
 * The account type a member actually has right now. Choosing Private is not
 * enough: it takes an active, unexpired Private membership.
 */
export function activeAccountType(membership: LoveMembership | undefined, now: number = Date.now()): LoveAccountType {
  if (!membership || membership.type !== "private" || membership.status !== "active") return "public";
  if (membership.expiresAt) {
    const ends = Date.parse(membership.expiresAt);
    if (Number.isNaN(ends) || ends <= now) return "public";
  }
  return "private";
}

/** Reads a membership from the API. Anything unclear falls back to Public, never to Private. */
export function normalizeMembership(value: unknown): LoveMembership {
  if (!value || typeof value !== "object") return PUBLIC_MEMBERSHIP;
  const source = value as Record<string, unknown>;
  if (source.type !== "private") return PUBLIC_MEMBERSHIP;
  const status: LoveMembershipStatus =
    source.status === "active" || source.status === "expired" ? source.status : "pending_payment";
  const expiresAt = typeof source.expiresAt === "string" && source.expiresAt ? source.expiresAt : undefined;
  return { type: "private", status, ...(expiresAt ? { expiresAt } : {}) };
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
