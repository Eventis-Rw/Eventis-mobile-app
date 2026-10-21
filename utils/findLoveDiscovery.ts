/**
 * Discovery rules: presence and filtering. No React or storage imports, so
 * screens, the context and the tests share one definition.
 *
 * Public and Private members are both discoverable by everyone; membership
 * only limits who may connect (utils/findLoveMembership.ts).
 */

/** Active within this window = "Online". */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
/** Active within this window = "Recently active". */
export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type Presence = "online" | "recent" | "away";

/** The few profile fields these rules read; keeps the module free of app types. */
export interface DiscoverableProfile {
  gender: string;
  lastActiveAt?: string;
  isOnline: boolean;
  neighborhood?: string;
  username: string;
  bio: string;
  interests: string[];
}

/**
 * Presence from the last-active time. A server `isOnline` flag is only used
 * when no timestamp is sent, so stale flags can't keep someone "online".
 */
export function presenceOf(profile: Pick<DiscoverableProfile, "lastActiveAt" | "isOnline">, now: number = Date.now()): Presence {
  const at = profile.lastActiveAt ? Date.parse(profile.lastActiveAt) : Number.NaN;
  if (Number.isNaN(at)) return profile.isOnline ? "online" : "away";
  const age = now - at;
  if (age <= ONLINE_WINDOW_MS) return "online";
  if (age <= RECENT_WINDOW_MS) return "recent";
  return "away";
}

/** "Online now", "Active 12m ago", "Active 3h ago", or null when not recent. */
export function presenceLabel(profile: Pick<DiscoverableProfile, "lastActiveAt" | "isOnline">, now: number = Date.now()): string | null {
  const presence = presenceOf(profile, now);
  if (presence === "online") return "Online now";
  if (presence === "away") return null;
  const minutes = Math.floor((now - Date.parse(profile.lastActiveAt as string)) / 60000);
  return minutes < 60 ? `Active ${minutes}m ago` : `Active ${Math.floor(minutes / 60)}h ago`;
}

/**
 * Members only see people from their own country. Before a member has picked
 * one (profiles made before country was asked) nobody is hidden.
 */
export function inCountry(profile: { country?: string }, country: string | undefined): boolean {
  return !country || profile.country === country;
}

export type GenderFilter = "All" | "Woman" | "Man";
export type PresenceFilter = "any" | "online" | "recent";

export interface DiscoveryFilters {
  gender: GenderFilter;
  presence: PresenceFilter;
  /** One of LOVE_NEIGHBORHOODS, or undefined for anywhere. */
  neighborhood?: string;
  query: string;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = { gender: "All", presence: "any", query: "" };

export function activeFilterCount(filters: DiscoveryFilters): number {
  return (filters.gender !== "All" ? 1 : 0) + (filters.presence !== "any" ? 1 : 0) + (filters.neighborhood ? 1 : 0);
}

/**
 * Applies the filters, then orders by presence (online, recent, away) so the
 * people most likely to reply come first. "Recently active" includes online.
 */
export function filterProfiles<T extends DiscoverableProfile>(profiles: T[], filters: DiscoveryFilters, now: number = Date.now()): T[] {
  const query = filters.query.trim().toLowerCase().replace(/^@/, "");
  const rank: Record<Presence, number> = { online: 0, recent: 1, away: 2 };
  return profiles
    .filter((profile) => {
      if (filters.gender !== "All" && profile.gender !== filters.gender) return false;
      const presence = presenceOf(profile, now);
      if (filters.presence === "online" && presence !== "online") return false;
      if (filters.presence === "recent" && presence === "away") return false;
      if (filters.neighborhood && profile.neighborhood !== filters.neighborhood) return false;
      if (!query) return true;
      // Gender is left out on purpose: the Women/Men filter handles it, and
      // text matching would let "man" match "Woman".
      return [profile.username, profile.neighborhood ?? "", profile.bio, ...profile.interests]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((profile, index) => ({ profile, index, rank: rank[presenceOf(profile, now)] }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ profile }) => profile);
}
