import type { SocialPlatform } from "@/services/profileService";

/** Limits for Edit Profile. Organisation fields use `validateOrganisation` in OrganisationForm. */
export const PROFILE_LIMITS = {
  username: 50,
  bio: 200,
  location: 120,
  legalName: 120,
  registrationNumber: 30,
  categories: 5,
} as const;

export const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string; domains: string[]; base: string }[] = [
  { key: "instagram", label: "Instagram", domains: ["instagram.com"], base: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", domains: ["facebook.com", "fb.com"], base: "https://facebook.com/" },
  { key: "x", label: "X (Twitter)", domains: ["x.com", "twitter.com"], base: "https://x.com/" },
  { key: "tiktok", label: "TikTok", domains: ["tiktok.com"], base: "https://tiktok.com/@" },
  { key: "youtube", label: "YouTube", domains: ["youtube.com", "youtu.be"], base: "https://youtube.com/@" },
  { key: "linkedin", label: "LinkedIn", domains: ["linkedin.com"], base: "https://linkedin.com/company/" },
];

export function validateUsername(value: string): string | undefined {
  const name = value.trim();
  if (name.length < 2) return "Enter at least 2 characters.";
  if (name.length > PROFILE_LIMITS.username) return `Keep it under ${PROFILE_LIMITS.username} characters.`;
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) return "Use letters, numbers, spaces, dots, dashes or underscores.";
  return undefined;
}

export function validateMaxLength(value: string, max: number): string | undefined {
  return value.trim().length > max ? `Keep it under ${max} characters.` : undefined;
}

/** Accepts international numbers with spaces or dashes, e.g. +250 788 123 456. */
export function validatePhone(value: string, { required = false } = {}): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Enter a phone number." : undefined;
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return "Use digits only, with an optional + country code.";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return "Enter a full phone number with country code.";
  return undefined;
}

export function normalisePhone(value: string): string | undefined {
  return value.trim().replace(/\s+/g, " ") || undefined;
}

/** Same digits = same number, so formatting changes don't reset phone verification. */
export function samePhone(a?: string, b?: string): boolean {
  return (a ?? "").replace(/\D/g, "") === (b ?? "").replace(/\D/g, "");
}

export function validateEmail(value: string, { required = false } = {}): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Enter an email address." : undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) ? undefined : "Enter a valid email address.";
}

export function normaliseWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validateWebsite(value: string): string | undefined {
  const url = normaliseWebsite(value);
  if (!url) return undefined;
  return /^https?:\/\/([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(url) ? undefined : "Enter a valid website, e.g. https://example.com";
}

/**
 * Turns a handle ("@kigalijazz" or "kigalijazz") or a link into a full profile
 * URL for the platform. Returns undefined for blank input.
 */
export function normaliseSocialLink(platform: SocialPlatform, value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const config = SOCIAL_PLATFORMS.find((p) => p.key === platform)!;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (config.domains.some((d) => trimmed.toLowerCase().startsWith(d) || trimmed.toLowerCase().startsWith(`www.${d}`))) {
    return `https://${trimmed}`;
  }
  return config.base + trimmed.replace(/^@/, "");
}

export function validateSocialLink(platform: SocialPlatform, value: string): string | undefined {
  const url = normaliseSocialLink(platform, value);
  if (!url) return undefined;
  const config = SOCIAL_PLATFORMS.find((p) => p.key === platform)!;
  // Parsed by hand: React Native's URL polyfill doesn't implement `hostname`.
  const host = url.match(/^https?:\/\/([^/?#\s]+)/i)?.[1]?.toLowerCase().replace(/^(www\.|m\.)/, "");
  if (!host) return `Enter a ${config.label} link or username.`;
  if (!config.domains.includes(host)) return `This doesn't look like a ${config.label} link.`;
  const handle = url.replace(/^https?:\/\/[^/]+\/?/, "");
  if (!handle || /\s/.test(handle)) return `Enter a ${config.label} link or username.`;
  return undefined;
}

export function validateRegistrationNumber(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z0-9/-]{4,30}$/.test(trimmed)) return "Use 4–30 letters, numbers, dashes or slashes.";
  return undefined;
}

/** Rwanda TINs are 9 digits (same rule as business verification). */
export function validateTaxId(value: string): string | undefined {
  const digits = value.replace(/\s/g, "");
  if (!digits) return undefined;
  return /^\d{9}$/.test(digits) ? undefined : "A TIN is 9 digits.";
}

export function validateCategories(categories: string[]): string | undefined {
  return categories.length > PROFILE_LIMITS.categories
    ? `Choose up to ${PROFILE_LIMITS.categories} categories.`
    : undefined;
}
