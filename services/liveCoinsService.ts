import { api } from "@/utils/apiClient";

export const USE_LIVE_PAYMENTS_API = process.env.EXPO_PUBLIC_USE_LIVE_PAYMENTS_API === "true";

export const LIVE_COIN_PACKAGES = [
  { id: "live_coins_70", coins: 70, priceRwf: 1_000 },
  { id: "live_coins_350", coins: 350, priceRwf: 5_000 },
  { id: "live_coins_700", coins: 700, priceRwf: 10_000, popular: true },
  { id: "live_coins_1400", coins: 1_400, priceRwf: 20_000 },
  { id: "live_coins_3500", coins: 3_500, priceRwf: 50_000 },
  { id: "live_coins_7000", coins: 7_000, priceRwf: 100_000 },
] as const;
export type LiveCoinPackage = (typeof LIVE_COIN_PACKAGES)[number];

export type LivePaymentMethod = "mtn_momo" | "airtel_money";
export const LIVE_PAYMENT_METHODS: { id: LivePaymentMethod; label: string; ussd: string; color: string; prefixes: string[] }[] = [
  { id: "mtn_momo", label: "MTN MoMo", ussd: "*182#", color: "#FACC15", prefixes: ["78", "79"] },
  { id: "airtel_money", label: "Airtel Money", ussd: "*500#", color: "#EF4444", prefixes: ["72", "73"] },
];

export type LiveCoinCheckoutResult =
  | { status: "succeeded"; paymentId: string }
  | { status: "pending"; paymentId: string }
  | { status: "failed"; message: string }
  | { status: "cancelled" };

export const formatRwf = (amount: number) => `RWF ${amount.toLocaleString("en-US")}`;

export function rwandaMobileNumber(input: string, method: LivePaymentMethod): { phone?: string; error?: string } {
  const digits = input.replace(/\D/g, "").replace(/^250/, "").replace(/^0/, "");
  if (!/^7\d{8}$/.test(digits)) return { error: "Enter a Rwandan mobile number, e.g. 078 123 4567." };
  const expected = LIVE_PAYMENT_METHODS.find((m) => m.id === method)!;
  if (!expected.prefixes.includes(digits.slice(0, 2))) {
    const other = LIVE_PAYMENT_METHODS.find((m) => m.prefixes.includes(digits.slice(0, 2)));
    return { error: other ? `This looks like an ${other.label} number. Switch to ${other.label} or use another number.` : "This number isn't on MTN or Airtel." };
  }
  return { phone: `+250${digits}` };
}

const POLL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readPayment(value: unknown) {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    paymentId: String(source.paymentId ?? source.id ?? ""),
    status: String(source.status ?? "pending"),
    message: typeof source.message === "string" ? source.message : undefined,
  };
}

function settle(payment: ReturnType<typeof readPayment>): LiveCoinCheckoutResult {
  if (payment.status === "succeeded") return { status: "succeeded", paymentId: payment.paymentId };
  if (payment.status === "cancelled") return { status: "cancelled" };
  if (payment.status === "pending") return { status: "pending", paymentId: payment.paymentId };
  return { status: "failed", message: payment.message ?? "The payment did not go through. Please try again." };
}

// POST /api/v1/live/coins/checkout { packageId, paymentMethod, payerPhone } -> { paymentId, status }
// GET  /api/v1/live/coins/payments/:paymentId -> { status, message? }
// The server owns prices and credits the wallet only after the provider confirms.
export async function buyLiveCoins(input: { pack: LiveCoinPackage; paymentMethod: LivePaymentMethod; payerPhone: string }): Promise<LiveCoinCheckoutResult> {
  if (!USE_LIVE_PAYMENTS_API) {
    await wait(2000);
    return { status: "succeeded", paymentId: `test_${input.pack.id}_${Date.now().toString(36)}` };
  }
  let payment = readPayment(
    await api.post<unknown>("/api/v1/live/coins/checkout", {
      packageId: input.pack.id,
      paymentMethod: input.paymentMethod,
      payerPhone: input.payerPhone,
    }),
  );
  const startedAt = Date.now();
  while (payment.status === "pending" && payment.paymentId && Date.now() - startedAt < POLL_LIMIT_MS) {
    await wait(POLL_MS);
    const next = readPayment(await api.get<unknown>(`/api/v1/live/coins/payments/${encodeURIComponent(payment.paymentId)}`));
    payment = { ...next, paymentId: next.paymentId || payment.paymentId };
  }
  return settle(payment);
}

export async function checkLiveCoinPayment(paymentId: string): Promise<LiveCoinCheckoutResult> {
  const payment = readPayment(await api.get<unknown>(`/api/v1/live/coins/payments/${encodeURIComponent(paymentId)}`));
  return settle({ ...payment, paymentId: payment.paymentId || paymentId });
}
