import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { GlassSurface } from "@/components/GlassSurface";
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
  type SubscriptionInterval,
  type SubscriptionPlan,
} from "@/services/organiserService";

type Phase = "form" | "processing" | "succeeded" | "failed" | "cancelled";

const METHODS: { id: PaymentMethod; label: string; badge: string; color: string; bg: string }[] = [
  { id: "mtn_momo", label: "MTN MoMo", badge: "*182#", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" },
  { id: "airtel_money", label: "Airtel Money", badge: "*500#", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)" },
];

const INTERVAL_TABS: { id: SubscriptionInterval; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "day", label: "Daily", icon: "sunny-outline" },
  { id: "week", label: "Weekly", icon: "flash-outline" },
  { id: "month", label: "Monthly", icon: "diamond-outline" },
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

function computeExpiry(interval: SubscriptionInterval, duration: number): Date {
  const d = new Date();
  if (interval === "day") {
    d.setDate(d.getDate() + duration);
  } else if (interval === "week") {
    d.setDate(d.getDate() + duration * 7);
  } else if (interval === "month") {
    d.setMonth(d.getMonth() + duration);
  } else {
    d.setFullYear(d.getFullYear() + duration);
  }
  return d;
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

  const [selectedInterval, setSelectedInterval] = useState<SubscriptionInterval>("month");
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

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
    } catch (error) {
      setPlansError(describeError(error, "We couldn't load subscription plans."));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Find plan matching active interval
  const activePlan = useMemo(() => {
    return (
      plans.find((p) => p.interval === selectedInterval) ??
      plans.find((p) => p.recommended) ??
      plans[0]
    );
  }, [plans, selectedInterval]);

  // Durations available for this plan
  const availableDurations = useMemo(() => {
    if (activePlan?.durations && activePlan.durations.length > 0) {
      return activePlan.durations;
    }
    if (selectedInterval === "day") return [1, 3, 7];
    if (selectedInterval === "week") return [1, 2, 4];
    return [1, 3, 6, 12];
  }, [activePlan, selectedInterval]);

  // Ensure selected duration is valid for active interval
  useEffect(() => {
    if (!availableDurations.includes(selectedDuration)) {
      setSelectedDuration(availableDurations[0] ?? 1);
    }
  }, [availableDurations, selectedDuration]);

  // Lock back press during payment
  useEffect(() => {
    if (phase !== "processing") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [phase]);

  const payerPhone = `${country.code}${phone.replace(/\D/g, "")}`;
  const totalAmount = (activePlan?.price ?? 0) * selectedDuration;
  const expiryDate = useMemo(
    () => computeExpiry(selectedInterval, selectedDuration),
    [selectedInterval, selectedDuration],
  );

  const handleTabChange = (interval: SubscriptionInterval) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedInterval(interval);
  };

  const handleDurationSelect = (dur: number) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedDuration(dur);
  };

  const openConfirm = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 12) {
      setPhoneError("Enter a valid mobile money number.");
      return;
    }
    setPhoneError(undefined);
    setConfirmOpen(true);
  };

  const pay = async () => {
    if (!activePlan) return;
    setConfirmOpen(false);
    setPhase("processing");
    const result = await subscribeAsOrganiser(
      {
        planId: activePlan.id,
        paymentMethod: method,
        payerPhone,
        duration: selectedDuration,
      },
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
        <OrganiserFlowHeader
          title="Subscription"
          step={2}
          canGoBack={phase !== "processing" && phase !== "succeeded"}
        />
        <View style={[styles.statusWrap, { paddingBottom: insets.bottom + 24 }]}>
          {phase === "processing" ? (
            <Animated.View entering={FadeIn} style={styles.status}>
              <View style={styles.pulseContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Waiting for Payment</Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                A prompt for FRw {totalAmount.toLocaleString()} has been sent to{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{payerPhone}</Text> via{" "}
                {METHODS.find((m) => m.id === method)?.label}.
              </Text>
              <View style={[styles.promptTip, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#38BDF8" />
                <Text style={[styles.promptTipText, { color: colors.mutedForeground }]}>
                  Authorize on your handset. Keep this screen open until confirmed.
                </Text>
              </View>
            </Animated.View>
          ) : (
            <StatusResult
              phase={phase}
              planLabel={
                activePlan
                  ? `${activePlan.name} (${selectedDuration} ${selectedInterval}${selectedDuration > 1 ? "s" : ""}) · FRw ${totalAmount.toLocaleString()}`
                  : ""
              }
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

  const durationUnit = selectedDuration > 1 ? `${selectedInterval}s` : selectedInterval;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserFlowHeader title="Subscription" step={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO TITLE & BRANDING */}
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(50).springify() : undefined}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>EVENTIS ORGANISER PASS</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Flexible Organiser Plans</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Publish events, manage ticket sales, and track live attendee RSVPs with zero hassle.
          </Text>
        </Animated.View>

        {/* INTERVAL SELECTOR TABS (DAILY / WEEKLY / MONTHLY) */}
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(90).springify() : undefined}>
          <View style={[styles.tabSegmentContainer, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: colors.border }]}>
            {INTERVAL_TABS.map((tab) => {
              const active = selectedInterval === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabSegmentBtn,
                    active && styles.tabSegmentBtnActive,
                  ]}
                  onPress={() => handleTabChange(tab.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {active && (
                    <LinearGradient
                      colors={["rgba(56,189,248,0.25)", "rgba(56,189,248,0.1)"]}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.tabSegmentText,
                      { color: active ? colors.foreground : colors.mutedForeground },
                      active && styles.tabSegmentTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {plansLoading ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Loading plans…</Text>
          </View>
        ) : plansError ? (
          <GlassSurface style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.destructive} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{plansError}</Text>
            <Pressable
              style={[styles.smallBtn, { backgroundColor: colors.primary }]}
              onPress={loadPlans}
              accessibilityRole="button"
            >
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </GlassSurface>
        ) : activePlan ? (
          <>
            {/* MAIN GLASSMORPHIC PLAN CARD */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(120).springify() : undefined}>
              <GlassSurface style={styles.mainPlanCard}>
                <LinearGradient
                  colors={["rgba(56,189,248,0.08)", "rgba(139,92,246,0.03)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />

                {/* Card Header & Badge */}
                <View style={styles.planCardHeader}>
                  <View>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planCardTitle, { color: colors.foreground }]}>
                        {activePlan.name} Plan
                      </Text>
                      {activePlan.badge ? (
                        <View style={styles.planBadgeWrap}>
                          <Text style={styles.planBadgeText}>{activePlan.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    {activePlan.description ? (
                      <Text style={[styles.planCardDesc, { color: colors.mutedForeground }]}>
                        {activePlan.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Dynamic Price Display */}
                <View style={styles.priceContainer}>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceCurrency, { color: colors.primary }]}>FRw</Text>
                    <Text style={[styles.priceNumber, { color: colors.foreground }]}>
                      {totalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.priceSubtext, { color: colors.mutedForeground }]}>
                    FRw {activePlan.price.toLocaleString()} / {activePlan.interval} · for {selectedDuration} {durationUnit}
                  </Text>
                </View>

                {/* DURATION SELECTOR CHIPS */}
                <View style={styles.durationSection}>
                  <View style={styles.durationHeaderRow}>
                    <Text style={[styles.durationSectionLabel, { color: colors.foreground }]}>
                      Select Duration
                    </Text>
                    <Text style={[styles.durationHint, { color: colors.primary }]}>
                      {selectedDuration} {durationUnit} selected
                    </Text>
                  </View>

                  <View style={styles.durationChipsRow}>
                    {availableDurations.map((dur) => {
                      const isSelected = selectedDuration === dur;
                      const unitLabel = dur === 1 ? activePlan.interval : `${activePlan.interval}s`;
                      const durSavings =
                        dur >= 6 ? "Save 15%" : dur >= 3 && selectedInterval === "month" ? "Popular" : undefined;

                      return (
                        <Pressable
                          key={dur}
                          onPress={() => handleDurationSelect(dur)}
                          style={[
                            styles.durationChip,
                            {
                              backgroundColor: isSelected ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.05)",
                              borderColor: isSelected ? "#38BDF8" : "rgba(255,255,255,0.1)",
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          {durSavings ? (
                            <View style={styles.chipSavingsBadge}>
                              <Text style={styles.chipSavingsText}>{durSavings}</Text>
                            </View>
                          ) : null}
                          <Text
                            style={[
                              styles.durationChipText,
                              { color: isSelected ? "#38BDF8" : colors.foreground },
                              isSelected && styles.durationChipTextActive,
                            ]}
                          >
                            {dur} {unitLabel}
                          </Text>
                          <Text style={[styles.durationChipPrice, { color: colors.mutedForeground }]}>
                            FRw {(activePlan.price * dur).toLocaleString()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* DIVIDER */}
                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                {/* FEATURES LIST */}
                <View style={styles.featuresList}>
                  <Text style={[styles.featuresHeader, { color: colors.foreground }]}>
                    What's included:
                  </Text>
                  {activePlan.features.map((feature) => (
                    <View key={feature} style={styles.featureItem}>
                      <View style={styles.featureCheckWrap}>
                        <Ionicons name="checkmark" size={13} color="#38BDF8" />
                      </View>
                      <Text style={[styles.featureText, { color: colors.foreground }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </GlassSurface>
            </Animated.View>

            {/* PAYMENT METHOD SECTION */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
              <GlassSurface style={styles.sectionCard}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Payment Method
                </Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                  Select your preferred Mobile Money provider:
                </Text>

                {/* Method selector buttons */}
                <View style={styles.methodsGrid}>
                  {METHODS.map((m) => {
                    const isSelected = m.id === method;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                          setMethod(m.id);
                        }}
                        style={[
                          styles.methodCard,
                          {
                            backgroundColor: isSelected ? m.bg : "rgba(255,255,255,0.03)",
                            borderColor: isSelected ? m.color : colors.border,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={styles.methodHeader}>
                          <View style={[styles.methodRadioDot, { borderColor: isSelected ? m.color : colors.border }]}>
                            {isSelected ? <View style={[styles.methodRadioInner, { backgroundColor: m.color }]} /> : null}
                          </View>
                          <View style={[styles.methodBadge, { backgroundColor: m.color + "22" }]}>
                            <Text style={[styles.methodBadgeText, { color: m.color }]}>{m.badge}</Text>
                          </View>
                        </View>
                        <Text style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Phone Number Input */}
                <View style={styles.phoneInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                    Mobile Money Number
                  </Text>
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
                  <Text style={[styles.phoneHint, { color: colors.mutedForeground }]}>
                    You will receive an instant payment prompt on this handset.
                  </Text>
                </View>
              </GlassSurface>
            </Animated.View>

            {/* DEMO SWITCHER IN DEV */}
            {SHOW_DEMO_CONTROLS && (
              <View style={[styles.demoCard, { borderColor: colors.border }]}>
                <Text style={[styles.demoHint, { color: colors.mutedForeground }]}>
                  DEV DEMO MODE · SIMULATE PAYMENT
                </Text>
                <View style={styles.demoButtonsRow}>
                  {(["succeeded", "failed", "cancelled"] as DemoOutcome[]).map((outcome) => (
                    <Pressable
                      key={outcome}
                      onPress={() => setDemoOutcome(outcome)}
                      style={[
                        styles.demoChip,
                        {
                          backgroundColor:
                            demoOutcome === outcome ? colors.foreground : "rgba(255,255,255,0.06)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.demoChipText,
                          {
                            color: demoOutcome === outcome ? colors.background : colors.foreground,
                          },
                        ]}
                      >
                        {outcome}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ORDER SUMMARY STRIP */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}>
              <GlassSurface style={styles.summaryBox}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryItemLabel, { color: colors.mutedForeground }]}>
                    Plan
                  </Text>
                  <Text style={[styles.summaryItemValue, { color: colors.foreground }]}>
                    {activePlan.name} ({selectedDuration} {durationUnit})
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryItemLabel, { color: colors.mutedForeground }]}>
                    Access valid until
                  </Text>
                  <Text style={[styles.summaryItemValue, { color: "#38BDF8" }]}>
                    {expiryDate.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryTotalLabel, { color: colors.foreground }]}>
                    Total Due
                  </Text>
                  <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
                    FRw {totalAmount.toLocaleString()}
                  </Text>
                </View>
              </GlassSurface>
            </Animated.View>

            {/* CTA ACTION BUTTON */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(230).springify() : undefined}>
              <Pressable
                style={[
                  styles.primaryPayBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={openConfirm}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.2)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                <Text style={styles.primaryPayBtnText}>
                  Pay FRw {totalAmount.toLocaleString()} via{" "}
                  {METHODS.find((m) => m.id === method)?.label}
                </Text>
              </Pressable>

              <Text style={[styles.guaranteeText, { color: colors.mutedForeground }]}>
                🔒 Safe 256-bit encrypted checkout. No recurring charges without your explicit consent.
              </Text>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      {/* CONFIRMATION BOTTOM SHEET MODAL */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="slide"
        onRequestClose={cancelBeforePaying}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setConfirmOpen(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.12)", paddingBottom: insets.bottom + 28 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.25)" }]} />

            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIconWrap, { backgroundColor: `${colors.primary}22` }]}>
                <Ionicons name="card" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                Confirm Payment
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                You will receive a USSD payment prompt on your phone to complete this transaction.
              </Text>
            </View>

            {activePlan && (
              <View style={[styles.sheetSummaryCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }]}>
                <SummaryRow label="Plan" value={`${activePlan.name} Organiser Pass`} />
                <SummaryRow label="Duration" value={`${selectedDuration} ${durationUnit}`} />
                <SummaryRow
                  label="Expires On"
                  value={expiryDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
                <SummaryRow label="Provider" value={METHODS.find((m) => m.id === method)?.label ?? ""} />
                <SummaryRow label="Paying Number" value={payerPhone} />
                <View style={[styles.summaryDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
                <SummaryRow
                  label="Total Amount"
                  value={`FRw ${totalAmount.toLocaleString()}`}
                  isBold
                />
              </View>
            )}

            <Pressable
              style={[styles.primaryPayBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={pay}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryPayBtnText}>Authorize Payment</Text>
            </Pressable>

            <Pressable
              onPress={cancelBeforePaying}
              style={styles.cancelSheetBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>
                Cancel & Review
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({
  label,
  value,
  isBold = false,
}: {
  label: string;
  value: string;
  isBold?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }, isBold && { fontFamily: "Inter_600SemiBold", color: colors.foreground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: colors.foreground },
          isBold && { fontFamily: "Inter_700Bold", color: colors.primary, fontSize: 16 },
        ]}
      >
        {value}
      </Text>
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
      tint: "#10B981",
      title: "Subscription Activated!",
      text: `${planLabel}${renewsAt ? `\nActive through ${new Date(renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}\n\nYou now have full organiser capabilities. Set up your organisation details to start creating events.`,
    },
    failed: {
      icon: "close-circle" as const,
      tint: colors.destructive,
      title: "Payment Unsuccessful",
      text: failure || "The mobile money prompt was declined or expired. Your account has not been charged.",
    },
    cancelled: {
      icon: "alert-circle" as const,
      tint: colors.warning,
      title: "Payment Cancelled",
      text: "No charges were made. You can review your plan and try again whenever you're ready.",
    },
  }[phase];

  return (
    <Animated.View entering={FadeIn} style={styles.status}>
      <View style={[styles.statusIconWrap, { backgroundColor: config.tint + "20", borderColor: config.tint + "40" }]}>
        <Ionicons name={config.icon} size={48} color={config.tint} />
      </View>
      <Text style={[styles.statusTitle, { color: colors.foreground }]}>{config.title}</Text>
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{config.text}</Text>
      <View style={styles.statusActions}>
        {phase === "succeeded" ? (
          <Pressable style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]} onPress={onContinue}>
            <Text style={styles.primaryPayBtnText}>Set Up Organisation</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryPayBtnText}>Try Again</Text>
            </Pressable>
            <Pressable onPress={onLeave} style={styles.cancelSheetBtn} accessibilityRole="button">
              <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>Back to Discover</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },

  // Kicker
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#38BDF8" },
  kickerText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#38BDF8", letterSpacing: 1.2 },

  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },

  // Segment tabs
  tabSegmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    overflow: "hidden",
  },
  tabSegmentBtnActive: {
    backgroundColor: "rgba(56,189,248,0.14)",
  },
  tabSegmentText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tabSegmentTextActive: {
    fontFamily: "Inter_700Bold",
    color: "#38BDF8",
  },

  // Main plan card
  mainPlanCard: {
    borderRadius: 20,
    padding: 20,
    position: "relative",
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  planCardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  planBadgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(56,189,248,0.18)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#38BDF8",
    textTransform: "uppercase",
  },
  planCardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },

  // Price
  priceContainer: {
    marginTop: 18,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  priceCurrency: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  priceNumber: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  priceSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },

  // Durations
  durationSection: {
    marginTop: 10,
  },
  durationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  durationSectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  durationHint: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  durationChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationChip: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    position: "relative",
  },
  durationChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  durationChipTextActive: {
    fontFamily: "Inter_700Bold",
  },
  durationChipPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  chipSavingsBadge: {
    position: "absolute",
    top: -8,
    right: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipSavingsText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Divider
  cardDivider: {
    height: 1,
    marginVertical: 18,
  },

  // Features
  featuresList: {
    gap: 10,
  },
  featuresHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureCheckWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(56,189,248,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  // Section card
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },

  // Methods Grid
  methodsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  methodCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodRadioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  methodRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  methodLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Phone wrap
  phoneInputWrap: {
    marginTop: 6,
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  phoneHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Summary box
  summaryBox: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryItemValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },

  // Primary Pay Button
  primaryPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    overflow: "hidden",
  },
  primaryPayBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  guaranteeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },

  // Demo controls
  demoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  demoHint: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  demoButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  demoChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  demoChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },

  // Modal Sheet
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 14,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    alignItems: "center",
    gap: 8,
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  sheetSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  cancelSheetBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelSheetText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  // Status screens
  statusWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  status: {
    alignItems: "center",
    gap: 14,
    textAlign: "center",
  },
  pulseContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(56,189,248,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statusIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  promptTip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  promptTipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  statusActions: {
    width: "100%",
    gap: 12,
    marginTop: 16,
  },

  // Inline state
  inlineState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  errorCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
