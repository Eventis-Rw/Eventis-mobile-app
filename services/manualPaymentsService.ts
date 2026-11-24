import { api, ApiError } from "@/utils/apiClient";
import { appendLocalFile } from "@/utils/formDataFile";

/**
 * Manual payments: a member picks a plan, sees an admin-configured MTN MoMo /
 * Airtel Money number, pays out of band, uploads a screenshot of the payment
 * as proof and submits it for review. An admin approves or rejects it; the
 * server activates the real FindLove membership or organiser plan on
 * approval and emails the member either way.
 *
 * BACKEND STATUS: real endpoints on Eventis-api (/api/v1/manual-payments/*
 * and /api/v1/uploads). Used by app/love/membership.tsx when
 * EXPO_PUBLIC_USE_FINDLOVE_API=true and app/organiser/subscribe.tsx when
 * EXPO_PUBLIC_USE_ORGANISER_API=true. There is no local demo here: the demo
 * (flag-off) checkout flows in those screens never call this file.
 */

export type ManualPaymentPlatform = "findlove" | "organiser";
/** A payment method's scope can be "both"; a submission's own platform (above) never is. */
export type ManualPaymentMethodPlatform = ManualPaymentPlatform | "both";
export type ManualPaymentProvider = "mtn_momo" | "airtel_money";
export type ManualPaymentStatus = "pending" | "under_review" | "approved" | "rejected";

export interface ManualPaymentMethod {
  id: string;
  provider: ManualPaymentProvider;
  platform: ManualPaymentMethodPlatform;
  accountName: string | null;
  phoneNumber: string;
  instructions: string | null;
  currency: string;
  displayOrder: number;
}

