import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { OrganiserSurface } from "@/components/OrganiserSurface";
import { FormField } from "@/components/OrganisationForm";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import {
  demoReviewBusinessVerification,
  describeProfileError,
  fetchPublisherProfile,
  submitBusinessVerification,
  updatePublisherProfile,
  USE_PROFILE_API,
  validateBusinessVerification,
  type BusinessVerificationInput,
  type BusinessVerificationStatus,
} from "@/services/profileService";
import { normaliseWebsite } from "@/utils/profileValidation";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const STATUS: Record<BusinessVerificationStatus, { title: string; body: string; icon: IconName; tone: "success" | "warning" | "destructive" | "mutedForeground" }> = {
  unverified: {
    title: "Get verified to sell tickets",
    body: "Free events don't need this. To publish paid events, send us your business details below.",
    icon: "shield-outline",
    tone: "mutedForeground",
  },
  pending: {
    title: "Verification in review",
    body: "We're checking your documents, usually within 1–2 working days. We'll notify you when it's done.",
    icon: "time-outline",
    tone: "warning",
  },
  verified: {
    title: "Your business is verified",
    body: "You can now publish paid events. Customers pay on your website.",
    icon: "shield-checkmark",
    tone: "success",
  },
  rejected: {
    title: "Verification declined",
    body: "Fix the issue below and submit again.",
    icon: "alert-circle",
    tone: "destructive",
  },
};

const EMPTY: BusinessVerificationInput = {
  legalName: "",
  registrationNumber: "",
  taxId: "",
  representativeName: "",
  paymentWebsite: "",
  registrationDocumentUri: "",
};

