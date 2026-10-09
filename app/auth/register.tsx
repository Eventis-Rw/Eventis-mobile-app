import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { Logo } from "@/components/Logo";
import { COUNTRIES, Country, PhoneInput } from "@/components/PhoneInput";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Rwanda (+250) default
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: { fullName?: string; phone?: string } = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      nextErrors.fullName = "Please enter your full name";
    }
    const cleanedPhone = phone.replace(/\D/g, "");
    if (!cleanedPhone || cleanedPhone.length < 7) {
      nextErrors.phone = "Please enter a valid phone number";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setLoading(true);

    const fullPhone = `${selectedCountry.code} ${phone.trim()}`;

    // Frontend flow: transition directly to SMS verification screen
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/auth/otp",
        params: {
          purpose: "register",
          phone: fullPhone,
          fullName: fullName.trim(),
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
          <Text style={[styles.kicker, { color: colors.primary }]}>Join Eventis</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Create an account
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            A name and a number. Then you're in the city.
          </Text>
        </Animated.View>

        {/* Full Name Field */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
          style={styles.fieldSection}
        >
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Full names
          </Text>
          <View
            style={[
              styles.nameField,
              {
                backgroundColor: colors.input,
                borderColor: errors.fullName ? colors.destructive : colors.border,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <TextInput
              style={[styles.nameInput, { color: colors.foreground }]}
              placeholder=""
              placeholderTextColor={colors.mutedForeground}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
              }}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Full name"
            />
          </View>
          {errors.fullName ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.fullName}
            </Text>
          ) : null}
        </Animated.View>

        {/* Phone Input Field with Country Code */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
          style={styles.fieldSection}
        >
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Phone number
          </Text>
          <PhoneInput
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
            }}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            error={errors.phone}
            placeholder="7XX XXX XXX"
          />
        </Animated.View>

        {/* Submit Button */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}
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
              {loading ? "Please wait..." : "Continue"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

        {/* Footer Link to Sign In */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(320).springify() : undefined}
        >
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Already have an account?
            </Text>
            <Pressable onPress={() => router.push("/auth/login" as any)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Sign in
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
    gap: 22,
  },
  brandSection: {
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
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
  nameField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 56,
    gap: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
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
    marginTop: 6,
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
