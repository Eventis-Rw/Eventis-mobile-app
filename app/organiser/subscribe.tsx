import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { OrganiserSurface } from "@/components/OrganiserSurface";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { ReceiptPhotoPicker } from "@/components/payments/ReceiptPhotoPicker";
import { COUNTRIES, PhoneInput, type Country } from "@/components/PhoneInput";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import {
  describeError,
  fetchSubscriptionPlans,
  formatPlanPrice,
  intervalUnit,
  planTotal,
  USE_ORGANISER_API,
  type DemoOutcome,
  type PaymentMethod,
  type SubscriptionInterval,
  type SubscriptionPlan,
} from "@/services/organiserService";
import {
  fetchManualPaymentMethods,
  formatMinorAmount,
  isDuplicateManualPaymentError,
  submitManualPayment,
  uploadPaymentReceipt,
  type ManualPaymentMethod,
  type ManualPaymentSubmission,
} from "@/services/manualPaymentsService";

const MTN_LOGO = require("@/assets/images/mtn-logo.png");
const AIRTEL_LOGO = require("@/assets/images/airtel-logo.png");

const PROVIDER_LABEL: Record<ManualPaymentMethod["provider"], string> = { mtn_momo: "MTN MoMo", airtel_money: "Airtel Money" };

const USSD_CODES: Record<ManualPaymentMethod["provider"], string> = {
  mtn_momo: "*182*8*1*0202565#",
  airtel_money: "*185*9*33918481#",
};

const MERCHANT_NAME = "Travelis Rwanda Ltd";

const DEFAULT_MANUAL_METHODS: ManualPaymentMethod[] = [
  {
    id: "momo-mtn",
    provider: "mtn_momo",
    platform: "organiser",
    accountName: MERCHANT_NAME,
    phoneNumber: "0202565",
    instructions: "Pay to Travelis Rwanda Ltd using code *182*8*1*0202565#",
    currency: "RWF",
    displayOrder: 1,
  },
  {
    id: "airtel-money",
    provider: "airtel_money",
    platform: "organiser",
    accountName: MERCHANT_NAME,
    phoneNumber: "33918481",
    instructions: "Pay to Travelis Rwanda Ltd using code *185*9*33918481#",
    currency: "RWF",
    displayOrder: 2,
  },
];

type Phase = "form" | "processing" | "succeeded" | "failed" | "cancelled";

