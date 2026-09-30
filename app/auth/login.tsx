import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!identifier.trim()) nextErrors.identifier = "Username or email required";
    if (!password) nextErrors.password = "Password required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/(tabs)" as any);
    } catch (err) {
      setErrors({ general: "Invalid login details. Please try again." });
    }
    setLoading(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          style={styles.brandWrap}
        >
          <Text
            style={[
              styles.logoText,
              {
                color: colors.foreground,
                textShadowColor: colors.primary,
              },
            ]}
          >
            EVENTIS
          </Text>
        </Animated.View>

        {errors.general && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
              {errors.general}
            </Text>
          </View>
        )}

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
          <FieldLabel label="Username or email" colors={colors} />
          <InputField
            value={identifier}
            onChange={setIdentifier}
            placeholder="Enter your username or email"
            icon="person-outline"
            error={errors.identifier}
            colors={colors}
            autoCapitalize="none"
          />
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(220).springify() : undefined}>
          <FieldLabel label="Password" colors={colors} />
          <View style={styles.passwordWrap}>
            <InputField
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              error={errors.password}
              colors={colors}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((value) => !value)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(300).springify() : undefined}>
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(360).springify() : undefined}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>New here?</Text>
            <Pressable onPress={() => router.push("/auth/register" as any)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[fieldStyles.label, { color: colors.foreground }]}>{label}</Text>;
}

function InputField({
  value,
  onChange,
  placeholder,
  icon,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <View
        style={[
          fieldStyles.field,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.destructive : colors.border,
          },
        ]}
      >
        <Ionicons name={icon as any} size={18} color={colors.mutedForeground} />
        <TextInput
          style={[fieldStyles.input, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "sentences"}
        />
      </View>
      {error && <Text style={[fieldStyles.error, { color: colors.destructive }]}>{error}</Text>}
    </>
  );
}

const fieldStyles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 18,
  },
  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 4,
    textTransform: "uppercase",
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    transform: [{ scaleY: 1.08 }],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  passwordWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 14,
    padding: 6,
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
