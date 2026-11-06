import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/utils/apiClient";

export const USE_LIVE_REPORTS_API = process.env.EXPO_PUBLIC_USE_LIVE_REPORTS_API === "true";
export const LIVE_REPORT_DETAILS_MAX = 300;

export type LiveReportReason = "nudity" | "violence" | "harassment" | "hate" | "minor_safety" | "scam" | "spam" | "misleading" | "other";
export const LIVE_REPORT_REASONS: { key: LiveReportReason; label: string; hint: string }[] = [
  { key: "nudity", label: "Nudity or sexual content", hint: "Explicit or sexually suggestive content" },
  { key: "violence", label: "Violence or dangerous acts", hint: "Threats, weapons, self-harm or risky stunts" },
  { key: "harassment", label: "Harassment or bullying", hint: "Targeting, insulting or shaming someone" },
  { key: "hate", label: "Hate speech", hint: "Attacks on a group or identity" },
  { key: "minor_safety", label: "Child safety", hint: "A minor at risk or in an unsafe situation" },
  { key: "scam", label: "Scam or fraud", hint: "Fake tickets, money requests or phishing" },
  { key: "spam", label: "Spam", hint: "Repetitive, irrelevant or promotional content" },
  { key: "misleading", label: "Misleading event", hint: "The Live misrepresents the linked event" },
  { key: "other", label: "Something else", hint: "Anything that doesn't fit above" },
];

export type LiveReportInput = {
  roomId: string;
  hostId: string;
  reporterId: string;
  reason: LiveReportReason;
  details?: string;
  broadcast: boolean;
};
export type LiveReportReceipt = { reference: string; submittedAt: string };

const REPORTS_KEY = "@eventis_live_reports";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/v1/live/rooms/:roomId/reports { reason, details?, hostId } -> LiveReportReceipt
export async function reportLive(input: LiveReportInput): Promise<LiveReportReceipt> {
  const details = input.details?.trim() || undefined;
  if (details && details.length > LIVE_REPORT_DETAILS_MAX) throw new Error(`Keep details under ${LIVE_REPORT_DETAILS_MAX} characters.`);
  if (USE_LIVE_REPORTS_API) {
    return api.post<LiveReportReceipt>(`/api/v1/live/rooms/${encodeURIComponent(input.roomId)}/reports`, {
      reason: input.reason,
      details,
      hostId: input.hostId,
    });
  }
  await wait(500);
  const receipt = { reference: "LIV-" + Date.now().toString(36).toUpperCase().slice(-6), submittedAt: new Date().toISOString() };
  const raw = await AsyncStorage.getItem(REPORTS_KEY);
  const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify([{ ...input, details, ...receipt }, ...existing].slice(0, 50)));
  return receipt;
}
