import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OTPInput } from "@/features/auth/components/OTPInput";
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
      className="flex-1 bg-background px-6 dark:bg-background-dark"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View className="mb-8">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
        className="mb-10 items-center gap-3.5"
      >
        <View
          className={`mb-1 h-[72px] w-[72px] items-center justify-center rounded-full ${
            verified ? "bg-success" : "bg-primary"
          }`}
        >
          <Ionicons
            name={verified ? "checkmark-circle-outline" : "phone-portrait-outline"}
            size={32}
            color="#fff"
          />
        </View>

        <Text className="text-center font-bold text-[26px] text-foreground dark:text-foreground-dark">
          {verified ? "Verified!" : label.title}
        </Text>

        {!verified && (
          <>
            <Text className="px-4 text-center font-sans text-[15px] leading-6 text-muted-foreground dark:text-muted-foreground-dark">
              {label.subtitle}
            </Text>
            <Text className="font-semibold text-[15px] text-foreground dark:text-foreground-dark">
              {contact}
            </Text>
          </>
        )}
      </Animated.View>

      {!verified && (
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
          className="items-center gap-5"
        >
          <OTPInput onComplete={handleComplete} error={error} />

          <Text className="text-center font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
            For demo purposes, any 6-digit code works
          </Text>

          <View className="items-center">
            {canResend ? (
              <Pressable onPress={handleResend}>
                <Text className="font-semibold text-[15px] text-primary">
                  Resend code
                </Text>
              </Pressable>
            ) : (
              <Text className="font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
                Resend in{" "}
                <Text className="font-semibold text-foreground dark:text-foreground-dark">
                  {countdown}s
                </Text>
              </Text>
            )}
          </View>

          <View className="mt-2 flex-row items-start gap-2.5 rounded-xl border border-border bg-secondary p-3.5 dark:border-border-dark dark:bg-secondary-dark">
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text className="flex-1 font-sans text-[13px] leading-5 text-muted-foreground dark:text-muted-foreground-dark">
              Your number is secure and never shared with third parties
            </Text>
          </View>
        </Animated.View>
      )}

      {verified && (
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.springify() : undefined}
          className="mt-8 items-center"
        >
          <Text className="font-semibold text-base text-success">
            Identity verified successfully
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
