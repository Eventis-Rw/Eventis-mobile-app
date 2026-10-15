import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { OTPInput } from "@/components/OTPInput";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { DEMO_WRONG_CODE, describeProfileError, PHONE_CODE_MAX_ATTEMPTS, USE_PROFILE_API } from "@/services/profileService";
import { localToday } from "@/utils/dates";
import {
  DELETE_CONFIRM_PHRASE,
  matchesDeletePhrase,
  requestDeletionChallenge,
  verifyDeletionCode,
  type DeletionChallenge,
} from "@/services/securityService";

type Step = "review" | "verify" | "confirm";
const STEPS: Step[] = ["review", "verify", "confirm"];

/**
 * Account deletion in three steps: see what will be lost, prove it's you with
 * a one-time code, then type DELETE. Nothing is removed until the last step
 * succeeds, and a failure leaves the account untouched.
 */
export default function DeleteAccountScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const { bookings } = useBookings();

  const [step, setStep] = useState<Step>("review");
  const [challenge, setChallenge] = useState<DeletionChallenge | undefined>();
  const [deletionToken, setDeletionToken] = useState<string | undefined>();
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [codeKey, setCodeKey] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ProfileSubHeader title="Delete account" />
        <View style={styles.content}>
          <SectionState kind="empty" icon="person-outline" title="You're signed out" message="Sign in to manage your account." />
        </View>
      </View>
    );
  }

  const accountType = getAccountType(user);
  const today = localToday();
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.eventDate >= today).length;
  const lockedOut = attempts >= PHONE_CODE_MAX_ATTEMPTS;

  const losses = [
    "Your profile, photo and preferences",
    `Your booking history${upcoming ? ` and ${upcoming} upcoming ${upcoming === 1 ? "ticket" : "tickets"}` : ""}`,
    "Saved events, saved organisers and your reviews",
    ...(accountType !== "customer" ? ["Your published events, which disappear from Eventis"] : []),
    ...(accountType === "business" ? ["Your organisation, its verification and any promotion requests"] : []),
  ];

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await requestDeletionChallenge({ phone: user.phone, phoneVerified: user.isPhoneVerified, email: user.email });
      setChallenge(next);
      setCountdown(next.resendAfterSeconds);
      setAttempts(0);
      setCodeKey((k) => k + 1);
      setStep("verify");
    } catch (err) {
      setError(describeProfileError(err, "We couldn't send a code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (busy || lockedOut) return;
    setBusy(true);
    setError(null);
    try {
      setDeletionToken(await verifyDeletionCode(code));
      setStep("confirm");
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      setCodeKey((k) => k + 1);
      setError(
        next >= PHONE_CODE_MAX_ATTEMPTS
          ? "Too many wrong codes. Request a new code to try again."
          : describeProfileError(err, "That code didn't work."),
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deletionToken || !matchesDeletePhrase(phrase)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(deletionToken, phrase);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding" as any);
    } catch (err) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(describeProfileError(err, "We couldn't delete your account. Nothing was removed; please try again."));
      setBusy(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileSubHeader title="Delete account" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progress} accessibilityLabel={`Step ${stepIndex + 1} of 3`}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.progressBar, { backgroundColor: i <= stepIndex ? colors.destructive : colors.border }]} />
          ))}
        </View>

        {step === "review" ? (
          <>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.destructive}1A` }]}>
              <Ionicons name="warning-outline" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Delete your Eventis account?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>This is permanent. You'll lose:</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {losses.map((item) => (
                <View key={item} style={styles.lossRow}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.destructive} />
                  <Text style={[styles.lossText, { color: colors.foreground }]}>{item}</Text>
                </View>
              ))}
            </View>
            {upcoming ? (
              <Text style={[styles.note, { color: colors.mutedForeground }]}>
                Tickets bought on an organiser's website are refunded by that organiser, not by Eventis.
              </Text>
            ) : null}
            {error ? <InlineError message={error} /> : null}
            <Pressable
              onPress={sendCode}
              disabled={busy}
              style={({ pressed }) => [styles.dangerBtn, { backgroundColor: colors.destructive, opacity: busy || pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
              accessibilityState={{ busy }}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Continue</Text>}
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.secondaryBtn} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Keep my account</Text>
            </Pressable>
          </>
        ) : null}

        {step === "verify" && challenge ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Confirm it's you</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Enter the 6-digit code we sent {challenge.channel === "sms" ? "by SMS to" : "to"} {challenge.destination}.
            </Text>
            <View style={[styles.codeWrap, { opacity: lockedOut ? 0.4 : 1 }]} pointerEvents={lockedOut || busy ? "none" : "auto"}>
              <OTPInput key={codeKey} onComplete={(code) => void verify(code)} error={!!error} />
            </View>
            {busy ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <InlineError message={error} /> : null}
            {!USE_PROFILE_API ? (
              <Text style={[styles.note, { color: colors.mutedForeground, textAlign: "center" }]}>
                Demo: any 6 digits work, except {DEMO_WRONG_CODE}.
              </Text>
            ) : null}
            <Pressable
              onPress={sendCode}
              disabled={countdown > 0 || busy}
              hitSlop={8}
              style={styles.center}
              accessibilityRole="button"
              accessibilityState={{ disabled: countdown > 0 }}
            >
              <Text style={[styles.link, { color: countdown > 0 ? colors.mutedForeground : colors.primary }]}>
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
              </Text>
            </Pressable>
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Last step</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Type <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{DELETE_CONFIRM_PHRASE}</Text> to
              permanently delete your account.
            </Text>
            <TextInput
              value={phrase}
              onChangeText={(text) => {
                setPhrase(text);
                setError(null);
              }}
              placeholder={DELETE_CONFIRM_PHRASE}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              accessibilityLabel={`Type ${DELETE_CONFIRM_PHRASE} to confirm`}
            />
            {error ? <InlineError message={error} /> : null}
            <Pressable
              onPress={remove}
              disabled={busy || !matchesDeletePhrase(phrase)}
              style={({ pressed }) => [
                styles.dangerBtn,
                {
                  backgroundColor: colors.destructive,
                  opacity: !matchesDeletePhrase(phrase) ? 0.45 : busy || pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: !matchesDeletePhrase(phrase) }}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Delete my account</Text>}
            </Pressable>
            <Pressable onPress={() => router.back()} disabled={busy} style={styles.secondaryBtn} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16 },
  progress: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 8 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  body: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  lossRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  lossText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium" },
  note: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  dangerBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  codeWrap: { alignItems: "center", marginVertical: 8 },
  center: { alignSelf: "center" },
  link: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    letterSpacing: 2,
    fontFamily: "Inter_600SemiBold",
  },
});
