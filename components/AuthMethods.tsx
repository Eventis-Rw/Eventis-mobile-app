import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export function AuthMethods({
  busy,
  onBusyChange,
  onError,
  onEmail,
}: {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
  onEmail: () => void;
}) {
  const colors = useColors();
  const { signInWithSocial } = useAuth();
  const submitting = useRef(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then((available) => {
          if (active) setAppleAvailable(available);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);
  const social = async (provider: "google" | "apple") => {
    if (busy || submitting.current) return;
    submitting.current = true;
    onError("");
    onBusyChange(true);
    try {
      await signInWithSocial(provider);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      submitting.current = false;
      onBusyChange(false);
    }
  };
  return (
    <View style={styles.root}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.mutedForeground }}>or continue with</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onEmail}
        style={[
          styles.button,
          {
            borderColor: colors.border,
            backgroundColor: colors.input,
            opacity: busy ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons name="mail-outline" size={21} color={colors.foreground} />
        <Text style={[styles.label, { color: colors.foreground }]}>
          Continue with email
        </Text>
      </Pressable>
      {Platform.OS !== "web" ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void social("google")}
          style={[
            styles.button,
            {
              borderColor: colors.border,
              backgroundColor: colors.input,
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="logo-google" size={21} color={colors.foreground} />
          <Text style={[styles.label, { color: colors.foreground }]}>
            Continue with Google
          </Text>
        </Pressable>
      ) : null}
      {appleAvailable ? (
        <View
          pointerEvents={busy ? "none" : "auto"}
          accessibilityState={{ disabled: busy }}
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={14}
            style={styles.apple}
            onPress={() => void social("apple")}
          />
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: 12 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  line: { flex: 1, height: 1 },
  button: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  apple: { height: 52, width: "100%" },
});
