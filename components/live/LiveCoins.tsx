import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import {
  LIVE_COIN_PACKAGES,
  LIVE_PAYMENT_METHODS,
  USE_LIVE_PAYMENTS_API,
  buyLiveCoins,
  checkLiveCoinPayment,
  formatRwf,
  rwandaMobileNumber,
  type LiveCoinPackage,
  type LivePaymentMethod,
} from "@/services/liveCoinsService";
import { LIVE_GIFTS, LIVE_LIMITS } from "@/services/liveState";
import { LiveButton, liveColors as c, liveStyles as s } from "./LivePrimitives";

export function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#F5B700", alignItems: "center", justifyContent: "center", borderWidth: size / 10, borderColor: "#FFD84D" }}>
      <Text style={{ color: "#8A5A00", fontSize: size * 0.58, fontFamily: "Inter_800ExtraBold", lineHeight: size * 0.75 }}>E</Text>
    </View>
  );
}

export function CoinBalance({ balance, onRecharge }: { balance: number; onRecharge?: () => void }) {
  return (
    <View style={[s.row, { justifyContent: "space-between" }]}>
      <View style={coin.balance}>
        <CoinIcon size={18} />
        <Text style={coin.balanceText}>{balance.toLocaleString("en-US")}</Text>
      </View>
      {onRecharge ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Recharge coins" onPress={onRecharge} style={({ pressed }) => [coin.recharge, { opacity: pressed ? 0.75 : 1 }]}>
          <Text style={coin.rechargeText}>Recharge</Text>
          <Ionicons name="chevron-forward" size={14} color="#1A1300" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function LiveGiftPicker({ balance, recipient, enabled, busy, onSend, onRecharge }: {
  balance: number;
  recipient: string;
  enabled: boolean;
  busy: boolean;
  onSend: (giftId: string) => void;
  onRecharge: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <CoinBalance balance={balance} onRecharge={onRecharge} />
      {!enabled ? <Text style={s.body}>{recipient} has paused gifts for now.</Text> : null}
      <View style={coin.grid}>
        {LIVE_GIFTS.map((g) => {
          const active = selected === g.id;
          const short = balance < g.coins;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={`${g.name}, ${g.coins} coins`}
              accessibilityState={{ selected: active, disabled: !enabled }}
              disabled={!enabled}
              onPress={() => setSelected(active ? null : g.id)}
              style={[coin.gift, active ? coin.giftActive : null, !enabled ? { opacity: 0.4 } : null]}
            >
              <Text style={coin.emoji}>{g.emoji}</Text>
              <Text numberOfLines={1} style={coin.giftName}>{g.name}</Text>
              {active ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={short ? `Recharge to send ${g.name}` : `Send ${g.name} to ${recipient}`}
                  disabled={busy}
                  onPress={() => (short ? onRecharge() : onSend(g.id))}
                  style={[coin.send, { backgroundColor: short ? "#F5B700" : c.red, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={[coin.sendText, short ? { color: "#1A1300" } : null]}>{short ? "Recharge" : "Send"}</Text>
                </Pressable>
              ) : (
                <View style={coin.price}>
                  <CoinIcon size={11} />
                  <Text style={coin.priceText}>{g.coins.toLocaleString("en-US")}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={[s.body, { fontSize: 11, textAlign: "center" }]}>
        Daily gifting limit: {LIVE_LIMITS.dailyGiftCoins.toLocaleString("en-US")} coins
      </Text>
    </>
  );
}

type Phase = "form" | "processing" | "pending" | "failed" | "cancelled" | "succeeded";

export function LiveRecharge({ balance, onCredited, onDone }: {
  balance: number;
  onCredited: (pack: LiveCoinPackage, paymentId: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [pack, setPack] = useState<LiveCoinPackage>(LIVE_COIN_PACKAGES.find((p) => "popular" in p)!);
  const [method, setMethod] = useState<LivePaymentMethod>("mtn_momo");
  const [phone, setPhone] = useState((user?.phone ?? "").replace(/\s/g, "").replace(/^\+250/, "0"));
  const [phoneError, setPhoneError] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");
  const selectedMethod = LIVE_PAYMENT_METHODS.find((m) => m.id === method)!;

  const finish = async (result: Awaited<ReturnType<typeof buyLiveCoins>>) => {
    if (result.status === "succeeded") {
      try {
        await onCredited(pack, result.paymentId);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Your coins couldn't be added. Contact support with your payment reference.");
        setPhase("failed");
        return;
      }
    }
    if (result.status === "pending") setPendingId(result.paymentId);
    if (result.status === "failed") setMessage(result.message);
    setPhase(result.status);
  };

  const pay = async () => {
    const number = rwandaMobileNumber(phone, method);
    if (!number.phone) {
      setPhoneError(number.error ?? "");
      return;
    }
    setPhoneError("");
    setPhase("processing");
    await finish(
      await buyLiveCoins({ pack, paymentMethod: method, payerPhone: number.phone }).catch((e: unknown) => ({
        status: "failed" as const,
        message: e instanceof Error ? e.message : "We couldn't reach the payment service.",
      })),
    );
  };

  const checkAgain = async () => {
    setPhase("processing");
    await finish(
      await checkLiveCoinPayment(pendingId).catch(() => ({ status: "pending" as const, paymentId: pendingId })),
    );
  };

  if (phase !== "form") {
    const view = {
      processing: { icon: "phone-portrait-outline", color: c.blue, title: "Approve on your phone", body: `We sent a ${formatRwf(pack.priceRwf)} request to your ${selectedMethod.label} number. Enter your PIN on the prompt, or dial ${selectedMethod.ussd} if it doesn't appear.` },
      succeeded: { icon: "checkmark-circle", color: "#22C55E", title: `${pack.coins.toLocaleString("en-US")} coins added`, body: "Your balance is ready. Go send some love." },
      pending: { icon: "time-outline", color: "#F5B700", title: "Still waiting for confirmation", body: "Mobile money can take a minute. We'll add your coins as soon as the payment is confirmed." },
      failed: { icon: "close-circle", color: c.danger, title: "Payment didn't go through", body: message },
      cancelled: { icon: "close-circle-outline", color: c.muted, title: "Payment cancelled", body: "No money was taken. You can try again whenever you're ready." },
    }[phase] as { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; title: string; body: string };
    return (
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 12 }}>
        {phase === "processing" ? <ActivityIndicator size="large" color={c.blue} /> : <Ionicons name={view.icon} size={54} color={view.color} />}
        <Text style={[s.heading, { textAlign: "center" }]}>{view.title}</Text>
        <Text style={[s.body, { textAlign: "center" }]}>{view.body}</Text>
        {phase === "succeeded" ? <LiveButton label="Back to gifts" onPress={onDone} /> : null}
        {phase === "pending" ? <LiveButton label="Check again" onPress={() => void checkAgain()} /> : null}
        {phase === "failed" || phase === "cancelled" ? <LiveButton label="Try again" onPress={() => setPhase("form")} /> : null}
        {phase !== "processing" && phase !== "succeeded" ? <LiveButton secondary label="Back to gifts" onPress={onDone} /> : null}
      </View>
    );
  }

  return (
    <>
      <CoinBalance balance={balance} />
      <View style={coin.packs}>
        {LIVE_COIN_PACKAGES.map((p) => {
          const active = p.id === pack.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityLabel={`${p.coins} coins for ${formatRwf(p.priceRwf)}`}
              accessibilityState={{ selected: active }}
              onPress={() => setPack(p)}
              style={[coin.pack, active ? coin.packActive : null]}
            >
              {"popular" in p ? <Text style={coin.popular}>POPULAR</Text> : null}
              <View style={[s.row, { gap: 5 }]}>
                <CoinIcon size={16} />
                <Text style={coin.packCoins}>{p.coins.toLocaleString("en-US")}</Text>
              </View>
              <Text style={coin.packPrice}>{formatRwf(p.priceRwf)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.label}>Pay with</Text>
      <View style={[s.row, { gap: 8 }]}>
        {LIVE_PAYMENT_METHODS.map((m) => {
          const active = m.id === method;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setMethod(m.id);
                setPhoneError("");
              }}
              style={[coin.method, active ? { borderColor: m.color, backgroundColor: "#FFFFFF10" } : null]}
            >
              <View style={[coin.methodDot, { backgroundColor: m.color }]} />
              <Text style={[s.label, { fontSize: 13 }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Mobile money number</Text>
        <View style={[coin.phone, phoneError ? { borderColor: c.danger } : null]}>
          <Text style={{ fontSize: 18 }}>🇷🇼</Text>
          <TextInput
            accessibilityLabel="Mobile money number"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError("");
            }}
            placeholder="078 123 4567"
            placeholderTextColor="#6B7590"
            keyboardType="phone-pad"
            maxLength={16}
            style={coin.phoneInput}
          />
        </View>
        {phoneError ? <Text accessibilityRole="alert" style={[s.error, { fontSize: 12 }]}>{phoneError}</Text> : null}
      </View>
      <LiveButton tone="live" label={`Pay ${formatRwf(pack.priceRwf)}`} onPress={() => void pay()} />
      <Text style={[s.body, { fontSize: 11, textAlign: "center" }]}>
        {USE_LIVE_PAYMENTS_API
          ? "You'll get a prompt on your phone to confirm with your PIN. Coins have no cash value and can't be refunded once sent as gifts."
          : "Test mode · no money is charged. Coins are added instantly so you can try gifting."}
      </Text>
    </>
  );
}

const coin = StyleSheet.create({
  balance: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: c.raised, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  balanceText: { color: c.text, fontSize: 15, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  recharge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#F5B700", paddingLeft: 13, paddingRight: 9, minHeight: 34, borderRadius: 17 },
  rechargeText: { color: "#1A1300", fontSize: 12, fontFamily: "Inter_700Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  gift: { width: "23.5%", alignItems: "center", gap: 3, paddingTop: 10, paddingBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: "transparent" },
  giftActive: { borderColor: c.red, backgroundColor: "#EF444418" },
  emoji: { fontSize: 30, lineHeight: 38 },
  giftName: { color: c.text, fontSize: 11, fontFamily: "Inter_500Medium", maxWidth: "92%" },
  price: { flexDirection: "row", alignItems: "center", gap: 3, minHeight: 22 },
  priceText: { color: c.muted, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  send: { minHeight: 22, paddingHorizontal: 12, borderRadius: 11, justifyContent: "center" },
  sendText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  packs: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  pack: { width: "31.5%", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.raised },
  packActive: { borderColor: "#F5B700", backgroundColor: "#F5B70014" },
  packCoins: { color: c.text, fontSize: 16, fontFamily: "Inter_700Bold" },
  packPrice: { color: c.muted, fontSize: 11, fontFamily: "Inter_500Medium" },
  popular: { position: "absolute", top: -8, backgroundColor: c.red, color: "#FFF", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  method: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: c.line },
  methodDot: { width: 12, height: 12, borderRadius: 6 },
  phone: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.raised },
  phoneInput: { flex: 1, minHeight: 50, color: c.text, fontSize: 16, fontFamily: "Inter_500Medium" },
});
