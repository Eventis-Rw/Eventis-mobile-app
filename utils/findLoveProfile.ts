/**
 * Rules for a member's own FindLove profile. No React or storage imports, so
 * the create/edit forms, the service and the tests all share one definition.
 *
 * The app checks these for a fast, friendly form. The server must enforce the
 * same rules (age in particular) because the client can be bypassed.
 */

export const MIN_LOVE_AGE = 18;

export const LOVE_USERNAME_MIN = 3;
export const LOVE_USERNAME_MAX = 20;

/** Gender is required and limited to the two options the spec filters by. */
export const LOVE_GENDERS = ["Woman", "Man"] as const;
export type LoveGender = (typeof LOVE_GENDERS)[number];

/** Free members get one profile photo and one extra photo. */
export const FREE_LOVE_PHOTO_LIMIT = 2;

/** Optional extras, added from Edit profile after the profile exists. */
export const LOVE_BIO_MAX = 160;
export const LOVE_INTERESTS_MAX = 5;

export const LOVE_INTERESTS = [
  "Live music",
  "Concerts",
  "Dance",
  "Festivals",
  "Comedy",
  "Theatre",
  "Art",
  "Photography",
  "Fashion",
  "Food",
  "Coffee",
  "Cooking",
  "Travel",
  "Hiking",
  "Running",
  "Fitness",
  "Football",
  "Basketball",
  "Books",
  "Movies",
  "Gaming",
  "Technology",
  "Design",
  "Business",
  "Faith",
  "Volunteering",
] as const;

/**
 * Members pick a neighbourhood from this list. An exact location is never
 * asked for, stored or shown.
 */
export const LOVE_NEIGHBORHOODS: { name: string; city: string }[] = [
  { name: "Gikondo", city: "Kigali" },
  { name: "Gisozi", city: "Kigali" },
  { name: "Kacyiru", city: "Kigali" },
  { name: "Kanombe", city: "Kigali" },
  { name: "Kibagabaga", city: "Kigali" },
  { name: "Kicukiro", city: "Kigali" },
  { name: "Kimihurura", city: "Kigali" },
  { name: "Kimironko", city: "Kigali" },
  { name: "Kiyovu", city: "Kigali" },
  { name: "Muhima", city: "Kigali" },
  { name: "Nyamirambo", city: "Kigali" },
  { name: "Nyarutarama", city: "Kigali" },
  { name: "Remera", city: "Kigali" },
  { name: "Ngoma", city: "Huye" },
  { name: "Muhoza", city: "Musanze" },
  { name: "Gisenyi", city: "Rubavu" },
];

export function validateLoveBio(value: string | undefined): string | undefined {
  return (value ?? "").trim().length > LOVE_BIO_MAX ? `Keep your bio to ${LOVE_BIO_MAX} characters.` : undefined;
}

export function validateLoveInterests(values: string[]): string | undefined {
  if (values.length > LOVE_INTERESTS_MAX) return `Pick up to ${LOVE_INTERESTS_MAX} interests.`;
  if (values.some((value) => !(LOVE_INTERESTS as readonly string[]).includes(value))) return "Pick interests from the list.";
  return undefined;
}

export function validateLoveNeighborhood(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return LOVE_NEIGHBORHOODS.some((n) => n.name === value) ? undefined : "Pick a neighbourhood from the list.";
}

/** Usernames are stored lowercase so "Amara.K" and "amara.k" cannot both exist. */
export function normalizeLoveUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function validateLoveUsername(value: string): string | undefined {
  const name = normalizeLoveUsername(value);
  if (!name) return "Choose a username.";
  if (name.length < LOVE_USERNAME_MIN) return `Use at least ${LOVE_USERNAME_MIN} characters.`;
  if (name.length > LOVE_USERNAME_MAX) return `Keep it to ${LOVE_USERNAME_MAX} characters or fewer.`;
  if (!/^[a-z]/.test(name)) return "Start with a letter.";
  if (!/^[a-z0-9._]+$/.test(name)) return "Use only letters, numbers, dots and underscores.";
  if (/[._]$/.test(name) || /[._]{2}/.test(name)) return "Dots and underscores can't be at the end or side by side.";
  return undefined;
}

export function validateLoveGender(value: string | undefined): string | undefined {
  return LOVE_GENDERS.includes(value as LoveGender) ? undefined : "Select Woman or Man.";
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Turns day/month/year inputs into an ISO date ("YYYY-MM-DD"), or an error
 * message. Impossible dates such as 31/02 are rejected, not rolled over.
 */
export function parseDateOfBirth(
  day: string,
  month: string,
  year: string,
  today: Date = new Date(),
): { value: string } | { error: string } {
  if (!day.trim() || !month.trim() || !year.trim()) return { error: "Enter your full date of birth." };
  if (![day, month, year].every((part) => /^\d+$/.test(part.trim()))) return { error: "Use numbers only." };
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (year.trim().length !== 4) return { error: "Enter the year with 4 digits." };

  const date = new Date(Date.UTC(y, m - 1, d));
  if (m < 1 || m > 12 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { error: "That date doesn't exist." };
  }
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  const age = ageOn(iso, today);
  if (age === null || age < 0) return { error: "Date of birth can't be in the future." };
  if (age > 120) return { error: "Check the year of birth." };
  return { value: iso };
}

/** Whole years between an ISO birth date and `today`, or null if unreadable. */
export function ageOn(dateOfBirth: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  let age = today.getFullYear() - y;
  const month = today.getMonth() + 1;
  if (month < m || (month === m && today.getDate() < d)) age -= 1;
  return age;
}

export function isAdult(dateOfBirth: string, today: Date = new Date()): boolean {
  const age = ageOn(dateOfBirth, today);
  return age !== null && age >= MIN_LOVE_AGE;
}

/** "15 Mar 1998" style label for a stored ISO date. */
export function formatDateOfBirth(dateOfBirth: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return dateOfBirth;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}
