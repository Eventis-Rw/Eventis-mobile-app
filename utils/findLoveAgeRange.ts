/**
 * Age-range search rules. Other members' ages are never shown or sent to the
 * phone: the member picks a range, the server matches it against the date of
 * birth from the ID check and returns only who fits (services/findLoveService.ts).
 *
 * No React or storage imports, so screens, the service and the tests share one
 * definition.
 */

/** Youngest age that can be picked; FindLove is 18+. */
export const LOVE_AGE_RANGE_MIN = 18;
/** Oldest age that can be picked. As an upper bound it means "and older" (70+). */
export const LOVE_AGE_RANGE_MAX = 70;
/**
 * A range must cover at least this many years (max - min). Without it, searching
 * 30–30, then 31–31 would reveal someone's exact age.
 */
export const LOVE_AGE_RANGE_MIN_SPAN = 5;

export interface LoveAgeRange {
  min: number;
  max: number;
}

/** Everyone: 18 to 70+. Also the meaning of "no preference saved". */
export const ANY_LOVE_AGE_RANGE: LoveAgeRange = { min: LOVE_AGE_RANGE_MIN, max: LOVE_AGE_RANGE_MAX };

export function isAnyAgeRange(range: LoveAgeRange | undefined): boolean {
  return !range || (range.min <= LOVE_AGE_RANGE_MIN && range.max >= LOVE_AGE_RANGE_MAX);
}

export function sameAgeRange(a: LoveAgeRange | undefined, b: LoveAgeRange | undefined): boolean {
  if (isAnyAgeRange(a) || isAnyAgeRange(b)) return isAnyAgeRange(a) && isAnyAgeRange(b);
  return a!.min === b!.min && a!.max === b!.max;
}

/** Undefined when the range is allowed, otherwise the message to show. */
export function validateLoveAgeRange(range: LoveAgeRange | undefined): string | undefined {
  if (!range) return undefined;
  const { min, max } = range;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return "Pick whole years.";
  if (min < LOVE_AGE_RANGE_MIN || max > LOVE_AGE_RANGE_MAX) return `Pick ages from ${LOVE_AGE_RANGE_MIN} to ${LOVE_AGE_RANGE_MAX}+.`;
  if (max - min < LOVE_AGE_RANGE_MIN_SPAN) return `The range must cover at least ${LOVE_AGE_RANGE_MIN_SPAN} years.`;
  return undefined;
}

/**
 * Moves one end of the range by `step` years, pushing the other end along when
 * they would get closer than the minimum span. Never leaves the 18–70 bounds.
 */
export function stepAgeRange(range: LoveAgeRange, end: "min" | "max", step: number): LoveAgeRange {
  if (end === "min") {
    const min = clamp(range.min + step, LOVE_AGE_RANGE_MIN, LOVE_AGE_RANGE_MAX - LOVE_AGE_RANGE_MIN_SPAN);
    return { min, max: Math.max(range.max, min + LOVE_AGE_RANGE_MIN_SPAN) };
  }
  const max = clamp(range.max + step, LOVE_AGE_RANGE_MIN + LOVE_AGE_RANGE_MIN_SPAN, LOVE_AGE_RANGE_MAX);
  return { min: Math.min(range.min, max - LOVE_AGE_RANGE_MIN_SPAN), max };
}

/** "70+" for the top of the scale, otherwise the number. */
export function formatAgeBound(age: number): string {
  return age >= LOVE_AGE_RANGE_MAX ? `${LOVE_AGE_RANGE_MAX}+` : String(age);
}

/** "Any age", "25–32", or "40+" when there's no upper limit. */
export function formatAgeRange(range: LoveAgeRange | undefined): string {
  if (isAnyAgeRange(range)) return "Any age";
  const { min, max } = range!;
  return max >= LOVE_AGE_RANGE_MAX ? `${min}+` : `${min}–${max}`;
}

/**
 * Reads a range from the API: { min, max }, or preferredAgeMin / preferredAgeMax
 * (camel or snake case) on the profile. Anything unusable means no preference.
 */
export function normalizeLoveAgeRange(source: unknown): LoveAgeRange | undefined {
  if (!source || typeof source !== "object") return undefined;
  const s = source as Record<string, unknown>;
  const nested = s.ageRange && typeof s.ageRange === "object" ? (s.ageRange as Record<string, unknown>) : undefined;
  const min = Number(nested?.min ?? s.preferredAgeMin ?? s.preferred_age_min ?? s.min ?? Number.NaN);
  const max = Number(nested?.max ?? s.preferredAgeMax ?? s.preferred_age_max ?? s.max ?? Number.NaN);
  const range = { min, max };
  if (validateLoveAgeRange(range) || isAnyAgeRange(range)) return undefined;
  return range;
}

/**
 * Query string for a profile search, "" for any age. A top of 70 means "70 and
 * older", so no ageMax is sent for it.
 */
export function ageRangeQuery(range: LoveAgeRange | undefined): string {
  if (isAnyAgeRange(range)) return "";
  const { min, max } = range!;
  const parts = min > LOVE_AGE_RANGE_MIN ? [`ageMin=${min}`] : [];
  if (max < LOVE_AGE_RANGE_MAX) parts.push(`ageMax=${max}`);
  return parts.join("&");
}

/** For the local demo only; the real app never knows other members' ages. */
export function ageInRange(age: number, range: LoveAgeRange | undefined): boolean {
  if (isAnyAgeRange(range)) return true;
  return age >= range!.min && (range!.max >= LOVE_AGE_RANGE_MAX || age <= range!.max);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
