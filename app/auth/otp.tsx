import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { DEMO_AUTH, OTP_LENGTH } from "@/constants/auth";
import { OTPInput } from "@/components/OTPInput";
import { useAuth } from "@/context/AuthContext";
import { recordEventisTermsAcceptance } from "@/services/legalAcceptanceService";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

export default function OTPScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const {
    purpose,
    phone,
    email,
    username,
    fullName,
    challengeId: initialChallengeId,
  } = useLocalSearchParams<{
    purpose?: "login" | "register" | "payment" | "chat";
    phone?: string;
    email?: string;
    username?: string;
    fullName?: string;
    challengeId?: string;
  }>();

  const {
    verifyEmailCode,
    sendEmailCode,
    verifyOTP,
    clearOTPContext,
    signInWithPhoneSession,
    user,
  } = useAuth();

  const [challengeId, setChallengeId] = useState(initialChallengeId || "");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isCompleting = useRef(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (!canResend || resending) return;
    setError(false);
    setErrorMessage("");
    setResending(true);
    try {
      if (email) {
        const resp = await sendEmailCode({
          email,
          purpose: purpose === "register" ? "register" : "login",
          username: username || fullName,
        });
        setChallengeId(resp.challengeId);
        setCountdown(resp.retryAfterSeconds || 60);
        setCanResend(false);
      } else {
        // Fallback for non-email flow
        setCountdown(60);
        setCanResend(false);
      }
    } catch (err) {
      setError(true);
      setErrorMessage(err instanceof Error ? err.message : "Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }, [canResend, email, fullName, purpose, resending, sendEmailCode, username]);

  const handleComplete = useCallback(
    async (code: string) => {
      if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code) || isCompleting.current) return;
      isCompleting.current = true;
      setVerifying(true);
      setError(false);
      setErrorMessage("");

      try {
        if (email) {
          await verifyEmailCode({
            email,
            challengeId: challengeId || initialChallengeId || "demo_email_challenge",
            code,
          });
          // The register screen only reaches this point after its terms checkbox is ticked.
          if (purpose === "register") await recordEventisTermsAcceptance();
        } else if (DEMO_AUTH) {
          await signInWithPhoneSession(phone || user?.phone || "+250 7XX XXX XXX", fullName || username);
        } else if (!(await verifyOTP(code, phone, fullName || username))) {
          throw new Error("Invalid verification code");
        }

        clearOTPContext();
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        router.replace("/(tabs)");
      } catch (err) {
        isCompleting.current = false;
        setError(true);
        setErrorMessage(err instanceof Error ? err.message : "Invalid code. Please try again.");
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        setTimeout(() => setError(false), 1500);
      } finally {
        setVerifying(false);
      }
    },
    [challengeId, clearOTPContext, email, fullName, initialChallengeId, phone, router, signInWithPhoneSession, user?.phone, username, verifyEmailCode, verifyOTP]
  );

  const isDark = scheme === "dark";
  const displayContact = email || phone || user?.email || user?.phone || "your account email";

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#070814" : colors.background }]}>
      {/* Background Gradient */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["#0F1B3D", "#070814", "#070814"]
            : ["#E0EDFF", "#F4F7FC", colors.background]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: isDark ? "#111827" : colors.card,
              borderColor: isDark ? "#1F293D" : colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        {/* Verification Icon Badge */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(60).duration(500).springify() : undefined}
          style={styles.iconContainer}
        >
          <View style={[styles.iconCircle, { borderColor: isDark ? "rgba(0, 163, 255, 0.3)" : "rgba(0, 163, 255, 0.2)" }]}>
            <Ionicons name="mail-unread-outline" size={36} color="#00A3FF" />
          </View>
        </Animated.View>

        {/* Title & Description */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(120).duration(500).springify() : undefined}
          style={styles.titleSection}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a 6-digit verification code to
          </Text>
          <View style={[styles.contactPill, { backgroundColor: isDark ? "#111827" : colors.input, borderColor: isDark ? "#1F293D" : colors.border }]}>
            <Ionicons name="mail-outline" size={14} color="#00A3FF" />
            <Text style={[styles.contactText, { color: colors.foreground }]}>{displayContact}</Text>
          </View>
        </Animated.View>

        {/* OTP Input Fields */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(180).duration(500).springify() : undefined}
          style={styles.otpSection}
        >
          <OTPInput length={OTP_LENGTH} onComplete={handleComplete} error={error} />

          {verifying ? (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color="#00A3FF" />
              <Text style={[styles.verifyingText, { color: "#00A3FF" }]}>Verifying code…</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={[styles.errorText, { color: colors.destructive }]} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : (
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              {DEMO_AUTH
                ? "Demo Mode: enter any 6 digits to proceed"
                : "Enter the code sent to your email inbox"}
            </Text>
          )}
        </Animated.View>

        {/* Resend Section */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).duration(500).springify() : undefined}
          style={styles.resendSection}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#00A3FF" />
          ) : canResend ? (
            <Pressable onPress={handleResend} hitSlop={8} style={styles.resendBtn}>
              <Ionicons name="refresh-outline" size={16} color="#00A3FF" />
              <Text style={styles.resendLink}>Resend code</Text>
            </Pressable>
          ) : (
            <Text style={[styles.resendTimer, { color: colors.mutedForeground }]}>
              Resend code in{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                {countdown}s
              </Text>
            </Text>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },
  iconContainer: {
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 163, 255, 0.1)",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A3FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  titleSection: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_900Black",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  contactPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  otpSection: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  verifyingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyingText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  resendSection: {
    alignItems: "center",
    minHeight: 28,
    justifyContent: "center",
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resendLink: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#00A3FF",
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
