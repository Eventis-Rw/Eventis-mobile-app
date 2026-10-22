/**
 * FindLove match and safety settings. No React or storage imports, so the
 * settings screen, the hook and the tests share one definition.
 *
 * Saved on the device for now: match distance needs the API to know where
 * members are, and the safety switches need the API to enforce them.
 */

export const MATCH_DISTANCES_KM = [5, 10, 25, 50, 100] as const;
export type MatchDistanceKm = (typeof MATCH_DISTANCES_KM)[number];

export interface LoveSettings {
  /** Only show people within this many km once location matching is live. */
  maxDistanceKm: MatchDistanceKm;
  /** Others see the "Online now" badge on this member. */
  showOnlineStatus: boolean;
  /** Others see when this member has read their messages. */
  readReceipts: boolean;
  /** Hide this member from Home without deleting the profile. */
  pauseProfile: boolean;
}

export const DEFAULT_LOVE_SETTINGS: LoveSettings = {
  maxDistanceKm: 25,
  showOnlineStatus: true,
  readReceipts: true,
  pauseProfile: false,
};

/** Reads stored settings, falling back to the default for anything missing or invalid. */
export function normalizeLoveSettings(value: unknown): LoveSettings {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const flag = (key: keyof LoveSettings) =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : (DEFAULT_LOVE_SETTINGS[key] as boolean);
  return {
    maxDistanceKm: MATCH_DISTANCES_KM.includes(raw.maxDistanceKm as MatchDistanceKm)
      ? (raw.maxDistanceKm as MatchDistanceKm)
      : DEFAULT_LOVE_SETTINGS.maxDistanceKm,
    showOnlineStatus: flag("showOnlineStatus"),
    readReceipts: flag("readReceipts"),
    pauseProfile: flag("pauseProfile"),
  };
}
