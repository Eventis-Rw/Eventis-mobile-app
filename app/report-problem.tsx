import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { FormField } from "@/components/OrganisationForm";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { InlineError } from "@/components/profile/ProfileSection";
import { APP_VERSION } from "@/components/settings/SupportSettings";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeProfileError } from "@/services/profileService";
import {
  REPORT_CATEGORIES,
  REPORT_DESCRIPTION_MAX,
  REPORT_DESCRIPTION_MIN,
  submitProblemReport,
  validateProblemReport,
  type ProblemReportInput,
  type ProblemReportReceipt,
  type ReportCategory,
} from "@/services/supportService";

/** Report a problem: category, description, contact email, optional reference and screenshot. */
export default function ReportProblemScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  // `?reference=` prefills a booking or ticket code when opened from one.
  const params = useLocalSearchParams<{ reference?: string; category?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const allowLeave = useRef(false);

  const initialCategory = REPORT_CATEGORIES.some((c) => c.key === params.category) ? (params.category as ReportCategory) : "";
  const [category, setCategory] = useState<ReportCategory | "">(initialCategory);
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email && !user.email.endsWith(".invalid") ? user.email : "");
  const [reference, setReference] = useState(params.reference ?? "");
  const [screenshotUri, setScreenshotUri] = useState<string | undefined>();
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ProblemReportReceipt | undefined>();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  const diagnostics = { appVersion: APP_VERSION, platform: `${Platform.OS} ${Platform.Version}` };
  const input: ProblemReportInput = {
    category,
    description,
    contactEmail,
    reference,
    screenshotUri,
    diagnostics: includeDiagnostics ? diagnostics : undefined,
    userId: user?.id,
  };
  const errors = validateProblemReport(input);
  const errorFor = (key: keyof typeof errors) => (submitAttempted || touched[key] ? errors[key] : undefined);
  const isDirty = !receipt && (!!description.trim() || !!screenshotUri || category !== initialCategory);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (allowLeave.current || !isDirty || submitting) return;
      event.preventDefault();
      setPendingLeave(() => () => navigation.dispatch(event.data.action));
    });
  }, [navigation, isDirty, submitting]);

  const pickScreenshot = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
      if (!result.canceled) setScreenshotUri(result.assets[0].uri);
    } catch {
      setPhotoError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const submit = async () => {
    setSubmitAttempted(true);
    if (Object.keys(errors).length) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setReceipt(await submitProblemReport(input));
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(describeProfileError(err, "We couldn't send your report. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ProfileSubHeader title="Report a problem" />
        <View style={styles.done} accessibilityLiveRegion="polite">
          <View style={[styles.doneIcon, { backgroundColor: `${colors.success}22` }]}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Thanks, we've got it</Text>
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign: "center" }]}>
            Your reference is <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{receipt.reference}</Text>.
            We'll reply to {contactEmail.trim()}.
          </Text>
          <Pressable
            onPress={() => {
              allowLeave.current = true;
              router.back();
            }}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileSubHeader title="Report a problem" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {submitAttempted && Object.keys(errors).length ? (
          <InlineError message="Fix the highlighted fields to send your report." />
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            What's it about? <Text style={{ color: colors.primary }}>*</Text>
          </Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {REPORT_CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    setCategory(c.key);
                    setError(null);
                  }}
                  disabled={submitting}
                  style={[
                    styles.option,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.card },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={selected ? colors.primary : colors.mutedForeground}
                  />
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>{c.label}</Text>
                    <Text style={[styles.optionHint, { color: colors.mutedForeground }]}>{c.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {errorFor("category") ? <InlineError message={errorFor("category")!} /> : null}
        </View>

        <FormField
          label="What happened?"
          required
          multiline
          showCount
          maxLength={REPORT_DESCRIPTION_MAX}
          placeholder={`What you did, what you expected and what happened instead (at least ${REPORT_DESCRIPTION_MIN} characters)`}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setError(null);
          }}
          onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          error={errorFor("description")}
          editable={!submitting}
        />

        <FormField
          label="Booking, ticket or event (optional)"
          icon="ticket-outline"
          placeholder="e.g. EVT-LX2K9 or the event name"
          autoCapitalize="none"
          maxLength={80}
          value={reference}
          onChangeText={setReference}
          error={errorFor("reference")}
          editable={!submitting}
        />

        <FormField
          label="Email for our reply"
          required
          icon="mail-outline"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={contactEmail}
          onChangeText={setContactEmail}
          onBlur={() => setTouched((t) => ({ ...t, contactEmail: true }))}
          error={errorFor("contactEmail")}
          editable={!submitting}
        />

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Screenshot (optional)</Text>
          {screenshotUri ? (
            <View style={styles.shotRow}>
              <Image source={{ uri: screenshotUri }} style={styles.shot} accessibilityLabel="Attached screenshot" />
              <Pressable onPress={() => setScreenshotUri(undefined)} disabled={submitting} hitSlop={6} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.destructive }]}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickScreenshot}
              disabled={submitting}
              style={[styles.attach, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={[styles.link, { color: colors.primary }]}>Attach a screenshot</Text>
            </Pressable>
          )}
          {photoError ? <InlineError message={photoError} /> : null}
        </View>

        <View style={[styles.diagnostics, { borderColor: colors.border }]}>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>Include app details</Text>
            <Text style={[styles.optionHint, { color: colors.mutedForeground }]}>
              Eventis {diagnostics.appVersion} · {diagnostics.platform}. Helps us find bugs faster.
            </Text>
          </View>
          <Switch
            value={includeDiagnostics}
            onValueChange={setIncludeDiagnostics}
            disabled={submitting}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Include app details"
          />
        </View>

        {error ? <InlineError message={error} /> : null}

        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: submitting || pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityState={{ busy: submitting }}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Send report</Text>}
        </Pressable>
      </ScrollView>

      <ChatConfirmDialog
        visible={!!pendingLeave}
        title="Discard this report?"
        description="What you've written won't be sent."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          const leave = pendingLeave;
          setPendingLeave(null);
          allowLeave.current = true;
          leave?.();
        }}
        onClose={() => setPendingLeave(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 18 },
  section: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  options: { gap: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionHint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  attach: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  shotRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  shot: { width: 72, height: 72, borderRadius: 10 },
  link: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  diagnostics: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  primaryBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  doneIcon: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
});
