import { DEMO_WRONG_CODE, PHONE_CODE_RESEND_SECONDS, USE_PROFILE_API, validatePhoneCode } from "@/services/profileService";
import { api } from "@/utils/apiClient";

/**
 * Sensitive account actions: re-checking identity before deleting the account,
 * and changing the password.
 *
 * BACKEND STATUS: none of these endpoints exist yet. The demo (default) lets
 * the flows be reviewed on device; EXPO_PUBLIC_USE_PROFILE_API=true calls the
 * proposed endpoints below. Password change has no demo because demo and phone
 * sessions have no password, so the UI only offers it against the real API.
 */

/** What the user types on the last step of account deletion. Case-sensitive. */
export const DELETE_CONFIRM_PHRASE = "DELETE";
export const PASSWORD_MIN_LENGTH = 8;

export interface DeletionChallenge {
  channel: "sms" | "email";
  /** Where the code went, already masked for display, e.g. "+250 ••• ••• 456". */
  destination: string;
  resendAfterSeconds: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEMO_LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 350;

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `+${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export function matchesDeletePhrase(value: string): boolean {
  return value.trim() === DELETE_CONFIRM_PHRASE;
}

export function validateNewPassword(current: string, next: string, repeat: string): string | null {
  if (!current) return "Enter your current password.";
  if (next.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return "Use both letters and numbers.";
  if (next === current) return "Choose a password you haven't used here.";
  if (next !== repeat) return "The new passwords don't match.";
  return null;
}

// INTEGRATION POINT: POST /api/v1/users/me/deletion/challenge -> DeletionChallenge
// Sends a one-time code to the verified phone, or to the email when the phone isn't verified.
export async function requestDeletionChallenge(contact: {
  phone?: string;
  phoneVerified: boolean;
  email: string;
}): Promise<DeletionChallenge> {
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    return contact.phoneVerified && contact.phone
      ? { channel: "sms", destination: maskPhone(contact.phone), resendAfterSeconds: PHONE_CODE_RESEND_SECONDS }
      : { channel: "email", destination: maskEmail(contact.email), resendAfterSeconds: PHONE_CODE_RESEND_SECONDS };
  }
  return api.post<DeletionChallenge>("/api/v1/users/me/deletion/challenge");
}

// INTEGRATION POINT: POST /api/v1/users/me/deletion/verify { code } -> { deletionToken }
// The short-lived token proves the identity check passed; deletion requires it.
export async function verifyDeletionCode(code: string): Promise<string> {
  const problem = validatePhoneCode(code);
  if (problem) throw new Error(problem);
  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    if (code === DEMO_WRONG_CODE) throw new Error("That code isn't right. Check it and try again.");
    return "demo_deletion_" + Date.now().toString(36);
  }
  const resp = await api.post<{ deletionToken: string }>("/api/v1/users/me/deletion/verify", { code });
  return resp.deletionToken;
}

// INTEGRATION POINT: POST /api/v1/users/me/deletion { deletionToken, confirmation } -> { deleted: true }
// A POST rather than DELETE because the API client can't send a DELETE body.
export async function requestAccountDeletion(deletionToken: string, confirmation: string): Promise<void> {
  if (!matchesDeletePhrase(confirmation)) throw new Error(`Type ${DELETE_CONFIRM_PHRASE} to confirm.`);
  await api.post<{ deleted: true }>("/api/v1/users/me/deletion", { deletionToken, confirmation });
}

/** Password change needs a real account; demo and phone sessions have no password. */
export const PASSWORD_CHANGE_SUPPORTED = USE_PROFILE_API;

// INTEGRATION POINT: POST /api/v1/users/me/password { currentPassword, newPassword } -> { changed: true }
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!PASSWORD_CHANGE_SUPPORTED) throw new Error("Password changes aren't available yet.");
  await api.post<{ changed: true }>("/api/v1/users/me/password", { currentPassword, newPassword });
}
