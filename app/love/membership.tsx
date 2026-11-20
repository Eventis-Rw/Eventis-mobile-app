import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { Section } from "@/components/love/LoveProfileForm";
import { ReceiptPhotoPicker } from "@/components/payments/ReceiptPhotoPicker";
import { COUNTRIES, PhoneInput, type Country } from "@/components/PhoneInput";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { apiFetchInstallmentPlans, apiFindInstallmentPlan, type ApiInstallmentPlan } from "@/services/findLoveApi";
import {
  USE_FINDLOVE_API,
  type LoveDemoOutcome,
  type LovePaymentMethod,
} from "@/services/findLoveService";
import {
  fetchManualPaymentMethods,
  formatMinorAmount,
  submitManualPayment,
  uploadPaymentReceipt,
  type ManualPaymentMethod,
  type ManualPaymentSubmission,
} from "@/services/manualPaymentsService";
import {
  formatMembershipPrice,
  MEMBERSHIP_BENEFITS,
  MEMBERSHIP_INTERVALS,
  membershipPlan,
  type LoveAccountType,
  type MembershipInterval,
} from "@/utils/findLoveMembership";
import { formatDateOfBirth } from "@/utils/findLoveProfile";

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

const PROVIDER_LABEL: Record<ManualPaymentMethod["provider"], string> = { mtn_momo: "MTN MoMo", airtel_money: "Airtel Money" };

/** Splits a stored number like "+250 788 587 420" into a known country and the local digits. */
function splitPhone(phone?: string): { country: Country; local: string } {
  const compact = (phone ?? "").replace(/\s/g, "");
  const country = COUNTRIES.find((c) => compact.startsWith(c.code));
  return country
    ? { country, local: compact.slice(country.code.length) }
    : { country: COUNTRIES[0], local: compact.replace(/^\+/, "") };
}

/**
 * FindLove membership checkout. Two entirely separate flows, picked once at
 * the top so neither one's hooks or JSX ever mix:
 *  - ManualMembershipCheckout (EXPO_PUBLIC_USE_FINDLOVE_API=true): the real
 *    manual-payment flow (pick a method, pay out of band, upload a
 *    screenshot, wait for admin review).
 *  - DemoMembershipCheckout (flag off): the original local demo, untouched.
 */
export default function LoveMembershipScreen() {
  return USE_FINDLOVE_API ? <ManualMembershipCheckout /> : <DemoMembershipCheckout />;
}

// ---------------------------------------------------------------------------
// Real flow: manual payment (pick plan -> pick method & pay -> upload receipt -> submitted)
// ---------------------------------------------------------------------------

type RealStep = "plan" | "method" | "upload" | "result";

