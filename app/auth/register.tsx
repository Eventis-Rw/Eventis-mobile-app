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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register, completeOnboarding } = useAuth();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = "Username required";
    if (!phone.trim()) e.phone = "Phone number required";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const normalizedPhone = phone.trim();
      await register({
        username,
        email: `${username.trim().toLowerCase()}-${normalizedPhone.replace(/\D/g, "").slice(-6)}@eventis.local`,
        phone: normalizedPhone,
        password,
      });
      await completeOnboarding();
      router.replace("/(tabs)" as any);
    } catch (err) {
      setErrors({ general: "Something went wrong. Please try again." });
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
          <View style={[styles.errorBanner, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
              {errors.general}
            </Text>
          </View>
        )}

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
          <FieldLabel label="Username" colors={colors} />
          <InputField
            value={username}
            onChange={setUsername}
            placeholder="Choose a username"
            icon="person-outline"
            error={errors.username}
            colors={colors}
          />
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}>
          <FieldLabel label="Phone number" colors={colors} />
          <InputField
            value={phone}
            onChange={setPhone}
            placeholder="+44 7xxx xxxxxx"
            icon="phone-portrait-outline"
            keyboardType="phone-pad"
            error={errors.phone}
            colors={colors}
          />
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(280).springify() : undefined}>
          <FieldLabel label="Password" colors={colors} />
          <View style={styles.passwordWrap}>
            <InputField
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              error={errors.password}
              colors={colors}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((p) => !p)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(320).springify() : undefined}>
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Please wait..." : "Create Account"}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(360).springify() : undefined}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account?</Text>
            <Pressable onPress={() => router.push("/auth/login" as any)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[fieldStyles.label, { color: colors.foreground }]}>{label}</Text>
  );
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
      {error && (
        <Text style={[fieldStyles.error, { color: colors.destructive }]}>{error}</Text>
      )}
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
  modeSwitcher: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  modeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeText: { fontSize: 14 },
  scroll: { flex: 1 },
  form: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorBannerText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  passwordWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, top: 15 },
  methodToggleWrap: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  methodToggle: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  methodToggleText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inlineActionRow: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  inlineLink: {
    paddingVertical: 6,
  },
  inlineLinkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  submitBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  switchText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontFamily: "Inter_600SemiBold" },
});
