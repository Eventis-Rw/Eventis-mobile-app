import AsyncStorage from "@react-native-async-storage/async-storage";

import { USE_PROFILE_API } from "@/services/profileService";
import { api } from "@/utils/apiClient";

/**
 * Problem reports sent from Help & Support.
 *
 * BACKEND STATUS: there is no support module yet. The demo keeps reports on
 * the device and returns a reference; EXPO_PUBLIC_USE_PROFILE_API=true posts
 * to the proposed endpoint below.
 */

export const SUPPORT_EMAIL = "support@eventis.app";
export const REPORT_DESCRIPTION_MIN = 20;
export const REPORT_DESCRIPTION_MAX = 1000;

export type ReportCategory = "bookings" | "payments" | "events" | "account" | "safety" | "bug" | "other";

export const REPORT_CATEGORIES: { key: ReportCategory; label: string; hint: string }[] = [
  { key: "bookings", label: "Bookings & tickets", hint: "A booking, ticket or check-in didn't work" },
  { key: "payments", label: "Paid events & refunds", hint: "Payments are made on the organiser's website" },
  { key: "events", label: "Event information", hint: "Wrong, misleading or cancelled event" },
  { key: "account", label: "Account & verification", hint: "Sign-in, phone or business verification" },
  { key: "safety", label: "Safety or inappropriate content", hint: "Scams, abuse or harmful content" },
  { key: "bug", label: "Something isn't working", hint: "A screen, button or feature is broken" },
  { key: "other", label: "Something else", hint: "Anything that doesn't fit above" },
];

export interface ProblemReportInput {
  category: ReportCategory | "";
  description: string;
  contactEmail: string;
  /** Booking reference, ticket code or event name, if it's about one. */
  reference?: string;
  /** Local image URI until uploads exist. */
  screenshotUri?: string;
  /** App version and platform, only when the user leaves it switched on. */
  diagnostics?: { appVersion: string; platform: string };
  userId?: string;
}

export interface ProblemReportReceipt {
  reference: string;
  submittedAt: string;
}

export type ReportErrors = Partial<Record<"category" | "description" | "contactEmail" | "reference", string>>;

export function validateProblemReport(input: ProblemReportInput): ReportErrors {
  const errors: ReportErrors = {};
  if (!input.category) errors.category = "Choose what the problem is about.";
  const length = input.description.trim().length;
  if (length < REPORT_DESCRIPTION_MIN) {
    errors.description = `Tell us a bit more (at least ${REPORT_DESCRIPTION_MIN} characters).`;
  } else if (length > REPORT_DESCRIPTION_MAX) {
    errors.description = `Keep it under ${REPORT_DESCRIPTION_MAX} characters.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.contactEmail.trim())) {
    errors.contactEmail = "Enter an email so we can reply.";
  }
  if ((input.reference?.trim().length ?? 0) > 80) errors.reference = "Keep the reference under 80 characters.";
  return errors;
}

const REPORTS_KEY = "@eventis_support_reports";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEMO_LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 500;

// INTEGRATION POINT: POST /api/v1/support/reports -> ProblemReportReceipt
// The screenshot will go through the presigned upload endpoint once it exists.
export async function submitProblemReport(input: ProblemReportInput): Promise<ProblemReportReceipt> {
  const errors = validateProblemReport(input);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);

  const body = {
    ...input,
    description: input.description.trim(),
    contactEmail: input.contactEmail.trim(),
    reference: input.reference?.trim() || undefined,
  };

  if (!USE_PROFILE_API) {
    await wait(DEMO_LATENCY_MS);
    const receipt: ProblemReportReceipt = {
      reference: "SUP-" + Date.now().toString(36).toUpperCase().slice(-6),
      submittedAt: new Date().toISOString(),
    };
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify([{ ...body, ...receipt }, ...existing].slice(0, 20)));
    return receipt;
  }
  const { screenshotUri: _local, ...payload } = body;
  return api.post<ProblemReportReceipt>("/api/v1/support/reports", payload);
}