/** Business verification: requirements, status, the submission form and next steps. */
export default function BusinessVerificationScreen() {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const capabilities = useAccountCapabilities();
  const { verification, verificationLoading, verificationError, refreshVerification, setVerification } = capabilities;
  const organisation = user?.organisation;

  const [form, setForm] = useState<BusinessVerificationInput>(EMPTY);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Start from what the business already entered in Edit Profile.
  useEffect(() => {
    if (!user || prefilled) return;
    let cancelled = false;
    fetchPublisherProfile(user.id)
      .then((profile) => {
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          legalName: f.legalName || profile.legalName || organisation?.name || "",
          registrationNumber: f.registrationNumber || profile.registrationNumber || "",
          taxId: f.taxId || profile.taxId || "",
          representativeName: f.representativeName || user.username,
          paymentWebsite: f.paymentWebsite || organisation?.website || "",
        }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setPrefilled(true));
    return () => {
      cancelled = true;
    };
  }, [user, organisation, prefilled]);

  if (!user || !organisation) {
    return (
      <View style={[styles.root, { backgroundColor: palette.canvas }]}>
        <OrganiserAtmosphere />
        <PortalScreenHeader title="Verification" />
        <View style={styles.content}>
          <SectionState
            kind="empty"
            icon="business-outline"
            title="Set up your organisation first"
            message="Business verification belongs to an organisation."
            actionLabel="Set up organisation"
            onAction={() => router.replace("/business/edit-organisation" as any)}
          />
        </View>
      </View>
    );
  }

  const status = verification?.status ?? capabilities.businessVerification ?? "unverified";
  const copy = STATUS[status];
  const canSubmit = status === "unverified" || status === "rejected";
  const phoneVerified = user.isPhoneVerified;

  const set = (key: keyof BusinessVerificationInput, value: string) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const pickDocument = async () => {
    setDocError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!result.canceled) set("registrationDocumentUri", result.assets[0].uri);
    } catch {
      setDocError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const submit = async () => {
    const input = { ...form, paymentWebsite: normaliseWebsite(form.paymentWebsite) ?? "" };
    const problem = validateBusinessVerification(input);
    if (problem) {
      setError(problem);
      return;
    }
    if (!phoneVerified) {
      setError("Verify your phone number first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitBusinessVerification(user.id, organisation.id, phoneVerified, input);
      // Keep the profile's legal identity in step with what was submitted.
      await updatePublisherProfile(user.id, {
        legalName: input.legalName.trim(),
        registrationNumber: input.registrationNumber.trim(),
        taxId: input.taxId.replace(/\s/g, ""),
      }).catch(() => {});
      setVerification(result);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(describeProfileError(err, "We couldn't submit your details. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const simulateReview = async (outcome: "verified" | "rejected") => {
    setReviewing(true);
    try {
      setVerification(await demoReviewBusinessVerification(user.id, organisation.id, outcome));
    } catch (err) {
      setError(describeProfileError(err, "Couldn't update the demo review."));
    } finally {
      setReviewing(false);
    }
  };

  const requirements = verification?.requirements ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserAtmosphere />
      <PortalScreenHeader title="Verification" disabled={submitting} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {verificationLoading && !verification ? (
          <SectionState kind="loading" message="Loading verification status…" />
        ) : verificationError && !verification ? (
          <SectionState kind="error" message={verificationError} onRetry={() => void refreshVerification()} />
        ) : (
          <>
            <OrganiserSurface style={styles.statusCard}>
              <Ionicons name={copy.icon} size={28} color={colors[copy.tone]} />
              <View style={styles.flex}>
                <Text style={[styles.statusTitle, { color: colors.foreground }]}>{copy.title}</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {status === "rejected" && verification?.rejectionReason ? verification.rejectionReason : copy.body}
                </Text>
                {verification?.submittedAt && status === "pending" ? (
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    Submitted {new Date(verification.submittedAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
            </OrganiserSurface>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>WHAT WE NEED</Text>
              <OrganiserSurface style={styles.card}>
                {requirements.map((r) => {
                  const actionable = r.id === "phone" && !r.completed;
                  return (
                    <Pressable
                      key={r.id}
                      disabled={!actionable}
                      onPress={() => router.push({ pathname: "/verify-phone", params: { purpose: "settings" } } as any)}
                      style={styles.requirement}
                      accessibilityRole={actionable ? "button" : "text"}
                      accessibilityLabel={`${r.label}, ${r.completed ? "done" : "to do"}. ${r.description}`}
                    >
                      <Ionicons
                        name={r.completed ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={r.completed ? colors.success : colors.mutedForeground}
                      />
                      <View style={styles.flex}>
                        <Text style={[styles.reqLabel, { color: colors.foreground }]}>{r.label}</Text>
                        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{r.description}</Text>
                      </View>
                      {actionable ? (
                        <Text style={[styles.link, { color: colors.primary }]}>Verify</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </OrganiserSurface>
            </View>

            {canSubmit ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BUSINESS DETAILS</Text>
                <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <FormField label="Legal business name" required icon="business-outline" value={form.legalName} onChangeText={(t) => set("legalName", t)} placeholder="As registered with RDB" maxLength={120} editable={!submitting} />
                  <FormField label="RDB registration number" required icon="document-text-outline" value={form.registrationNumber} onChangeText={(t) => set("registrationNumber", t)} autoCapitalize="characters" maxLength={30} editable={!submitting} />
                  <FormField label="TIN" required icon="receipt-outline" value={form.taxId} onChangeText={(t) => set("taxId", t)} keyboardType="number-pad" placeholder="9 digits" maxLength={11} editable={!submitting} />
                  <FormField label="Authorised representative" required icon="person-outline" value={form.representativeName} onChangeText={(t) => set("representativeName", t)} placeholder="Full name" maxLength={80} editable={!submitting} />
                  <FormField label="Payment website" required icon="card-outline" value={form.paymentWebsite} onChangeText={(t) => set("paymentWebsite", t)} placeholder="https://tickets.yourbusiness.rw" keyboardType="url" autoCapitalize="none" autoCorrect={false} editable={!submitting} />

                  <View style={styles.docBlock}>
                    <Text style={[styles.reqLabel, { color: colors.foreground }]}>
                      Registration certificate <Text style={{ color: colors.primary }}>*</Text>
                    </Text>
                    <Pressable
                      onPress={pickDocument}
                      disabled={submitting}
                      style={[styles.docPicker, { borderColor: colors.border, backgroundColor: colors.input }]}
                      accessibilityRole="button"
                      accessibilityLabel={form.registrationDocumentUri ? "Replace certificate photo" : "Add certificate photo"}
                    >
                      {form.registrationDocumentUri ? (
                        <Image source={{ uri: form.registrationDocumentUri }} style={styles.docPreview} />
                      ) : (
                        <Ionicons name="document-attach-outline" size={24} color={colors.mutedForeground} />
                      )}
                      <Text style={[styles.link, { color: colors.primary }]}>
                        {form.registrationDocumentUri ? "Replace photo" : "Add a photo or scan"}
                      </Text>
                    </Pressable>
                    {docError ? <InlineError message={docError} /> : null}
                  </View>
                </View>

                <View style={[styles.note, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}33` }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.meta, { color: colors.mutedForeground, flex: 1 }]}>
                    Eventis doesn't process ticket payments. Customers are sent to your payment website, and you handle
                    payments, refunds and compliance.
                  </Text>
                </View>

                {!phoneVerified ? <InlineError message="Verify your phone number before submitting." /> : null}
                {error ? <InlineError message={error} /> : null}

                <Pressable
                  onPress={submit}
                  disabled={submitting || !phoneVerified}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: submitting || pressed || !phoneVerified ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ busy: submitting, disabled: !phoneVerified }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryText}>{status === "rejected" ? "Submit again" : "Submit for review"}</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {status === "verified" ? (
              <Pressable
                onPress={() => router.push("/business/create-event" as any)}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Create a paid event</Text>
              </Pressable>
            ) : null}

            {__DEV__ && !USE_PROFILE_API && status === "pending" ? (
              <View style={[styles.demo, { borderColor: colors.border }]}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  Demo only: stand in for the Eventis review team.
                </Text>
                <View style={styles.demoRow}>
                  <Pressable onPress={() => void simulateReview("verified")} disabled={reviewing} style={[styles.demoBtn, { borderColor: colors.success }]} accessibilityRole="button">
                    <Text style={[styles.link, { color: colors.success }]}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => void simulateReview("rejected")} disabled={reviewing} style={[styles.demoBtn, { borderColor: colors.destructive }]} accessibilityRole="button">
                    <Text style={[styles.link, { color: colors.destructive }]}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, gap: 4 },
  content: { padding: 16, gap: 20 },
  statusCard: { flexDirection: "row", gap: 14, padding: 16, alignItems: "flex-start" },
  statusTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  meta: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  card: { paddingHorizontal: 14, paddingVertical: 4 },
  requirement: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 52 },
  reqLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  form: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  docBlock: { gap: 8 },
  docPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
  },
  docPreview: { width: 48, height: 48, borderRadius: 8 },
  note: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  primaryBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demo: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 12, gap: 10 },
  demoRow: { flexDirection: "row", gap: 10 },
  demoBtn: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