export interface ManualPaymentSubmission {
  id: string;
  reference: string;
  platform: ManualPaymentPlatform;
  status: ManualPaymentStatus;
  /** A snapshot taken at submission time: at least a name and a duration. */
  plan: { name: string; durationDays: number; [key: string]: unknown };
  amountMinor: string;
  currency: string;
  paymentMethod: { provider: ManualPaymentProvider; accountName: string | null; phoneNumber: string };
  receiptUploadId: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualPaymentsPage {
  items: ManualPaymentSubmission[];
  page: number;
  limit: number;
  total: number;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeMethod(value: unknown): ManualPaymentMethod | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  if (!id) return null;
  return {
    id,
    provider: row.provider === "airtel_money" ? "airtel_money" : "mtn_momo",
    platform: row.platform === "organiser" ? "organiser" : row.platform === "both" ? "both" : "findlove",
    accountName: typeof row.account_name === "string" && row.account_name.trim() ? row.account_name.trim() : null,
    phoneNumber: asString(row.phone_number),
    instructions: typeof row.instructions === "string" && row.instructions.trim() ? row.instructions.trim() : null,
    currency: asString(row.currency, "RWF"),
    displayOrder: typeof row.display_order === "number" ? row.display_order : 0,
  };
}

const MANUAL_PAYMENT_STATUSES: ManualPaymentStatus[] = ["pending", "under_review", "approved", "rejected"];

function normalizeSubmission(value: unknown): ManualPaymentSubmission {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const plan = (row.plan && typeof row.plan === "object" ? row.plan : {}) as Record<string, unknown>;
  const paymentMethod = (row.payment_method && typeof row.payment_method === "object" ? row.payment_method : {}) as Record<
    string,
    unknown
  >;
  const status = MANUAL_PAYMENT_STATUSES.includes(row.status as ManualPaymentStatus) ? (row.status as ManualPaymentStatus) : "pending";
  return {
    id: asString(row.id),
    reference: asString(row.reference),
    platform: row.platform === "organiser" ? "organiser" : "findlove",
    status,
    plan: { ...plan, name: asString(plan.name, "Plan"), durationDays: typeof plan.durationDays === "number" ? plan.durationDays : 0 },
    amountMinor: asString(row.amount_minor, "0"),
    currency: asString(row.currency, "RWF"),
    paymentMethod: {
      provider: paymentMethod.provider === "airtel_money" ? "airtel_money" : "mtn_momo",
      accountName:
        typeof paymentMethod.account_name === "string" && paymentMethod.account_name.trim()
          ? paymentMethod.account_name.trim()
          : null,
      phoneNumber: asString(paymentMethod.phone_number),
    },
    receiptUploadId: asString(row.receipt_upload_id),
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    rejectionReason: typeof row.rejection_reason === "string" ? row.rejection_reason : null,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

/** Active payment numbers for the platform the member is paying for. Only active ones come back. */
export async function fetchManualPaymentMethods(platform: ManualPaymentPlatform): Promise<ManualPaymentMethod[]> {
  const reply = await api.get<{ items?: unknown[] }>(`/api/v1/manual-payments/methods?platform=${encodeURIComponent(platform)}`);
  return (reply?.items ?? []).map(normalizeMethod).filter((method): method is ManualPaymentMethod => method !== null);
}

function mimeFor(uri: string): { type: string; ext: string } {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return { type: "image/png", ext: "png" };
  if (lower.endsWith(".webp")) return { type: "image/webp", ext: "webp" };
  return { type: "image/jpeg", ext: "jpg" };
}

/** POST /api/v1/uploads (multipart: purpose=PAYMENT_RECEIPT, file) -> the upload's id, for receipt_upload_id. */
export async function uploadPaymentReceipt(uri: string): Promise<string> {
  const form = new FormData();
  form.append("purpose", "PAYMENT_RECEIPT");
  const { type, ext } = mimeFor(uri);
  await appendLocalFile(form, "file", uri, `payment_receipt.${ext}`, type);
  const reply = await api.postForm<{ id?: string }>("/api/v1/uploads", form);
  if (!reply?.id) throw new Error("The receipt upload didn't return a reference. Please try again.");
  return reply.id;
}

/**
 * POST /api/v1/manual-payments. Exactly one of installmentPlanId (FindLove)
 * or organiserPlanId (organiser) must be set; the server computes the amount
 * from the plan itself. 409s when the member already has an open submission
 * for this platform; that message is meant to be shown as is.
 */
export async function submitManualPayment(input: {
  platform: ManualPaymentPlatform;
  installmentPlanId?: string;
  organiserPlanId?: string;
  paymentMethodId: string;
  receiptUploadId: string;
}): Promise<ManualPaymentSubmission> {
  const row = await api.post<unknown>("/api/v1/manual-payments", {
    platform: input.platform,
    ...(input.installmentPlanId ? { installment_plan_id: input.installmentPlanId } : {}),
    ...(input.organiserPlanId ? { organiser_plan_id: input.organiserPlanId } : {}),
    payment_method_id: input.paymentMethodId,
    receipt_upload_id: input.receiptUploadId,
  });
  return normalizeSubmission(row);
}

export function isDuplicateManualPaymentError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 409) return true;
  return error instanceof Error && /already have a payment|awaiting review/i.test(error.message);
}

/** GET /api/v1/manual-payments/mine. Newest first. */
export async function fetchMyManualPayments(
  params: { platform?: ManualPaymentPlatform; status?: ManualPaymentStatus; page?: number; limit?: number } = {},
): Promise<ManualPaymentsPage> {
  const query = new URLSearchParams();
  if (params.platform) query.set("platform", params.platform);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  const reply = await api.get<{ items?: unknown[]; page?: number; limit?: number; total?: number }>(
    `/api/v1/manual-payments/mine?${query.toString()}`,
  );
  return {
    items: (reply?.items ?? []).map(normalizeSubmission),
    page: reply?.page ?? params.page ?? 1,
    limit: reply?.limit ?? params.limit ?? 20,
    total: reply?.total ?? 0,
  };
}

/** GET /api/v1/manual-payments/:id */
export async function fetchManualPayment(id: string): Promise<ManualPaymentSubmission> {
  return normalizeSubmission(await api.get<unknown>(`/api/v1/manual-payments/${encodeURIComponent(id)}`));
}

/**
 * Formats a minor-units amount string (e.g. "500000" -> "RWF 5,000.00")
 * without float math, the same way the server's own emails do.
 */
export function formatMinorAmount(amountMinor: string, currency: string): string {
  let amount: bigint;
  try {
    amount = BigInt(amountMinor || "0");
  } catch {
    return `${currency} ${amountMinor}`;
  }
  // Despite the field's name, FindLove/organiser plan prices are whole RWF
  // (price_minor 499 means RWF 499), not cents — matches the plan price
  // shown on the account-type picker and the server's own admin-membership
  // money() helper. There is no fractional RWF unit to show.
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  return `${negative ? "-" : ""}${currency} ${abs.toLocaleString("en-US")}`;
}

export function manualPaymentStatusLabel(status: ManualPaymentStatus): string {
  switch (status) {
    case "pending":
      return "Awaiting review";
    case "under_review":
      return "Under review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}
