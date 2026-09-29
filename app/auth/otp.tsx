import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OTPInput } from "@/components/OTPInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function OTPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { purpose, eventId } = useLocalSearchParams<{ purpose?: string; eventId?: string }>();
  const { verifyOTP, user } = useAuth();
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);
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
      const success = await verifyOTP(code);
      if (success) {
        setVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          if (purpose === "payment" && eventId) {
            router.replace(`/booking/${eventId}` as any);
          } else if (purpose === "chat") {
            router.back();
          } else {
            router.replace("/(tabs)" as any);
          }
        }, 1200);
      } else {
        setError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setError(false), 1000);
      }
    },
    [verifyOTP, purpose, eventId, router]
  );

  const purposeLabels: Record<string, { title: string; subtitle: string }> = {
    register: {
      title: "Verify your number",
      subtitle: "We sent a 6-digit code to your phone to complete verification.",
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
  const contact = user?.phone ?? user?.email ?? "your device";

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
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
        style={styles.content}
      >
        <View style={[styles.iconCircle, { backgroundColor: verified ? colors.success : colors.primary }]}>
          <Ionicons
            name={verified ? "checkmark-circle-outline" : "phone-portrait-outline"}
            size={32}
            color="#fff"
          />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {verified ? "Verified!" : label.title}
        </Text>

        {!verified && (
          <>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {label.subtitle}
            </Text>
            <Text style={[styles.contact, { color: colors.foreground }]}>
              {contact}
            </Text>
          </>
        )}
      </Animated.View>

      {!verified && (
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
          style={styles.otpSection}
        >
          <OTPInput onComplete={handleComplete} error={error} />

          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            For demo purposes, any 6-digit code works
          </Text>

          <View style={styles.resendRow}>
            {canResend ? (
              <Pressable onPress={handleResend}>
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  Resend code
                </Text>
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

          <View
            style={[
              styles.secureNote,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
              Your number is secure and never shared with third parties
            </Text>
          </View>
        </Animated.View>
      )}

      {verified && (
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.springify() : undefined}
          style={styles.successNote}
        >
          <Text style={[styles.successText, { color: colors.success }]}>
            Identity verified successfully
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  content: { alignItems: "center", gap: 14, marginBottom: 40 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  secureText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  successNote: { alignItems: "center", marginTop: 32 },
  successText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
