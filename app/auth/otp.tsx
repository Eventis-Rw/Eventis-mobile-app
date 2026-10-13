import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { Logo } from "@/components/Logo";
import { OTPInput } from "@/components/OTPInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function OTPScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { purpose, phone, fullName } = useLocalSearchParams<{
    purpose?: string;
    phone?: string;
    fullName?: string;
  }>();
  const { completeOnboarding, signInWithPhoneSession, user } = useAuth();
  const isCompleting = useRef(false);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = useCallback(() => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    setError(false);
  }, [canResend]);

  const handleComplete = useCallback(
    async (code: string) => {
      if (code.length !== 4 || isCompleting.current) return;
      isCompleting.current = true;
      setError(false);

      try {
        // Demo flow: any four digits create a local session immediately. Avoid
        // waiting on the verification API, which can strand an offline user.
        await signInWithPhoneSession(phone || user?.phone || "+250 7XX XXX XXX", fullName);
        await completeOnboarding();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace("/(tabs)" as any);
      } catch {
        isCompleting.current = false;
        setError(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setTimeout(() => setError(false), 1000);
      }
    },
    [completeOnboarding, fullName, phone, router, signInWithPhoneSession, user?.phone]
  );

  const purposeLabels: Record<string, { title: string; subtitle: string }> = {
    login: {
      title: "Enter verification code",
      subtitle: "We sent a 4 digit code via SMS to your phone to sign in.",
    },
    register: {
      title: "Enter verification code",
      subtitle: "We sent a 4 digit code via SMS to verify your new account.",
    },
    payment: {
      title: "Confirm your identity",
      subtitle: "Enter the code we sent to your phone before proceeding with payment.",
    },
    chat: {
      title: "Unlock messaging",
      subtitle: "Verify your phone to access event chats and communicate with organizers.",
    },
  };

  const label = purposeLabels[purpose ?? "register"] ?? purposeLabels.register;
  const contact = phone ?? user?.phone ?? user?.email ?? "your phone number";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
        style={styles.content}
      >
        <Logo style={styles.brandLogo} variant="primary" />

        <Text style={[styles.title, { color: colors.foreground }]}>
          {label.title}
        </Text>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {label.subtitle}
        </Text>
        <Text style={[styles.contact, { color: colors.foreground }]}>
          {contact}
        </Text>
      </Animated.View>

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
        style={styles.otpSection}
      >
        <OTPInput onComplete={handleComplete} error={error} />

        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Enter any 4 digit code to continue to Home
        </Text>

        <View style={styles.resendRow}>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text style={[styles.resendLink, { color: colors.primary }]}>Resend code</Text>
            </Pressable>
          ) : (
            <Text style={[styles.resendTimer, { color: colors.mutedForeground }]}>
              Resend in{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                {countdown}s
              </Text>
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  content: { alignItems: "center", gap: 14, marginBottom: 40 },
  brandLogo: {
    width: 68,
    height: 68,
    marginBottom: 6,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  contact: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  otpSection: { alignItems: "center", gap: 20 },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  resendRow: { alignItems: "center" },
  resendLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resendTimer: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
