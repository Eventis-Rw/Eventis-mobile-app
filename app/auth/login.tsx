import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { Logo } from "@/components/Logo";
import { COUNTRIES, Country, PhoneInput } from "@/components/PhoneInput";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Rwanda (+250) default
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);

    const fullPhone = `${selectedCountry.code} ${phone.trim()}`;

    // Frontend flow: transition directly to SMS verification screen
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/auth/otp",
        params: {
          purpose: "login",
          phone: fullPhone,
        },
      } as any);
    }, 300);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === "dark"
            ? ["#1A2458", "#070814", colors.background]
            : ["#D9E6FF", "#E8EEF8", colors.background]
        }
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.form,
          {
            paddingTop: insets.top + 28,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.mainContent}>
          {/* Brand Icon & Heading */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
            style={styles.brandSection}
          >
            <Logo style={styles.brandLogo} />
            <Text style={[styles.kicker, { color: colors.primary }]}>Eventis</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your number is enough. We'll text you a code.
            </Text>
          </Animated.View>

          {/* Phone Input Field */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}
            style={styles.fieldSection}
          >
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Phone number
            </Text>
            <PhoneInput
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError("");
              }}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              error={error}
              placeholder="7XX XXX XXX"
            />
          </Animated.View>

          {/* Submit Button */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(240).springify() : undefined}
          >
            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? "Sending code..." : "Continue"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Footer Link to Register (Anchored to bottom) */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(300).springify() : undefined}
        >
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push("/auth/register" as any)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Create account
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  form: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  mainContent: {
    gap: 24,
  },
  brandSection: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  kicker: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  brandLogo: {
    width: 68,
    height: 68,
    marginBottom: 6,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  fieldSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
