import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { Section } from "@/components/love/LoveProfileForm";
import { COUNTRIES, PhoneInput, type Country } from "@/components/PhoneInput";
import { SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import {
  USE_FINDLOVE_API,
  type LoveDemoOutcome,
  type LovePaymentMethod,
} from "@/services/findLoveService";
import {
  cheapestPlan,
  formatMembershipPrice,
  MEMBERSHIP_BENEFITS,
  MEMBERSHIP_INTERVALS,
  membershipPlan,
  type LoveAccountType,
  type MembershipInterval,
} from "@/utils/findLoveMembership";
import { formatDateOfBirth } from "@/utils/findLoveProfile";

type Phase = "form" | "processing" | "succeeded" | "pending" | "failed" | "cancelled";

const METHODS: { id: LovePaymentMethod; label: string; badge: string; color: string }[] = [
  { id: "mtn_momo", label: "MTN MoMo", badge: "*182#", color: "#F59E0B" },
  { id: "airtel_money", label: "Airtel Money", badge: "*500#", color: "#EF4444" },
];

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_FINDLOVE_API;

const TYPE_LABEL: Record<LoveAccountType, string> = { public: "Public", private: "Private" };

const TYPE_DESCRIPTION: Record<LoveAccountType, string> = {
  public: "Discover everyone and connect with Public members.",
  private: "Connect with anyone, including Private members.",
};

/** Splits a stored number like "+250 788 587 420" into a known country and the local digits. */
function splitPhone(phone?: string): { country: Country; local: string } {
  const compact = (phone ?? "").replace(/\s/g, "");
  const country = COUNTRIES.find((c) => compact.startsWith(c.code));
  return country
    ? { country, local: compact.slice(country.code.length) }
    : { country: COUNTRIES[0], local: compact.replace(/^\+/, "") };
}

/**
 * FindLove membership: pick Public or Private and a weekly, monthly or yearly
 * period (same periods for both, only the price differs), then pay with mobile
 * money. The plan turns on only when the server confirms the payment. Opened
 * after creating a profile (from=create), from the membership gate, or from an
 * upgrade prompt (from=upgrade, which preselects Private).
 */
export default function LoveMembershipScreen() {
  const colors = useColors();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuth();
  const { myProfile, status, accountType, hasMembership, buyMembership, reload } = useMyLoveProfile();

  const initialPhone = splitPhone(user?.phone);
  const [method, setMethod] = useState<LovePaymentMethod>("mtn_momo");
  const [country, setCountry] = useState<Country>(initialPhone.country);
  const [phone, setPhone] = useState(initialPhone.local);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("form");
  const [failure, setFailure] = useState("");
  const [checking, setChecking] = useState(false);
  const [demoOutcome, setDemoOutcome] = useState<LoveDemoOutcome>("succeeded");
  const [chosenType, setChosenType] = useState<LoveAccountType | null>(null);
  const [period, setPeriod] = useState<MembershipInterval>("month");

  // Leaving mid-payment would hide the result, so the back button waits.
  useEffect(() => {
    if (phase !== "processing") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [phase]);

  const leave = () => {
    if (from === "create" || !router.canGoBack()) router.replace("/love" as any);
    else router.back();
  };

  if (!user || status !== "ready" || !myProfile) {
    return (
      <LoveScreenShell title="Membership" onBack={leave}>
        {status === "loading" || status === "idle" ? (
          <SectionState kind="loading" message="Loading your membership…" />
        ) : (
          <SectionState
            kind="empty"
            icon="heart-outline"
            title="Create your FindLove profile first"
            message="Your membership is added to your FindLove profile."
            actionLabel="Create profile"
            onAction={() => router.replace("/love/create" as any)}
          />
        )}
      </LoveScreenShell>
    );
  }

  // Paid Public members are here to upgrade; everyone else starts on the type they chose.
  const type: LoveAccountType = chosenType ?? (from === "upgrade" || hasMembership ? "private" : myProfile.membership.type);
  const plan = membershipPlan(type, period);
  const price = formatMembershipPrice(plan.price);

  const pay = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 12) {
      setPhoneError("Enter a valid mobile money number.");
      return;
    }
    setPhoneError(undefined);
    setPhase("processing");
    const result = await buyMembership(
      { type, interval: period, paymentMethod: method, payerPhone: `${country.code}${digits}` },
      demoOutcome,
    ).catch(
      (err: unknown) => ({ status: "failed" as const, message: describeError(err, "We couldn't reach the payment service.") }),
    );
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(
        result.status === "succeeded" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      );
    }
    if (result.status === "failed") setFailure(result.message);
    setPhase(result.status);
  };

  const checkAgain = async () => {
    setChecking(true);
    await reload();
    setChecking(false);
  };

  // The result follows the server: "paid" without the plan being active still waits.
  const activeNow = hasMembership && myProfile.membership.type === type;
  const isPrivate = accountType === "private";
  const shownPhase: Phase = phase === "succeeded" && !activeNow ? "pending" : phase === "pending" && activeNow ? "succeeded" : phase;
  const expires = myProfile.membership.expiresAt ? formatDateOfBirth(myProfile.membership.expiresAt.slice(0, 10)) : null;

  // Private already includes everything, so a Private member sees their plan, not a checkout.
  if (shownPhase !== "form" || (isPrivate && phase === "form")) {
    const done = phase === "form" ? isPrivate : activeNow;
    return (
      <LoveScreenShell title="Membership" onBack={phase === "processing" ? () => undefined : leave}>
        <Stack.Screen options={{ gestureEnabled: phase !== "processing" }} />
        <View style={styles.status}>
          {shownPhase === "processing" ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Waiting for your payment</Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                Approve the {price} prompt on your phone. Keep this screen open.
              </Text>
            </>
          ) : done ? (
            <>
              <View style={[styles.statusIcon, styles.goldIcon]}>
                <Ionicons name="diamond" size={30} color="#D4A017" />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                {phase === "form" ? "You're a Private member" : `Welcome to ${TYPE_LABEL[type]}`}
              </Text>
              <MembershipBadge type={accountType} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                {isPrivate ? "You can now connect with Private and Public members." : "You can now connect and chat with Public members."}
                {expires ? ` Your membership runs until ${expires}.` : ""}
              </Text>
              <PrimaryButton label="Continue to FindLove" onPress={leave} />
            </>
          ) : shownPhase === "pending" ? (
            <>
              <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time-outline" size={30} color={colors.warning} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Waiting for confirmation</Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                We haven't had confirmation of your payment yet. Your {TYPE_LABEL[type]} plan starts as soon as it
                arrives.
              </Text>
              <PrimaryButton label={checking ? "Checking…" : "Check again"} onPress={() => void checkAgain()} busy={checking} />
              <TextButton label="Close" onPress={leave} />
            </>
          ) : (
            <>
              <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons
                  name={shownPhase === "cancelled" ? "close-circle-outline" : "alert-circle-outline"}
                  size={30}
                  color={shownPhase === "cancelled" ? colors.mutedForeground : colors.destructive}
                />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                {shownPhase === "cancelled" ? "Payment cancelled" : "Payment didn't go through"}
              </Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                {shownPhase === "cancelled" ? "You haven't been charged. Your plan hasn't changed." : `${failure} Your plan hasn't changed.`}
              </Text>
              <PrimaryButton label="Try again" onPress={() => setPhase("form")} />
              <TextButton label="Close" onPress={leave} />
            </>
          )}
        </View>
      </LoveScreenShell>
    );
  }

  return (
    <LoveScreenShell title="Membership" onBack={leave} stepLabel={from === "create" ? "Last step" : undefined}>
      <Section title="Account type">
        <View style={styles.types} accessibilityRole="radiogroup">
          {(["public", "private"] as LoveAccountType[]).map((option) => {
            const selected = type === option;
            const cheapest = cheapestPlan(option);
            return (
              <Pressable
                key={option}
                onPress={() => setChosenType(option)}
                style={[styles.typeOption, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={styles.typeHead}>
                  <MembershipBadge type={option} size="sm" />
                  <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                </View>
                <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{TYPE_DESCRIPTION[option]}</Text>
                <Text style={[styles.typeFrom, { color: colors.foreground }]}>
                  From {formatMembershipPrice(cheapest.price)} / {cheapest.periodLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Billing period">
        <View style={[styles.periods, { backgroundColor: colors.secondary }]} accessibilityRole="radiogroup">
          {MEMBERSHIP_INTERVALS.map((option) => {
            const selected = period === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setPeriod(option.id)}
                style={[styles.periodTab, selected && { backgroundColor: colors.card }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.periodTabText, { color: selected ? colors.foreground : colors.mutedForeground }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <View style={[styles.plan, { backgroundColor: colors.card, borderColor: type === "private" ? "#D4A017" : colors.border }]}>
        <MembershipBadge type={type} />
        <Text style={[styles.price, { color: colors.foreground }]}>
          {price}
          <Text style={[styles.period, { color: colors.mutedForeground }]}> / {plan.periodLabel}</Text>
        </Text>
        <View style={styles.benefits}>
          {MEMBERSHIP_BENEFITS[type].map((benefit) => (
            <View key={benefit} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      <Section title="Pay with">
        <View style={styles.methods} accessibilityRole="radiogroup">
          {METHODS.map((m) => {
            const selected = method === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMethod(m.id)}
                style={[styles.method, { backgroundColor: colors.card, borderColor: selected ? m.color : colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? m.color : colors.mutedForeground} />
                <Text style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</Text>
                <Text style={[styles.methodBadge, { color: m.color }]}>{m.badge}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Mobile money number" hint="You'll get a payment prompt on this phone.">
        <PhoneInput
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (phoneError) setPhoneError(undefined);
          }}
          selectedCountry={country}
          onSelectCountry={setCountry}
          error={phoneError}
        />
      </Section>

      {SHOW_DEMO_CONTROLS ? (
        <View style={[styles.demo, { borderColor: colors.border }]}>
          <Text style={[styles.demoTitle, { color: colors.mutedForeground }]}>DEMO · SIMULATE PAYMENT</Text>
          <View style={styles.demoRow}>
            {(["succeeded", "failed", "cancelled"] as LoveDemoOutcome[]).map((outcome) => (
              <Pressable
                key={outcome}
                onPress={() => setDemoOutcome(outcome)}
                style={[styles.demoChip, { backgroundColor: demoOutcome === outcome ? colors.foreground : colors.secondary }]}
              >
                <Text style={[styles.demoChipText, { color: demoOutcome === outcome ? colors.background : colors.foreground }]}>{outcome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <PrimaryButton label={`Pay ${price}`} onPress={() => void pay()} />
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        Your {TYPE_LABEL[type].toUpperCase()} membership starts only after the payment is confirmed.
      </Text>
    </LoveScreenShell>
  );
}

function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy || pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ busy }}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.textBtn} accessibilityRole="button">
      <Text style={[styles.textBtnText, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plan: { borderRadius: 22, borderWidth: 1.5, padding: 18, gap: 10 },
  price: { fontSize: 30, letterSpacing: -0.8, fontFamily: "Inter_700Bold" },
  period: { fontSize: 15, fontFamily: "Inter_500Medium" },
  benefits: { gap: 9, marginTop: 4 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  types: { flexDirection: "row", gap: 10 },
  typeOption: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 8 },
  typeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  typeFrom: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  periods: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  periodTab: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  periodTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  methods: { flexDirection: "row", gap: 10 },
  method: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, padding: 12, minHeight: 52 },
  methodLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  methodBadge: { fontSize: 11, fontFamily: "Inter_700Bold" },
  demo: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 12, gap: 8 },
  demoTitle: { fontSize: 11, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  demoRow: { flexDirection: "row", gap: 8 },
  demoChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  demoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  primary: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -6 },
  textBtn: { minHeight: 44, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  textBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  status: { alignItems: "center", paddingVertical: 32, gap: 14 },
  statusIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  goldIcon: { backgroundColor: "rgba(212,160,23,0.16)" },
  statusTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 420 },
});