function ManualMembershipCheckout() {
  const colors = useColors();
  const router = useRouter();
  const { from, interval } = useLocalSearchParams<{ from?: string; interval?: string }>();
  const { user } = useAuth();
  const { myProfile, status, hasMembership, reload } = useMyLoveProfile();

  const [chosenType, setChosenType] = useState<LoveAccountType | null>(null);
  const [period, setPeriod] = useState<MembershipInterval>(
    MEMBERSHIP_INTERVALS.find((option) => option.id === interval)?.id ?? "month",
  );
  const [step, setStep] = useState<RealStep>("plan");
  const [resolvingPlan, setResolvingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [realPlan, setRealPlan] = useState<ApiInstallmentPlan | null>(null);

  // The account-type/billing-period picker shows live prices (and picks them
  // up the moment an admin changes a plan), instead of a hardcoded table.
  const [planCatalog, setPlanCatalog] = useState<Record<LoveAccountType, ApiInstallmentPlan[]>>({
    public: [],
    private: [],
  });
  const [planCatalogLoading, setPlanCatalogLoading] = useState(true);
  const [planCatalogError, setPlanCatalogError] = useState<string | null>(null);

  const loadPlanCatalog = async () => {
    setPlanCatalogLoading(true);
    setPlanCatalogError(null);
    try {
      const [publicPlans, privatePlans] = await Promise.all([
        apiFetchInstallmentPlans("public"),
        apiFetchInstallmentPlans("private"),
      ]);
      setPlanCatalog({ public: publicPlans, private: privatePlans });
    } catch (err) {
      setPlanCatalogError(describeError(err, "We couldn't load membership prices."));
    } finally {
      setPlanCatalogLoading(false);
    }
  };

  useEffect(() => {
    void loadPlanCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planFor = (accountType: LoveAccountType, intervalId: MembershipInterval) =>
    planCatalog[accountType].find((row) => row.interval === intervalId);
  const periodLabelFor = (intervalId: MembershipInterval) =>
    MEMBERSHIP_INTERVALS.find((option) => option.id === intervalId)?.periodLabel ?? intervalId;

  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ManualPaymentSubmission | null>(null);

  useEffect(() => {
    if (!submitting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [submitting]);

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

  const type: LoveAccountType = chosenType ?? (from === "upgrade" ? "private" : myProfile.membership.type);
  const plan = planFor(type, period);
  const price = plan ? formatMinorAmount(plan.priceMinor, plan.currency) : null;
  const periodLabel = periodLabelFor(period);

  const goToMethods = async () => {
    setPlanError(null);
    setResolvingPlan(true);
    try {
      const found = await apiFindInstallmentPlan(type, period);
      if (!found) {
        setPlanError("This plan isn't available right now. Try a different billing period.");
        return;
      }
      const list = await fetchManualPaymentMethods("findlove");
      setRealPlan(found);
      setMethods(list);
      setSelectedMethodId(list[0]?.id ?? null);
      setMethodsError(list.length ? null : "No payment method is available right now. Please try again later.");
      setStep("method");
    } catch (err) {
      setPlanError(describeError(err, "We couldn't load this plan. Please try again."));
    } finally {
      setResolvingPlan(false);
    }
  };

  const reloadMethods = async () => {
    setMethodsError(null);
    try {
      const list = await fetchManualPaymentMethods("findlove");
      setMethods(list);
      setSelectedMethodId(list[0]?.id ?? null);
      if (!list.length) setMethodsError("No payment method is available right now. Please try again later.");
    } catch (err) {
      setMethodsError(describeError(err, "We couldn't load payment methods. Please try again."));
    }
  };

  const copyPhone = async (phone: string) => {
    try {
      await Clipboard.setStringAsync(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail on web without a user gesture; nothing to show for it.
    }
  };

  const submit = async () => {
    if (!receiptUri || !selectedMethodId || !realPlan) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const receiptUploadId = await uploadPaymentReceipt(receiptUri);
      const created = await submitManualPayment({
        platform: "findlove",
        installmentPlanId: realPlan.id,
        paymentMethodId: selectedMethodId,
        receiptUploadId,
      });
      setSubmission(created);
      setStep("result");
      void reload();
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setSubmitError(describeError(err, "We couldn't submit your payment. Please try again."));
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "result" && submission) {
    return (
      <LoveScreenShell title="Membership" onBack={leave}>
        <View style={styles.status}>
          <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="time-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Payment submitted</Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            Reference <Text style={{ fontFamily: "Inter_700Bold" }}>{submission.reference}</Text>. We've sent your
            {" "}
            {submission.plan.name} payment screenshot for review. You'll get an email as soon as it's approved or if we
            need anything else.
          </Text>
          <PrimaryButton label="Track this payment" onPress={() => router.push("/love/payments" as any)} />
          <TextButton label="Back to FindLove" onPress={leave} />
        </View>
      </LoveScreenShell>
    );
  }

  if (step === "upload") {
    return (
      <LoveScreenShell title="Membership" onBack={() => setStep("method")} stepLabel="Upload receipt">
        <Stack.Screen options={{ gestureEnabled: !submitting }} />
        <Text style={[styles.lead, { color: colors.foreground }]}>Add your payment screenshot</Text>
        <Text style={[styles.leadText, { color: colors.mutedForeground }]}>
          A clear screenshot of the mobile money confirmation is enough. An admin reviews it and your {TYPE_LABEL[type]}
          {" "}
          membership starts as soon as it's approved.
        </Text>
        <ReceiptPhotoPicker
          uri={receiptUri}
          onPicked={(uri) => {
            setPhotoError(null);
            setReceiptUri(uri);
          }}
          onError={setPhotoError}
          colors={colors}
        />
        {photoError ? <InlineError message={photoError} /> : null}
        {submitError ? <InlineError message={submitError} /> : null}
        <PrimaryButton
          label={submitting ? "Submitting…" : "Submit for review"}
          onPress={() => void submit()}
          busy={submitting}
          disabled={!receiptUri}
        />
      </LoveScreenShell>
    );
  }

  if (step === "method") {
    const selectedMethod = methods.find((m) => m.id === selectedMethodId) ?? null;
    return (
      <LoveScreenShell title="Membership" onBack={() => setStep("plan")} stepLabel="Pay and continue">
        {methodsError && !methods.length ? (
          <SectionState kind="error" message={methodsError} onRetry={() => void reloadMethods()} />
        ) : (
          <>
            {methods.length > 1 ? (
              <Section title="Pay with">
                <View style={styles.methods} accessibilityRole="radiogroup">
                  {methods.map((m) => {
                    const selected = m.id === selectedMethodId;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setSelectedMethodId(m.id)}
                        style={[styles.method, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                      >
                        <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                        <Text style={[styles.methodLabel, { color: colors.foreground }]}>{PROVIDER_LABEL[m.provider]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            ) : null}

            {selectedMethod && realPlan ? (
              <Section title="Pay this number">
                <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.instructionsRow}>
                    <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                    <View style={styles.instructionsCopy}>
                      <Text style={[styles.instructionsLabel, { color: colors.mutedForeground }]}>
                        {PROVIDER_LABEL[selectedMethod.provider]}
                        {selectedMethod.accountName ? ` · ${selectedMethod.accountName}` : ""}
                      </Text>
                      <Text style={[styles.instructionsValue, { color: colors.foreground }]}>{selectedMethod.phoneNumber}</Text>
                    </View>
                    <Pressable
                      onPress={() => void copyPhone(selectedMethod.phoneNumber)}
                      style={[styles.copyBtn, { backgroundColor: colors.secondary }]}
                      accessibilityRole="button"
                      accessibilityLabel="Copy phone number"
                    >
                      <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.instructionsRow}>
                    <Ionicons name="cash-outline" size={20} color={colors.primary} />
                    <View style={styles.instructionsCopy}>
                      <Text style={[styles.instructionsLabel, { color: colors.mutedForeground }]}>Amount to pay</Text>
                      <Text style={[styles.instructionsValue, { color: colors.foreground }]}>{formatMinorAmount(realPlan.priceMinor, realPlan.currency)}</Text>
                    </View>
                  </View>
                  {selectedMethod.instructions ? (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.instructionsText, { color: colors.mutedForeground }]}>{selectedMethod.instructions}</Text>
                    </>
                  ) : null}
                </View>
              </Section>
            ) : null}

            <PrimaryButton label="I've paid — upload screenshot" onPress={() => setStep("upload")} disabled={!selectedMethodId} />
          </>
        )}
      </LoveScreenShell>
    );
  }

  // step === "plan"
  return (
    <LoveScreenShell title="Membership" onBack={leave} stepLabel={from === "create" ? "Last step" : undefined}>
      {hasMembership ? (
        <View style={[styles.activeBanner, { backgroundColor: colors.secondary }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[styles.activeBannerText, { color: colors.foreground }]}>
            You already have an active {TYPE_LABEL[myProfile.membership.type]} membership
            {myProfile.membership.expiresAt ? ` until ${formatDateOfBirth(myProfile.membership.expiresAt.slice(0, 10))}` : ""}.
          </Text>
        </View>
      ) : null}

      <Section title="Account type">
        <View style={styles.types} accessibilityRole="radiogroup">
          {(["public", "private"] as LoveAccountType[]).map((option) => {
            const selected = type === option;
            const optionPlan = planFor(option, period);
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
                  {optionPlan ? `${formatMinorAmount(optionPlan.priceMinor, optionPlan.currency)} / ${periodLabel}` : "Not available"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.periodHeading, { color: colors.foreground }]}>Choose a billing period</Text>
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
          {price ?? "Not available"}
          <Text style={[styles.period, { color: colors.mutedForeground }]}> / {periodLabel}</Text>
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

      {planCatalogError ? <InlineError message={planCatalogError} /> : null}
      {planError ? <InlineError message={planError} /> : null}
      {planCatalogError ? (
        <TextButton label="Try again" onPress={() => void loadPlanCatalog()} />
      ) : (
        <PrimaryButton
          label={planCatalogLoading ? "Loading…" : resolvingPlan ? "Loading…" : "Continue"}
          onPress={() => void goToMethods()}
          busy={resolvingPlan || planCatalogLoading}
          disabled={!plan}
        />
      )}
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        Your {TYPE_LABEL[type].toUpperCase()} membership starts only once we confirm and approve your payment.
      </Text>
    </LoveScreenShell>
  );
}

// ---------------------------------------------------------------------------
// Demo flow (EXPO_PUBLIC_USE_FINDLOVE_API off): unchanged local, mocked checkout.
// ---------------------------------------------------------------------------

type Phase = "form" | "processing" | "succeeded" | "pending" | "failed" | "cancelled";

/**
 * FindLove membership: pick Public or Private and a weekly, monthly or yearly
 * period (same periods for both, only the price differs), then pay with mobile
 * money. The plan turns on only when the server confirms the payment. Opened
 * after creating a profile (from=create), from the membership gate, or from an
 * upgrade prompt (from=upgrade, which preselects Private). Paid members can
 * switch between Public and Private from the same screen.
 */
function DemoMembershipCheckout() {
  const colors = useColors();
  const router = useRouter();
  const { from, interval } = useLocalSearchParams<{ from?: string; interval?: string }>();
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
  const [period, setPeriod] = useState<MembershipInterval>(
    MEMBERSHIP_INTERVALS.find((option) => option.id === interval)?.id ?? "month",
  );

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

  // Start on the member's current type; an upgrade prompt preselects Private.
  const type: LoveAccountType = chosenType ?? (from === "upgrade" ? "private" : myProfile.membership.type);
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

  if (shownPhase !== "form") {
    const done = activeNow;
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
              <View style={[styles.statusIcon, isPrivate ? styles.goldIcon : { backgroundColor: colors.secondary }]}>
                <Ionicons name={isPrivate ? "diamond" : "people"} size={30} color={isPrivate ? "#D4A017" : colors.primary} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Welcome to {TYPE_LABEL[type]}</Text>
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
            const optionPlan = membershipPlan(option, period);
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
                  {formatMembershipPrice(optionPlan.price)} / {optionPlan.periodLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.periodHeading, { color: colors.foreground }]}>Choose a billing period</Text>
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

function PrimaryButton({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const colors = useColors();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.primary, { backgroundColor: disabled ? colors.disabled : colors.primary, opacity: busy || pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
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
  periodHeading: { marginTop: 4, fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  lead: { fontSize: 22, letterSpacing: -0.6, fontFamily: "Inter_700Bold" },
  leadText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: -8 },
  activeBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 12 },
  activeBannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  instructionsCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  instructionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  instructionsCopy: { flex: 1, minWidth: 0 },
  instructionsLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  instructionsValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  instructionsText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  copyBtn: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth },
});
