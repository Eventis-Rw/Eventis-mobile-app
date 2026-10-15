import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/OrganisationForm";
import { OTPInput } from "@/components/OTPInput";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import {
  confirmPhoneVerification,
  describeProfileError,
  PHONE_CODE_MAX_ATTEMPTS,
  requestPhoneVerification,
  USE_PROFILE_API,
} from "@/services/profileService";
import { normalisePhone, validatePhone } from "@/utils/profileValidation";

type Purpose = "settings" | "payment" | "chat";

const COPY: Record<Purpose, { title: string; reason: string }> = {
  settings: { title: "Verify your phone", reason: "A verified number unlocks chat and paid bookings, and helps keep Eventis free of fake accounts." },
  payment: { title: "Verify to book", reason: "Paid events need a verified phone number before you book. It only takes a moment." },
  chat: { title: "Verify to chat", reason: "Chat is for verified accounts only. This keeps spam and fake accounts out." },
};

/**
 * Verifies the signed-in user's phone with a one-time code. Unlike the sign-up
 * OTP screen, this never creates or replaces the session.
 * `purpose=payment&eventId=…` returns to that event's booking afterwards.
 */
export default function VerifyPhoneScreen() {
  const params = useLocalSearchParams<{ purpose?: string; eventId?: string }>();
  const purpose: Purpose = params.purpose === "payment" || params.purpose === "chat" ? params.purpose : "settings";
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, markPhoneVerified } = useAuth();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  // Remounts the code boxes so a wrong code clears them.
  const [codeKey, setCodeKey] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const phoneError = validatePhone(phone, { required: true });
  const lockedOut = attempts >= PHONE_CODE_MAX_ATTEMPTS;

  const finish = () => {
    if (purpose === "payment" && params.eventId) {
      router.replace({ pathname: "/booking/[id]", params: { id: params.eventId } } as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/settings" as any);
    }
  };

  const sendCode = async () => {
    setTouched(true);
    if (phoneError) return;
    setBusy(true);
    setError(null);
    try {
      const target = normalisePhone(phone)!;
      const request = await requestPhoneVerification(target);
      setSentTo(request.phone);
      setCountdown(request.resendAfterSeconds);
      setAttempts(0);
      setCodeKey((k) => k + 1);
      setStep("code");
    } catch (err) {
      setError(describeProfileError(err, "We couldn't send a code. Check the number and try again."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (code: string) => {
    if (busy || lockedOut) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmPhoneVerification(sentTo, code);
      await markPhoneVerified(result.phone);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (err) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const next = attempts + 1;
      setAttempts(next);
      setCodeKey((k) => k + 1);
      setError(
        next >= PHONE_CODE_MAX_ATTEMPTS
          ? "Too many wrong codes. Request a new code to try again."
          : describeProfileError(err, "That code didn't work. Try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ProfileSubHeader title="Verify phone" />
        <View style={styles.content}>
          <SectionState
            kind="empty"
            icon="person-outline"
            title="Sign in first"
            message="Phone verification is part of your account."
            actionLabel="Sign in"
            onAction={() => router.replace("/auth/login" as any)}
          />
        </View>
      </View>
    );
  }

  const copy = COPY[purpose];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileSubHeader title="Verify phone" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === "done" ? (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <View style={[styles.doneIcon, { backgroundColor: `${colors.success}22` }]}>
              <Ionicons name="checkmark-circle" size={44} color={colors.success} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Phone verified</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {sentTo} is now verified.
              {purpose === "payment" ? " You can continue with your booking." : ""}
            </Text>
            <Pressable
              onPress={finish}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{purpose === "payment" ? "Continue to booking" : "Done"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <View style={[styles.icon, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name="phone-portrait-outline" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {step === "phone" ? copy.reason : `Enter the 6-digit code we sent to ${sentTo}.`}
              </Text>
            </View>

            {step === "phone" ? (
              <>
                <FormField
                  label="Phone number"
                  icon="call-outline"
                  placeholder="+250 788 123 456"
                  keyboardType="phone-pad"
                  maxLength={20}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setError(null);
                  }}
                  onBlur={() => setTouched(true)}
                  error={touched ? phoneError : undefined}
                  editable={!busy}
                />
                {error ? <InlineError message={error} /> : null}
                <Pressable
                  onPress={sendCode}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: busy || pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ busy }}
                >
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Send code</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.codeWrap, { opacity: lockedOut ? 0.4 : 1 }]} pointerEvents={lockedOut || busy ? "none" : "auto"}>
                  <OTPInput key={codeKey} onComplete={(code) => void confirm(code)} error={!!error} />
                </View>
                {busy ? <ActivityIndicator color={colors.primary} /> : null}
                {error ? <InlineError message={error} /> : null}
                {!USE_PROFILE_API ? (
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Demo: any 6 digits work.
                  </Text>
                ) : null}
                <View style={styles.codeActions}>
                  <Pressable
                    onPress={sendCode}
                    disabled={countdown > 0 || busy}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: countdown > 0 }}
                  >
                    <Text style={[styles.link, { color: countdown > 0 ? colors.mutedForeground : colors.primary }]}>
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setStep("phone");
                      setError(null);
                    }}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.link, { color: colors.primary }]}>Change number</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 18 },
  intro: { alignItems: "center", gap: 10, paddingTop: 8 },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  codeWrap: { alignItems: "center" },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", textAlign: "center" },
  codeActions: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  link: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  done: { alignItems: "center", gap: 12, paddingTop: 40 },
  doneIcon: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
});
