/**
 * FindLove ID age check: statuses, accepted documents and what the member sees.
 * No React or storage imports, so screens, the context and the tests share one
 * definition.
 *
 * It is the FIRST step of FindLove and belongs to the Eventis account, not the
 * FindLove profile: no profile can be created until the ID is verified, and the
 * date of birth is read from the ID, never typed by the member.
 *
 * The SERVER decides the status: it stores the ID photos, reads them (OCR),
 * counts failed reads and sends a case to manual review after the last
 * automatic attempt. The app only shows the result.
 */

export type AgeVerificationStatus =
  /** No ID sent yet. */
  | "not_started"
  /** ID received; the server is still reading it. */
  | "processing"
  | "verified"
  /** The ID couldn't be read or didn't match; the member can try again. */
  | "failed"
  /** Out of automatic attempts (or flagged): a person will check it. */
  | "manual_review"
  /** Final no, e.g. the ID shows the member is under 18. */
  | "rejected";

export interface AgeVerification {
  status: AgeVerificationStatus;
  /** Automatic reads left before the case goes to manual review. */
  attemptsLeft: number;
  /** Why the last attempt failed or was rejected, in words for the member. */
  reason?: string;
  /** Read from the ID (YYYY-MM-DD); present once verified. Used for the profile. */
  dateOfBirth?: string;
  updatedAt?: string;
}

/** Failed automatic reads allowed before a person reviews the ID. */
export const MAX_AUTOMATIC_ATTEMPTS = 3;

export const AGE_VERIFICATION_NOT_STARTED: AgeVerification = {
  status: "not_started",
  attemptsLeft: MAX_AUTOMATIC_ATTEMPTS,
};

export type IdDocumentType = "national_id" | "passport";
export type IdSide = "front" | "back";

export const ID_DOCUMENTS: Record<IdDocumentType, { label: string; description: string; sides: IdSide[] }> = {
  national_id: {
    label: "National ID",
    description: "Rwandan national ID card, front and back",
    sides: ["front", "back"],
  },
  passport: {
    label: "Passport",
    description: "The page with your photo and date of birth",
    sides: ["front"],
  },
};

export function sideLabel(documentType: IdDocumentType, side: IdSide): string {
  if (documentType === "passport") return "Photo page";
  return side === "front" ? "Front of ID" : "Back of ID";
}

const STATUSES: AgeVerificationStatus[] = ["not_started", "processing", "verified", "failed", "manual_review", "rejected"];

/** Maps the API reply. Anything unknown is "not_started": never verified by default. */
export function normalizeAgeVerification(value: unknown): AgeVerification {
  if (!value || typeof value !== "object") return AGE_VERIFICATION_NOT_STARTED;
  const source = value as Record<string, unknown>;
  const status = STATUSES.find((s) => s === source.status) ?? "not_started";
  const attempts = Number(source.attemptsLeft ?? source.attempts_left ?? MAX_AUTOMATIC_ATTEMPTS);
  const attemptsLeft = Number.isFinite(attempts) ? Math.max(0, Math.min(MAX_AUTOMATIC_ATTEMPTS, Math.floor(attempts))) : 0;
  const reason = typeof source.reason === "string" && source.reason.trim() ? source.reason.trim() : undefined;
  const updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : undefined;
  const dob = String(source.dateOfBirth ?? source.date_of_birth ?? "");
  const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : undefined;
  return {
    status,
    attemptsLeft,
    ...(reason ? { reason } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function isAgeVerified(verification: AgeVerification | null | undefined): boolean {
  return verification?.status === "verified";
}

/** Whether the member may send ID photos now. */
export function canSubmitAgeVerification(verification: AgeVerification): boolean {
  return (verification.status === "not_started" || verification.status === "failed") && verification.attemptsLeft > 0;
}

/** The sides still missing a photo for this document. */
export function missingSides(documentType: IdDocumentType, photos: Partial<Record<IdSide, string>>): IdSide[] {
  return ID_DOCUMENTS[documentType].sides.filter((side) => !photos[side]);
}

/**
 * After a failed automatic read: one attempt fewer, and manual review once
 * none are left. The server applies this rule; the demo copies it.
 */
export function afterFailedRead(current: AgeVerification, reason: string, now: Date = new Date()): AgeVerification {
  const attemptsLeft = Math.max(0, current.attemptsLeft - 1);
  return attemptsLeft === 0
    ? { status: "manual_review", attemptsLeft, updatedAt: now.toISOString() }
    : { status: "failed", attemptsLeft, reason, updatedAt: now.toISOString() };
}

/** Title, message and button for the gate and the status screens. */
export function describeAgeVerification(verification: AgeVerification): {
  title: string;
  message: string;
  action: string | null;
} {
  switch (verification.status) {
    case "verified":
      return { title: "You're verified", message: "Thanks for confirming your age. Enjoy FindLove.", action: "Continue" };
    case "processing":
      return {
        title: "We're checking your ID",
        message: "This usually takes a few minutes. You can leave this screen; we'll keep checking.",
        action: "Check again",
      };
    case "failed":
      return {
        title: "We couldn't verify your ID",
        message: `${verification.reason ?? "We couldn't read your ID."} You have ${verification.attemptsLeft} ${
          verification.attemptsLeft === 1 ? "attempt" : "attempts"
        } left before a person reviews it.`,
        action: "Try again",
      };
    case "manual_review":
      return {
        title: "Your ID is being reviewed",
        message: "A member of our team will check your ID. You can continue as soon as it's approved.",
        action: "Check again",
      };
    case "rejected":
      return {
        title: "FindLove isn't available",
        message: verification.reason ?? "We couldn't confirm that you are 18 or older, so FindLove isn't available on your account.",
        action: null,
      };
    default:
      return {
        title: "Verify your age",
        message: "FindLove is for adults only. Take a photo of your ID so we can confirm you're 18 or older.",
        action: "Verify with ID",
      };
  }
}