const METHODS: { id: PaymentMethod; label: string; badge: string; color: string; bg: string }[] = [
  { id: "mtn_momo", label: "MTN MoMo", badge: "*182#", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" },
  { id: "airtel_money", label: "Airtel Money", badge: "*500#", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)" },
];

const INTERVAL_TABS: { id: SubscriptionInterval; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "post", label: "Per post", icon: "document-text-outline" },
  { id: "month", label: "Monthly", icon: "calendar-outline" },
  { id: "quarter", label: "Quarterly", icon: "layers-outline" },
  { id: "year", label: "Yearly", icon: "diamond-outline" },
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

/** End date of a time-based plan; a post pack never expires. */
function computeExpiry(interval: SubscriptionInterval, duration: number): Date | null {
  if (interval === "post") return null;
  const d = new Date();
  if (interval === "month") d.setMonth(d.getMonth() + duration);
  else if (interval === "quarter") d.setMonth(d.getMonth() + duration * 3);
  else d.setFullYear(d.getFullYear() + duration);
  return d;
}

const formatDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Organiser plan checkout. Two entirely separate flows, picked once at the
 * top so neither one's hooks or JSX ever mix:
 *  - ManualSubscribeCheckout (EXPO_PUBLIC_USE_ORGANISER_API=true): the real
 *    manual-payment flow (pick a method, pay out of band, upload a
 *    screenshot, wait for admin review).
 *  - DemoSubscribeCheckout (flag off): the original local demo, untouched.
 */
export default function OrganiserSubscribeScreen() {
  return USE_ORGANISER_API ? <ManualSubscribeCheckout /> : <DemoSubscribeCheckout />;
}

// ---------------------------------------------------------------------------
// Real flow: manual payment (pick plan -> pick method & pay -> upload receipt -> submitted)
// ---------------------------------------------------------------------------

type RealStep = "plan" | "method" | "upload" | "result";

function ManualSubscribeCheckout() {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, refreshOrganiserSubscription } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const sortedPlans = useMemo(() => {
    const ORDER: Record<SubscriptionInterval, number> = {
      month: 1, // Hero 1-Month at the top
      post: 2,
      quarter: 3,
      year: 4,
    };
    return [...plans].sort((a, b) => (ORDER[a.interval] ?? 99) - (ORDER[b.interval] ?? 99));
  }, [plans]);

  const [step, setStep] = useState<RealStep>("plan");
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [resolvingMethods, setResolvingMethods] = useState(false);
  const [copied, setCopied] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicatePayment, setDuplicatePayment] = useState(false);
  const [submission, setSubmission] = useState<ManualPaymentSubmission | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const list = await fetchSubscriptionPlans();
      setPlans(list);
      setSelectedPlanId((current) => current ?? list.find((p) => p.interval === "month")?.id ?? list.find((p) => p.recommended)?.id ?? list[0]?.id ?? null);
    } catch (error) {
      setPlansError(describeError(error, "We couldn't load subscription plans."));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!submitting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [submitting]);

  const activePlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  if (!isLoading && !user?.isDemo && !user?.serverRoles?.includes("organizer_owner") && user?.organiserApplication?.status !== "PENDING_PAYMENT") {
    return <Redirect href={"/organiser" as any} />;
  }

  const goToMethods = async () => {
    if (!activePlan) return;
    setResolvingMethods(true);
    setMethodsError(null);
    try {
      const list = await fetchManualPaymentMethods("organiser").catch(() => []);
      const resolved = list.length > 0 ? list : DEFAULT_MANUAL_METHODS;
      setMethods(resolved);
      setSelectedMethodId(resolved[0]?.id ?? null);
      setStep("method");
    } catch {
      setMethods(DEFAULT_MANUAL_METHODS);
      setSelectedMethodId(DEFAULT_MANUAL_METHODS[0]?.id ?? null);
      setStep("method");
    } finally {
      setResolvingMethods(false);
    }
  };

  const reloadMethods = async () => {
    setMethodsError(null);
    try {
      const list = await fetchManualPaymentMethods("organiser").catch(() => []);
      const resolved = list.length > 0 ? list : DEFAULT_MANUAL_METHODS;
      setMethods(resolved);
      setSelectedMethodId(resolved[0]?.id ?? null);
    } catch {
      setMethods(DEFAULT_MANUAL_METHODS);
      setSelectedMethodId(DEFAULT_MANUAL_METHODS[0]?.id ?? null);
    }
  };

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 3500);
    } catch {}
  };

  const dialToPay = async (targetMethod: ManualPaymentMethod) => {
    const code = USSD_CODES[targetMethod.provider] ?? (targetMethod.provider === "mtn_momo" ? "*182*8*1*0202565#" : "*185*9*33918481#");
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    // 1. Copy the specific USSD code to clipboard
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 4000);
    } catch {}

    // 2. Open phone dialer
    const dialUrl = `tel:${encodeURIComponent(code)}`;
    const fallbackUrl = `tel:${encodeURIComponent(targetMethod.phoneNumber.replace(/\s+/g, ""))}`;

    try {
      const canOpen = await Linking.canOpenURL(dialUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(dialUrl);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch {
      void Linking.openURL(fallbackUrl).catch(() => {});
    }
  };

  const chooseFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) {
        setPhotoError(null);
        setReceiptUri(result.assets[0].uri);
      }
    } catch {
      setPhotoError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const takeCameraPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError("Allow camera access to photograph your payment screenshot, or choose one from your photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) {
        setPhotoError(null);
        setReceiptUri(result.assets[0].uri);
      }
    } catch {
      setPhotoError("We couldn't open the camera. Try choosing a photo instead.");
    }
  };

  const promptPhotoPick = () => {
    if (Platform.OS === "web") {
      void chooseFromGallery();
      return;
    }
    Alert.alert(
      "Upload proof of payment",
      "Please upload a screenshot or take a photo of your payment confirmation.",
      [
        { text: "Upload screenshot", onPress: () => void chooseFromGallery() },
        { text: "Take photo", onPress: () => void takeCameraPhoto() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const submit = async () => {
    if (!receiptUri || !selectedMethodId || !activePlan) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const receiptUploadId = await uploadPaymentReceipt(receiptUri);
      const created = await submitManualPayment({
        platform: "organiser",
        organiserPlanId: activePlan.id,
        paymentMethodId: selectedMethodId,
        receiptUploadId,
      });
      setSubmission(created);
      setConfirmModalVisible(false);
      setStep("result");
      void refreshOrganiserSubscription().catch((error) => {
        console.warn("Could not refresh organiser access:", error);
      });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setSubmitError(describeError(error, "We couldn't submit your payment. Please try again."));
      setDuplicatePayment(isDuplicateManualPaymentError(error));
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "result" && submission) {
    return (
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <OrganiserFlowHeader title="Choose packages" step={2} canGoBack={false} />
        <ScrollView contentContainerStyle={[styles.statusWrap, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn} style={styles.status}>
            <View style={[styles.statusIconWrap, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
              <Ionicons name="time-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>Payment submitted</Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              Reference {submission.reference} · {formatMinorAmount(submission.amountMinor, submission.currency)}
              {"\n\n"}
              We've sent your {submission.plan.name} payment screenshot for review. You'll get an email as soon as
              it's approved or if we need anything else.
            </Text>
            <View style={styles.statusActions}>
              <Pressable
                style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/organiser/payments" as any)}
              >
                <Text style={styles.primaryPayBtnText}>Track this payment</Text>
              </Pressable>
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
                style={styles.cancelSheetBtn}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>Back to Discover</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  if (submitError && duplicatePayment) {
    return (
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <OrganiserFlowHeader title="Upload receipt" step={2} canGoBack={false} />
        <ScrollView contentContainerStyle={[styles.statusWrap, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn} style={styles.status}>
            <View style={[styles.statusIconWrap, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.primary}40` }]}>
              <Ionicons name="time-outline" size={48} color={colors.warning} />
            </View>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>Payment already submitted</Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{submitError}</Text>
            <View style={styles.statusActions}>
              <Pressable
                style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/organiser/payments" as any)}
              >
                <Text style={styles.primaryPayBtnText}>View my payments</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace("/(tabs)" as any)}
                style={styles.cancelSheetBtn}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>Back to home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  if (step === "upload") {
    return (
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <Stack.Screen options={{ gestureEnabled: !submitting }} />
        <OrganiserFlowHeader title="Upload receipt" step={2} canGoBack={!submitting} onBack={() => setStep("method")} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: palette.text, fontSize: 22 }]}>Upload proof of payment</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Please upload a clear screenshot of your payment confirmation message as proof of payment. An admin reviews it and your organiser access is activated once verified.
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
          {photoError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{photoError}</Text> : null}
          {submitError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{submitError}</Text> : null}
          {submitError ? (
            <Pressable
              onPress={() => router.replace("/(tabs)" as any)}
              style={styles.cancelSheetBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelSheetText, { color: palette.accent }]}>Back to home</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={!receiptUri || submitting}
            style={[styles.primaryPayBtn, { backgroundColor: colors.primary, opacity: !receiptUri || submitting ? 0.6 : 1 }]}
            onPress={() => void submit()}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
            <Text style={styles.primaryPayBtnText}>{submitting ? "Submitting…" : "Submit for review"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (step === "method") {
    const selectedMethod = methods.find((m) => m.id === selectedMethodId) ?? null;
    const activeUssdCode = selectedMethod ? (USSD_CODES[selectedMethod.provider] ?? "*182*8*1*0202565#") : "*182*8*1*0202565#";

    return (
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <OrganiserFlowHeader title="Pay and continue" step={2} canGoBack={true} onBack={() => setStep("plan")} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Top Amount to Pay to Travelis Rwanda Ltd Banner */}
          {activePlan ? (
            <View style={[styles.invoiceCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <View style={styles.invoiceRow}>
                <View style={styles.invoiceColLeft}>
                  <Text style={[styles.invoiceLabel, { color: palette.muted }]}>Amount to pay</Text>
                  <View style={styles.invoiceAmountRow}>
                    <Text style={[styles.invoiceCurrencyTag, { color: palette.accent }]}>RWF</Text>
                    <Text style={[styles.invoiceAmountValue, { color: palette.text }]}>
                      {activePlan.price.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.invoicePlanName, { color: palette.muted }]}>{activePlan.name}</Text>
                </View>

                <View style={[styles.invoiceVerticalDivider, { backgroundColor: palette.line }]} />

                <View style={styles.invoiceColRight}>
                  <Text style={[styles.invoiceLabel, { color: palette.muted }]}>Pay to</Text>
                  <Text style={[styles.invoicePayToName, { color: palette.text }]} numberOfLines={2}>
                    {MERCHANT_NAME}
                  </Text>
                  <View style={styles.merchantBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={palette.accent} />
                    <Text style={[styles.merchantBadgeText, { color: palette.accent }]}>Official Merchant</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* Network Selection */}
          <View style={styles.methodSelectionSection}>
            <Text style={[styles.sectionTitle, { color: palette.text, fontSize: 16 }]}>Select payment network</Text>
            <View style={styles.methodsVerticalList}>
              {methods.map((m) => {
                const isSelected = m.id === selectedMethodId;
                const isMtn = m.provider === "mtn_momo";
                const logo = isMtn ? MTN_LOGO : AIRTEL_LOGO;
                const ussdCode = USSD_CODES[m.provider] ?? (isMtn ? "*182*8*1*0202565#" : "*185*9*33918481#");
                const isCodeCopied = copiedCode === ussdCode;

                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedMethodId(m.id)}
                    style={[
                      styles.logoMethodCard,
                      {
                        backgroundColor: isSelected
                          ? (palette.dark ? "rgba(56,189,248,0.10)" : "rgba(14,165,233,0.07)")
                          : palette.surface,
                        borderColor: isSelected ? palette.accent : palette.line,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.logoContainer, { backgroundColor: isMtn ? "#FFCC00" : "#FFFFFF" }]}>
                      <Image source={logo} style={styles.providerLogoImg} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                      <Text style={[styles.methodTitleText, { color: palette.text }]}>{PROVIDER_LABEL[m.provider]}</Text>
                      <View style={styles.methodCodeRow}>
                        <Text style={[styles.methodUssdCodeBadge, { color: palette.accent }]}>{ussdCode}</Text>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            void copyCode(ussdCode);
                          }}
                          style={[
                            styles.miniCopyBtn,
                            {
                              backgroundColor: isCodeCopied ? (palette.accent + "25") : palette.surfaceRaised,
                              borderColor: isCodeCopied ? palette.accent : palette.line,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Copy ${PROVIDER_LABEL[m.provider]} code`}
                        >
                          <Ionicons
                            name={isCodeCopied ? "checkmark" : "copy-outline"}
                            size={12}
                            color={isCodeCopied ? palette.accent : palette.text}
                          />
                          <Text style={[styles.miniCopyText, { color: isCodeCopied ? palette.accent : palette.text }]}>
                            {isCodeCopied ? "Copied" : "Copy"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.premiumRadio,
                        {
                          borderColor: isSelected ? palette.accent : palette.line,
                          backgroundColor: isSelected ? (palette.dark ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.12)") : "transparent",
                        },
                      ]}
                    >
                      {isSelected ? <View style={[styles.premiumRadioDot, { backgroundColor: palette.accent }]} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Copied Feedback Toast */}
          {copiedCode ? (
            <View style={[styles.copiedAlertPill, { backgroundColor: palette.accent + "18", borderColor: palette.accent + "40" }]}>
              <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
              <Text style={[styles.copiedAlertText, { color: palette.accent }]}>
                Code {copiedCode} copied to clipboard!
              </Text>
            </View>
          ) : null}

          {/* Dial to Pay Button */}
          {selectedMethod ? (
            <Pressable
              style={[styles.dialPayBtn, { backgroundColor: palette.accent }]}
              onPress={() => void dialToPay(selectedMethod)}
              accessibilityRole="button"
            >
              <Ionicons name="call" size={18} color="#000000" />
              <Text style={styles.dialPayBtnText}>Dial to pay</Text>
            </Pressable>
          ) : null}

          {/* NB Notice Card */}
          {selectedMethod && activePlan ? (
            <View style={[styles.nbNoticeCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <View style={styles.nbHeaderRow}>
                <Ionicons name="information-circle" size={17} color={palette.accent} />
                <Text style={[styles.nbTitle, { color: palette.accent }]}>NB:</Text>
              </View>
              <Text style={[styles.nbBodyText, { color: palette.text }]}>
                Please keep a screenshot of your payment confirmation message for verification. Tap <Text style={{ color: palette.accent, fontFamily: "Inter_700Bold" }}>I have paid</Text> below to upload your screenshot or take a photo to confirm.
              </Text>
            </View>
          ) : null}

          {/* I have paid Button */}
          <Pressable
            disabled={!selectedMethodId || submitting}
            style={[
              styles.primaryPayBtn,
              {
                backgroundColor: colors.primary,
                opacity: !selectedMethodId || submitting ? 0.6 : 1,
                marginTop: 10,
              },
            ]}
            onPress={() => setConfirmModalVisible(true)}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryPayBtnText}>I have paid</Text>
          </Pressable>

          {/* Confirm Payment Modal (brought up by I have paid) */}
          <Modal
            visible={confirmModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => {
              if (!submitting) setConfirmModalVisible(false);
            }}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => {
                if (!submitting) setConfirmModalVisible(false);
              }}
            >
              <Pressable
                style={[
                  styles.confirmModalCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.line,
                    paddingBottom: insets.bottom + 20,
                  },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHandle} />

                {!receiptUri ? (
                  <>
                    <View style={styles.modalHeader}>
                      <View style={[styles.modalIconWrap, { backgroundColor: palette.accent + "18" }]}>
                        <Ionicons name="receipt-outline" size={24} color={palette.accent} />
                      </View>
                      <Text style={[styles.modalTitle, { color: palette.text }]}>Confirm payment</Text>
                      <Text style={[styles.modalSubtitle, { color: palette.muted }]}>
                        Upload a screenshot or take a photo of your payment confirmation to confirm.
                      </Text>
                    </View>

                    <View style={styles.modalActionButtons}>
                      <Pressable
                        style={[styles.modalActionBtn, { backgroundColor: palette.accent }]}
                        onPress={() => void chooseFromGallery()}
                        accessibilityRole="button"
                      >
                        <Ionicons name="images-outline" size={20} color="#000000" />
                        <Text style={styles.modalActionBtnTextDark}>Upload screenshot</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.modalActionBtn, { backgroundColor: palette.surfaceRaised, borderColor: palette.line, borderWidth: 1 }]}
                        onPress={() => void takeCameraPhoto()}
                        accessibilityRole="button"
                      >
                        <Ionicons name="camera-outline" size={20} color={palette.text} />
                        <Text style={[styles.modalActionBtnText, { color: palette.text }]}>Take photo</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: palette.text }]}>Confirm payment</Text>
                      <Text style={[styles.modalSubtitle, { color: palette.muted }]}>
                        Payment screenshot attached. Confirm to submit for verification.
                      </Text>
                    </View>

                    <View style={styles.modalPreviewWrap}>
                      <Image source={{ uri: receiptUri }} style={styles.modalPreviewImage} resizeMode="cover" />
                      <Pressable
                        onPress={() => setReceiptUri(undefined)}
                        style={styles.modalRemoveBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remove screenshot"
                      >
                        <Ionicons name="close-circle" size={26} color="#EF4444" />
                      </Pressable>
                    </View>

                    <View style={styles.modalConfirmActions}>
                      <Pressable
                        disabled={submitting}
                        style={[
                          styles.primaryPayBtn,
                          {
                            backgroundColor: colors.primary,
                            opacity: submitting ? 0.6 : 1,
                          },
                        ]}
                        onPress={() => void submit()}
                        accessibilityRole="button"
                      >
                        {submitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryPayBtnText}>Confirm and submit</Text>
                          </>
                        )}
                      </Pressable>

                      <Pressable
                        disabled={submitting}
                        onPress={() => void chooseFromGallery()}
                        style={styles.modalRetakeBtn}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.modalRetakeText, { color: palette.accent }]}>Change photo</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {photoError ? <Text style={[styles.errorText, { color: colors.destructive, textAlign: "center" }]}>{photoError}</Text> : null}
                {submitError ? <Text style={[styles.errorText, { color: colors.destructive, textAlign: "center" }]}>{submitError}</Text> : null}

                {!submitting ? (
                  <Pressable
                    onPress={() => setConfirmModalVisible(false)}
                    style={styles.modalCancelBtn}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalCancelText, { color: palette.muted }]}>Cancel</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </View>
    );
  }

  // step === "plan"
  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Choose packages" step={2} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: palette.text, fontSize: 19, letterSpacing: -0.3 }]}>Choose packages</Text>
        </View>

        {plansLoading ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Loading plans…</Text>
          </View>
        ) : plansError ? (
          <OrganiserSurface style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.destructive} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{plansError}</Text>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => void loadPlans()} accessibilityRole="button">
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </OrganiserSurface>
        ) : sortedPlans.length === 0 ? (
          <OrganiserSurface style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Ionicons name="pricetags-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>No plans are available right now.</Text>
          </OrganiserSurface>
        ) : (
          <View style={styles.gridContainer}>
            {sortedPlans.map((plan) => {
              const selected = plan.id === selectedPlanId;
              const isRecommended = plan.interval === "month";
              const billingPeriod =
                plan.interval === "month"
                  ? "/ month"
                  : plan.interval === "post"
                  ? "/ post"
                  : plan.interval === "quarter"
                  ? "/ 3 months"
                  : "/ year";

              const highlightSubtext =
                plan.interval === "month"
                  ? "Unlimited events"
                  : plan.interval === "post"
                  ? "1 event listing"
                  : plan.interval === "quarter"
                  ? "3 mo · Save 12%"
                  : "1 yr · Best rate";

              return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    setSelectedPlanId(plan.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={styles.gridItemWrapper}
                >
                  <View
                    style={[
                      styles.gridCard,
                      {
                        backgroundColor: selected
                          ? (palette.dark ? "rgba(56,189,248,0.08)" : "rgba(14,165,233,0.06)")
                          : palette.surface,
                        borderColor: selected
                          ? palette.accent
                          : isRecommended
                          ? (palette.dark ? "rgba(56,189,248,0.45)" : "rgba(14,165,233,0.4)")
                          : palette.line,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    {/* Top Row: Badge or space + Radio Indicator */}
                    <View style={styles.gridCardTopRow}>
                      {isRecommended ? (
                        <View style={[styles.heroBadgePill, { backgroundColor: palette.accent }]}>
                          <Text style={styles.heroBadgeText}>RECOMMENDED</Text>
                        </View>
                      ) : plan.badge && plan.badge !== "Recommended" ? (
                        <View style={[styles.subBadgePill, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
                          <Text style={[styles.subBadgeText, { color: palette.muted }]}>{plan.badge}</Text>
                        </View>
                      ) : (
                        <View style={{ height: 22 }} />
                      )}

                      <View
                        style={[
                          styles.premiumRadio,
                          {
                            borderColor: selected ? palette.accent : palette.line,
                            backgroundColor: selected ? (palette.dark ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.12)") : "transparent",
                          },
                        ]}
                      >
                        {selected ? <View style={[styles.premiumRadioDot, { backgroundColor: palette.accent }]} /> : null}
                      </View>
                    </View>

                    {/* Middle: Plan Name & Tagline */}
                    <View style={styles.gridCardMiddle}>
                      <Text style={[styles.gridPlanName, { color: palette.text }]}>{plan.name}</Text>
                      <Text style={[styles.gridPlanSubtext, { color: palette.muted }]}>{highlightSubtext}</Text>
                    </View>

                    {/* Bottom: Price */}
                    <View style={styles.gridCardPriceBlock}>
                      <View style={styles.priceRowInline}>
                        <Text style={[styles.priceCurrencyTag, { color: isRecommended ? palette.accent : palette.muted }]}>RWF</Text>
                        <Text style={[styles.gridPriceNumber, { color: palette.text }]}>
                          {plan.price.toLocaleString()}
                        </Text>
                      </View>
                      <Text style={[styles.gridPricePeriod, { color: palette.muted }]}>
                        {billingPeriod}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          disabled={!activePlan}
          style={[styles.primaryPayBtn, { backgroundColor: colors.primary, marginTop: 4, opacity: activePlan ? 1 : 0.6 }]}
          onPress={() => void goToMethods()}
        >
          {resolvingMethods ? <ActivityIndicator color="#fff" /> : null}
          <Text style={styles.primaryPayBtnText}>{resolvingMethods ? "Loading…" : "Continue"}</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Demo flow (EXPO_PUBLIC_USE_ORGANISER_API off): unchanged local, mocked checkout.
// ---------------------------------------------------------------------------

function DemoSubscribeCheckout() {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
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

  const intervalTabs = useMemo(
    () => INTERVAL_TABS.filter((tab) => plans.some((plan) => plan.interval === tab.id)),
    [plans],
  );

  useEffect(() => {
    if (intervalTabs.length && !intervalTabs.some((tab) => tab.id === selectedInterval)) {
      const preferred = intervalTabs.find((t) => t.id === "month") ?? intervalTabs[0];
      setSelectedInterval(preferred.id);
    }
  }, [intervalTabs, selectedInterval]);

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
    return selectedInterval === "post" ? [1, 2] : [1];
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
  const totalAmount = activePlan ? planTotal(activePlan, selectedDuration) : 0;
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
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <Stack.Screen options={{ gestureEnabled: phase !== "processing" }} />
        <OrganiserFlowHeader
          title="Choose packages"
          step={2}
          canGoBack={phase !== "processing" && phase !== "succeeded"}
        />
        <ScrollView contentContainerStyle={[styles.statusWrap, { paddingBottom: insets.bottom + 24 }]}>
          {phase === "processing" ? (
            <Animated.View entering={FadeIn} style={styles.status}>
              <View style={styles.pulseContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>Waiting for Payment</Text>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                A prompt for RWF {totalAmount.toLocaleString()} has been sent to{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{payerPhone}</Text> via{" "}
                {METHODS.find((m) => m.id === method)?.label}.
              </Text>
              <View style={[styles.promptTip, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
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
                  ? `${activePlan.name} (${selectedDuration} ${intervalUnit(selectedInterval, selectedDuration)}) · RWF ${totalAmount.toLocaleString()}`
                  : ""
              }
              renewsAt={user?.organiserSubscription?.renewsAt}
              failure={failure}
              onContinue={goToSetup}
              postPack={activePlan?.interval === "post"}
              onPostNow={() => router.replace("/business/create-event" as any)}
              onRetry={() => setPhase("form")}
              onLeave={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  const durationUnit = intervalUnit(selectedInterval, selectedDuration);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Choose packages" step={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO TITLE & BRANDING */}
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(50).springify() : undefined}>
          <Text style={[styles.title, { color: palette.text, fontSize: 19, letterSpacing: -0.3 }]}>Choose packages</Text>
        </Animated.View>

        {/* INTERVAL SELECTOR TABS (DAILY / WEEKLY / MONTHLY) */}
        {intervalTabs.length > 1 ? <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(90).springify() : undefined}>
          <View style={[styles.tabSegmentContainer, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            {intervalTabs.map((tab) => {
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
                    color={active ? palette.accent : palette.muted}
                  />
                  <Text
                    style={[
                      styles.tabSegmentText,
                      { color: active ? palette.text : palette.muted },
                      active && styles.tabSegmentTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>

                </Pressable>
              );
            })}
          </View>
        </Animated.View> : null}

        {plansLoading ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Loading plans…</Text>
          </View>
        ) : plansError ? (
          <OrganiserSurface style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.destructive} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{plansError}</Text>
            <Pressable
              style={[styles.smallBtn, { backgroundColor: colors.primary }]}
              onPress={loadPlans}
              accessibilityRole="button"
            >
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </OrganiserSurface>
        ) : activePlan ? (
          <>
            {/* MAIN GLASSMORPHIC PLAN CARD */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(120).springify() : undefined}>
              <OrganiserSurface style={[styles.mainPlanCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>

                {/* Card Header & Badge */}
                <View style={styles.planCardHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planCardTitle, { color: palette.text }]}>
                        {activePlan.name} access
                      </Text>
                      {activePlan.interval === "month" ? (
                        <View style={[styles.heroBadgePill, { backgroundColor: palette.accent }]}>
                          <Text style={styles.heroBadgeText}>RECOMMENDED</Text>
                        </View>
                      ) : activePlan.badge && activePlan.badge !== "Recommended" ? (
                        <View style={[styles.subBadgePill, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
                          <Text style={[styles.subBadgeText, { color: palette.muted }]}>{activePlan.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    {activePlan.description ? (
                      <Text style={[styles.planCardDesc, { color: palette.muted }]}>
                        {activePlan.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Dynamic Price Display */}
                <View style={styles.priceContainer}>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceCurrency, { color: palette.accent }]}>RWF</Text>
                    <Text style={[styles.priceNumber, { color: palette.text }]}>
                      {totalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.priceSubtext, { color: palette.muted }]}>
                    {activePlan.bundlePrices?.[selectedDuration]
                      ? `${selectedDuration} ${durationUnit}`
                      : `RWF ${activePlan.price.toLocaleString()} per ${activePlan.interval} · ${selectedDuration} ${durationUnit}`}
                  </Text>
                </View>

                {/* DURATION SELECTOR CHIPS (only when there is a choice) */}
                {availableDurations.length > 1 ? <View style={styles.durationSection}>
                  <View style={styles.durationHeaderRow}>
                    <Text style={[styles.durationSectionLabel, { color: palette.text }]}>
                      {selectedInterval === "post" ? "How many posts?" : "Access duration"}
                    </Text>
                    <Text style={[styles.durationHint, { color: palette.accent }]}>
                      {selectedDuration} {durationUnit} selected
                    </Text>
                  </View>

                  <View style={styles.durationChipsRow}>
                    {availableDurations.map((dur) => {
                      const isSelected = selectedDuration === dur;
                      const unitLabel = intervalUnit(activePlan.interval, dur);
                      const durSavings = undefined;

                      return (
                        <Pressable
                          key={dur}
                          onPress={() => handleDurationSelect(dur)}
                          style={[
                            styles.durationChip,
                            {
                              backgroundColor: isSelected ? palette.blueSoft : palette.surfaceRaised,
                              borderColor: isSelected ? palette.blue : palette.line,
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
                              { color: isSelected ? palette.blue : palette.text },
                              isSelected && styles.durationChipTextActive,
                            ]}
                          >
                            {dur} {unitLabel}
                          </Text>
                          <Text style={[styles.durationChipPrice, { color: palette.muted }]}>
                            RWF {planTotal(activePlan, dur).toLocaleString()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View> : null}

                {/* DIVIDER */}
                <View style={[styles.cardDivider, { backgroundColor: palette.line }]} />

                {/* FEATURES LIST */}
                <View style={styles.featuresList}>
                  <Text style={[styles.featuresHeader, { color: palette.text }]}>
                    Workspace access includes
                  </Text>
                  {activePlan.features.map((feature) => (
                    <View key={feature} style={styles.featureItem}>
                      <View style={styles.featureCheckWrap}>
                        <Ionicons name="checkmark" size={13} color={colors.primary} />
                      </View>
                      <Text style={[styles.featureText, { color: palette.text }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </OrganiserSurface>
            </Animated.View>

            {/* PAYMENT METHOD SECTION */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
              <OrganiserSurface style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Pay with Mobile Money
                </Text>
                <Text style={[styles.sectionSub, { color: palette.muted }]}>
                  Choose the provider linked to your phone number.
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
                            backgroundColor: isSelected ? m.bg : palette.surfaceRaised,
                            borderColor: isSelected ? m.color : palette.line,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={styles.methodHeader}>
                          <View style={[styles.methodRadioDot, { borderColor: isSelected ? m.color : palette.line }]}>
                            {isSelected ? <View style={[styles.methodRadioInner, { backgroundColor: m.color }]} /> : null}
                          </View>
                          <View style={[styles.methodBadge, { backgroundColor: m.color + "22" }]}>
                            <Text style={[styles.methodBadgeText, { color: m.color }]}>{m.badge}</Text>
                          </View>
                        </View>
                        <Text style={[styles.methodLabel, { color: palette.text }]}>{m.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Phone Number Input */}
                <View style={styles.phoneInputWrap}>
                  <Text style={[styles.inputLabel, { color: palette.text }]}>
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
                  <Text style={[styles.phoneHint, { color: palette.muted }]}>
                    You will receive an instant payment prompt on this handset.
                  </Text>
                </View>
              </OrganiserSurface>
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
              <OrganiserSurface style={[styles.summaryBox, { backgroundColor: palette.surface, borderColor: palette.line }]}>
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
                    Valid until
                  </Text>
                  <Text style={[styles.summaryItemValue, { color: "#38BDF8" }]}>
                    {expiryDate ? formatDate(expiryDate) : "No expiry"}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryTotalLabel, { color: colors.foreground }]}>
                    Total Due
                  </Text>
                  <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
                    RWF {totalAmount.toLocaleString()}
                  </Text>
                </View>
              </OrganiserSurface>
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
                  Pay RWF {totalAmount.toLocaleString()} via{" "}
                  {METHODS.find((m) => m.id === method)?.label}
                </Text>
              </Pressable>

              <Text style={[styles.guaranteeText, { color: palette.muted }]}>
                You will confirm the payment on the selected Mobile Money number.
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
              { backgroundColor: palette.surface, borderColor: palette.line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: palette.line }]} />
            <ScrollView contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>

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
              <View style={[styles.sheetSummaryCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
                <SummaryRow label="Plan" value={`${activePlan.name} Organiser Pass`} />
                <SummaryRow label="Duration" value={`${selectedDuration} ${durationUnit}`} />
                <SummaryRow
                  label="Expires On"
                  value={expiryDate ? formatDate(expiryDate) : "No expiry"}
                />
                <SummaryRow label="Provider" value={METHODS.find((m) => m.id === method)?.label ?? ""} />
                <SummaryRow label="Paying Number" value={payerPhone} />
                <View style={[styles.summaryDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
                <SummaryRow
                  label="Total Amount"
                  value={`RWF ${totalAmount.toLocaleString()}`}
                  isBold
                />
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryPayBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={pay}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryPayBtnText}>Authorize Payment</Text>
            </Pressable>

            <Pressable
              onPress={() => setConfirmOpen(false)}
              style={styles.cancelSheetBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>
                Review details
              </Text>
            </Pressable>
            </ScrollView>
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
  const colors = useOrganiserColors();
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
  postPack,
  onPostNow,
  onRetry,
  onLeave,
}: {
  phase: "succeeded" | "failed" | "cancelled";
  planLabel: string;
  renewsAt?: string;
  failure: string;
  onContinue: () => void;
  /** A pay-per-post purchase: the buyer can post right away without an organisation. */
  postPack: boolean;
  onPostNow: () => void;
  onRetry: () => void;
  onLeave: () => void;
}) {
  const colors = useOrganiserColors();
  const config = {
    succeeded: {
      icon: "checkmark-circle" as const,
      tint: "#10B981",
      title: postPack ? "Your post is ready" : "Organiser access activated",
      text: postPack
        ? `${planLabel}\n\nPost your event now. You can set up an organisation later if you want a public profile and more tools.`
        : `${planLabel}${renewsAt ? `\nActive through ${new Date(renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}\n\nYou now have full organiser capabilities. Set up your organisation details to start creating events.`,
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
          <>
            <Pressable style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]} onPress={postPack ? onPostNow : onContinue}>
              <Text style={styles.primaryPayBtnText}>{postPack ? "Post My Event Now" : "Set Up Organisation"}</Text>
            </Pressable>
            {postPack ? (
              <Pressable onPress={onContinue} style={styles.cancelSheetBtn} accessibilityRole="button">
                <Text style={[styles.cancelSheetText, { color: colors.mutedForeground }]}>Set up an organisation instead</Text>
              </Pressable>
            ) : null}
          </>
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

  title: { fontSize: 19, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 2 },
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
  },

  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planCardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 12,
  },
  planFeaturesWrap: {
    marginTop: 12,
    gap: 8,
  },
  planFeaturesDivider: {
    height: 1,
    marginBottom: 6,
  },
  planFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  tabMiniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: -2,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  gridItemWrapper: {
    width: "48%",
    borderRadius: 18,
  },
  gridCard: {
    borderRadius: 18,
    padding: 13,
    minHeight: 146,
    justifyContent: "space-between",
  },
  gridCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 24,
  },
  gridCardMiddle: {
    gap: 2,
    marginVertical: 4,
  },
  gridPlanName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  gridPlanSubtext: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
  },
  gridCardPriceBlock: {
    gap: 1,
  },
  gridPriceNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  gridPricePeriod: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  compactPlanCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  compactPlanLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
    gap: 3,
  },
  compactPlanTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  compactPlanName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  compactPlanSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  compactPlanRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compactPriceWrap: {
    alignItems: "flex-end",
  },
  priceRowInline: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceCurrencyTag: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  compactPriceNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  compactPricePeriod: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  invoiceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  invoiceColLeft: {
    flex: 1.1,
    gap: 2,
  },
  invoiceColRight: {
    flex: 1,
    paddingLeft: 14,
    gap: 3,
  },
  invoiceLabel: {
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  invoiceAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 2,
  },
  invoiceCurrencyTag: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  invoiceAmountValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  invoicePlanName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  invoiceVerticalDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 2,
  },
  invoicePayToName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  merchantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  merchantBadgeText: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
  },
  methodCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  methodUssdCodeBadge: {
    fontSize: 12.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  miniCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniCopyText: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
  },
  methodSelectionSection: {
    gap: 12,
  },
  methodsVerticalList: {
    gap: 10,
  },
  logoMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  logoContainer: {
    width: 46,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 3,
  },
  providerLogoImg: {
    width: "100%",
    height: "100%",
  },
  methodTitleText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  methodUssdText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  nbNoticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  nbHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nbTitle: {
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
  nbBodyText: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  confirmModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalHeader: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  modalActionButtons: {
    gap: 10,
    marginTop: 4,
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 26,
    gap: 10,
  },
  modalActionBtnTextDark: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  modalActionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalPreviewWrap: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    marginVertical: 4,
  },
  modalPreviewImage: {
    width: "100%",
    height: "100%",
  },
  modalRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
  },
  modalConfirmActions: {
    gap: 10,
  },
  modalRetakeBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalRetakeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 13.5,
    fontFamily: "Inter_500Medium",
  },
  headerBlock: {
    marginBottom: 4,
  },
  premiumCard: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPlanTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  heroBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontFamily: "Inter_800ExtraBold",
    color: "#000000",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  subBadgeText: {
    fontSize: 9.5,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  premiumRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardPlanDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: -2,
  },
  cardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  cardPriceCurrency: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cardPriceAmount: {
    fontSize: 27,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
  },
  cardPricePeriod: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  cardFeaturesWrap: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 2,
    gap: 8,
  },
  cardFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardFeatureCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
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
    flexWrap: "wrap",
    gap: 8,
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
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryItemValue: {
    flexShrink: 1,
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

  dialPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 10,
    marginTop: 4,
  },
  dialPayBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  copiedAlertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -4,
  },
  copiedAlertText: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  stepsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  stepsCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  stepsList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  stepText: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  // Primary Pay Button
  primaryPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 10,
    overflow: "hidden",
  },
  primaryPayBtnText: {
    flexShrink: 1,
    textAlign: "center",
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
  sheetContent: { gap: 18 },
  sheet: {
    maxHeight: "90%",
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
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    flexShrink: 1,
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
    flexGrow: 1,
    paddingTop: 24,
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
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: -6,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: -4,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
