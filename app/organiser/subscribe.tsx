import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { COUNTRIES, PhoneInput, type Country } from "@/components/PhoneInput";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import {
  describeError,
  fetchSubscriptionPlans,
  formatPlanPrice,
  USE_ORGANISER_API,
  type DemoOutcome,
  type PaymentMethod,
  type SubscriptionPlan,
} from "@/services/organiserService";

type Phase = "form" | "processing" | "succeeded" | "failed" | "cancelled";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "mtn_momo", label: "MTN MoMo" },
  { id: "airtel_money", label: "Airtel Money" },
];

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_ORGANISER_API;

/** Splits a stored number like "+250 788 587 420" into a known country and the local digits. */
function splitPhone(phone?: string): { country: Country; local: string } {
  const compact = (phone ?? "").replace(/\s/g, "");
  const country = COUNTRIES.find((c) => compact.startsWith(c.code));
  return country
    ? { country, local: compact.slice(country.code.length) }
    : { country: COUNTRIES[0], local: compact.replace(/^\+/, "") };
}

export default function OrganiserSubscribeScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, subscribeAsOrganiser } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("mtn_momo");
  const initialPhone = splitPhone(user?.phone);
  const [country, setCountry] = useState<Country>(initialPhone.country);
  const [phone, setPhone] = useState(initialPhone.local);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [failure, setFailure] = useState("");
  const [demoOutcome, setDemoOutcome] = useState<DemoOutcome>("succeeded");

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const list = await fetchSubscriptionPlans();
      setPlans(list);
      setPlanId((current) => current ?? (list.find((p) => p.recommended) ?? list[0])?.id ?? null);
    } catch (error) {
      setPlansError(describeError(error, "We couldn't load subscription plans."));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // A payment in flight can't be abandoned from the app; block Android back until it settles.
  useEffect(() => {
    if (phase !== "processing") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [phase]);

  const selectedPlan = plans.find((p) => p.id === planId);
  const payerPhone = `${country.code}${phone.replace(/\D/g, "")}`;

  const openConfirm = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 12) {
      setPhoneError("Enter the mobile money number that will pay.");
      return;
    }
    setPhoneError(undefined);
    setConfirmOpen(true);
  };

  const pay = async () => {
    if (!selectedPlan) return;
    setConfirmOpen(false);
    setPhase("processing");
    const result = await subscribeAsOrganiser(
      { planId: selectedPlan.id, paymentMethod: method, payerPhone },
      demoOutcome,
    ).catch((error: unknown) => ({
      status: "failed" as const,
      message: describeError(error, "Something went wrong. Please try again."),
    }));
    if (result.status === "succeeded") {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase("succeeded");
    } else if (result.status === "cancelled") {
      setPhase("cancelled");
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFailure(result.message);
      setPhase("failed");
    }
  };

  const cancelBeforePaying = () => {
    setConfirmOpen(false);
    setPhase("cancelled");
  };

  const goToSetup = () => router.replace({ pathname: "/organiser/setup" as any, params: { from } });

  if (phase !== "form") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ gestureEnabled: phase !== "processing" }} />
        <OrganiserFlowHeader title="Subscription" step={2} canGoBack={phase !== "processing" && phase !== "succeeded"} />
        <View style={[styles.statusWrap, { paddingBottom: insets.bottom + 24 }]}>
          {phase === "processing" ? (
            <Animated.View entering={FadeIn} style={styles.status}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Waiting for payment</Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                Approve the {METHODS.find((m) => m.id === method)?.label} prompt sent to {payerPhone}.
                Keep this screen open until it's confirmed.
              </Text>
            </Animated.View>
          ) : (
            <StatusResult
              phase={phase}
              planLabel={selectedPlan ? `${selectedPlan.name} · ${formatPlanPrice(selectedPlan)}` : ""}
              renewsAt={user?.organiserSubscription?.renewsAt}
              failure={failure}
              onContinue={goToSetup}
              onRetry={() => setPhase("form")}
              onLeave={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserFlowHeader title="Subscription" step={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}>
          <Text style={[styles.title, { color: colors.foreground }]}>Choose your plan</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Organiser access is a subscription on your existing Eventis account.
          </Text>
        </Animated.View>

        {plansLoading ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Loading plans…</Text>
          </View>
        ) : plansError ? (
          <View style={[styles.inlineState, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{plansError}</Text>
            <Pressable
              style={[styles.smallBtn, { backgroundColor: colors.primary }]}
              onPress={loadPlans}
              accessibilityRole="button"
            >
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.planList} accessibilityRole="radiogroup">
            {plans.map((plan) => {
              const selected = plan.id === planId;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setPlanId(plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.card,
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                      {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                    {plan.recommended && (
                      <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>Best value</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planPrice, { color: colors.foreground }]}>{formatPlanPrice(plan)}</Text>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
                    </View>
                  ))}
                </Pressable>
              );
            })}
          </View>
        )}

        {!plansLoading && !plansError && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment method</Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => {
                  const selected = m.id === method;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMethod(m.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.methodChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.secondary,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="phone-portrait-outline" size={16} color={selected ? "#fff" : colors.mutedForeground} />
                      <Text style={[styles.methodText, { color: selected ? "#fff" : colors.foreground }]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.label, { color: colors.foreground }]}>Paying number</Text>
              <PhoneInput
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (phoneError) setPhoneError(undefined);
                }}
                selectedCountry={country}
                onSelectCountry={setCountry}
                error={phoneError}
              />
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                You'll get a prompt on this phone to approve the payment.
              </Text>
            </View>

            {SHOW_DEMO_CONTROLS && (
              <View style={[styles.demoBox, { borderColor: colors.border }]}>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Demo mode (no payments API yet) · simulate outcome
                </Text>
                <View style={styles.methodRow}>
                  {(["succeeded", "failed", "cancelled"] as DemoOutcome[]).map((o) => (
                    <Pressable
                      key={o}
                      onPress={() => setDemoOutcome(o)}
                      style={[
                        styles.demoChip,
                        { backgroundColor: demoOutcome === o ? colors.foreground : colors.secondary },
                      ]}
                    >
                      <Text style={[styles.demoChipText, { color: demoOutcome === o ? colors.background : colors.foreground }]}>
                        {o}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: selectedPlan ? colors.primary : colors.border }]}
              onPress={openConfirm}
              disabled={!selectedPlan}
              accessibilityRole="button"
            >
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {selectedPlan ? `Pay ${formatPlanPrice(selectedPlan)}` : "Select a plan"}
              </Text>
            </Pressable>
            <Text style={[styles.hint, styles.center, { color: colors.mutedForeground }]}>
              Renews automatically. You can cancel any time from your organiser dashboard.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={cancelBeforePaying}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setConfirmOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Confirm payment</Text>
            {selectedPlan && (
              <View style={[styles.summary, { borderColor: colors.border }]}>
                <SummaryRow label="Plan" value={`Organiser · ${selectedPlan.name}`} />
                <SummaryRow label="Amount" value={formatPlanPrice(selectedPlan)} />
                <SummaryRow label="Pay with" value={METHODS.find((m) => m.id === method)?.label ?? ""} />
                <SummaryRow label="Number" value={payerPhone} />
              </View>
            )}
            <Pressable style={[styles.primaryBtn, styles.stretch, { backgroundColor: colors.primary }]} onPress={pay}>
              <Text style={styles.primaryBtnText}>Pay now</Text>
            </Pressable>
            <Pressable onPress={cancelBeforePaying} style={styles.secondaryBtn} accessibilityRole="button">
              <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>Cancel payment</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function StatusResult({
  phase,
  planLabel,
  renewsAt,
  failure,
  onContinue,
  onRetry,
  onLeave,
}: {
  phase: "succeeded" | "failed" | "cancelled";
  planLabel: string;
  renewsAt?: string;
  failure: string;
  onContinue: () => void;
  onRetry: () => void;
  onLeave: () => void;
}) {
  const colors = useColors();
  const config = {
    succeeded: {
      icon: "checkmark-circle" as const,
      tint: colors.success,
      title: "Subscription active",
      text: `${planLabel}${renewsAt ? `\nRenews ${new Date(renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}\n\nOne last step: tell attendees about your organisation.`,
    },
    failed: {
      icon: "close-circle" as const,
      tint: colors.destructive,
      title: "Payment failed",
      text: failure || "Something went wrong with your payment. You have not been charged.",
    },
    cancelled: {
      icon: "remove-circle" as const,
      tint: colors.warning,
      title: "Payment cancelled",
      text: "You have not been charged. You can try again whenever you're ready.",
    },
  }[phase];

  return (
    <Animated.View entering={FadeIn} style={styles.status}>
      <View style={[styles.statusIcon, { backgroundColor: config.tint + "22" }]}>
        <Ionicons name={config.icon} size={44} color={config.tint} />
      </View>
      <Text style={[styles.statusTitle, { color: colors.foreground }]}>{config.title}</Text>
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{config.text}</Text>
      <View style={styles.statusActions}>
        {phase === "succeeded" ? (
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={onContinue}>
            <Text style={styles.primaryBtnText}>Set up your organisation</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Try again</Text>
            </Pressable>
            <Pressable onPress={onLeave} style={styles.secondaryBtn} accessibilityRole="button">
              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  planList: { gap: 12 },
  planCard: { gap: 8 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planName: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  planPrice: { fontSize: 20, fontFamily: "Inter_800ExtraBold" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  center: { textAlign: "center" },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  demoBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 12, gap: 8 },
  demoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  demoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inlineState: { alignItems: "center", gap: 12, paddingVertical: 24 },
  smallBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  smallBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stretch: { alignSelf: "stretch" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summary: { alignSelf: "stretch", borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { flexShrink: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  statusWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  status: { alignItems: "center", gap: 14 },
  statusIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, textAlign: "center" },
  statusActions: { alignSelf: "stretch", marginTop: 12, gap: 4 },
});
