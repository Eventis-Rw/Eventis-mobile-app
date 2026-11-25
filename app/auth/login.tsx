import { GoogleIcon } from "@/components/GoogleIcon";
import { KeyboardAwareScrollView } from "@/components/KeyboardCompat";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/utils/apiClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function LoginScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { sendEmailCode, signInWithSocial } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [accountMissing, setAccountMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const submitting = useRef(false);

  const handleContinueWithEmail = async () => {
    if (loading || submitting.current) return;
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setAccountMissing(false);

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) {
      setError("Please enter a valid email address.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const challenge = await sendEmailCode({
        email: cleanEmail,
        purpose: "login",
      });
      router.push({
        pathname: "/auth/otp",
        params: {
          email: cleanEmail,
          purpose: "login",
          challengeId: challenge.challengeId,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAccountMissing(true);
        setError("No account found with this email. Please sign up first.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    if (loading || socialLoading) return;
    if (provider === "apple" && Platform.OS !== "ios") {
      setError("Apple sign-in is only available on iOS devices.");
      return;
    }
    setError("");
    setSocialLoading(provider);
    try {
      await signInWithSocial(provider);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete sign in. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bottomOffset={20}
      >
        <View style={styles.centerContainer}>
          {/* Brand Header: Small Logo + eventis */}
          <View style={styles.headerSection}>
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.duration(400) : undefined}
              style={styles.brandRow}
            >
              <Logo variant="auto" style={styles.brandLogo} />
              <Text style={[styles.brandText, { color: colors.foreground }]}>eventis</Text>
            </Animated.View>

            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(70).duration(450) : undefined}
              style={styles.titleSection}
            >
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Sign in to explore and experience events around you
              </Text>
            </Animated.View>
          </View>

          {/* Content Section */}
        <View style={styles.formContainer}>
          {/* Email Input Field (Rounded Pill) */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(100).duration(450).springify() : undefined}
            style={styles.inputSection}
          >
            <View
              style={[
                styles.pillInputContainer,
                {
                  backgroundColor: isDark ? "#161616" : colors.input,
                  borderColor: error
                    ? colors.destructive
                    : focused
                    ? "#00A3FF"
                    : isDark
                    ? "#262626"
                    : colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={focused ? "#00A3FF" : colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.foreground }]}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinueWithEmail}
                accessibilityLabel="Email address"
              />
              {email.length > 0 ? (
                <Pressable onPress={() => setEmail("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            {error ? (
              <Animated.Text
                entering={Platform.OS !== "web" ? FadeInDown.duration(200) : undefined}
                style={[styles.errorText, { color: colors.destructive }]}
                accessibilityRole="alert"
              >
                {error}
              </Animated.Text>
            ) : null}
            {accountMissing && (
              <Pressable
                onPress={() => router.push("/auth/register" as any)}
                accessibilityRole="button"
                accessibilityLabel="Create an account"
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Create account</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Primary Action Button ("Continue") */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(160).duration(450).springify() : undefined}
          >
            <Pressable
              onPress={handleContinueWithEmail}
              disabled={loading || !!socialLoading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: pressed || loading ? 0.88 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <LinearGradient
                colors={["#00A3FF", "#0284C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Continue</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Bold Divider: ──── or continue with ──── */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(200).duration(450).springify() : undefined}
            style={styles.dividerRow}
          >
            <View style={[styles.dividerLine, { backgroundColor: isDark ? "#262626" : colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
              or continue with
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? "#262626" : colors.border }]} />
          </Animated.View>

          {/* Social Sign-in Buttons (Horizontal Row with Brand Colors) */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(240).duration(450).springify() : undefined}
            style={styles.socialRow}
          >
            <Pressable
              onPress={() => handleSocialSignIn("google")}
              disabled={loading || !!socialLoading}
              style={({ pressed }) => [
                styles.googleBtn,
                { opacity: pressed || socialLoading === "google" ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {socialLoading === "google" ? (
                <ActivityIndicator size="small" color="#1F2937" />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={styles.googleBtnText}>Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleSocialSignIn("apple")}
              disabled={loading || !!socialLoading}
              style={({ pressed }) => [
                styles.appleBtn,
                {
                  backgroundColor: isDark ? "#161616" : "#000000",
                  borderColor: isDark ? "#2E2E2E" : "#000000",
                  opacity: pressed || socialLoading === "apple" ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              {socialLoading === "apple" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={19} color="#FFFFFF" />
                  <Text style={styles.appleBtnText}>Apple</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

          {/* Footer Link (Toggle to Register) */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(280).duration(450).springify() : undefined}
            style={styles.footerSection}
          >
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/auth/register" as any)} hitSlop={8}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
          </Animated.View>
        </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  centerContainer: {
    width: "100%",
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  brandText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  titleSection: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 25,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  formContainer: {
    paddingHorizontal: 24,
    gap: 15,
  },
  inputSection: {
    gap: 6,
  },
  pillInputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 14,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  primaryGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "lowercase",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  googleBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  googleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#1F2937",
  },
  appleBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  appleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  footerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#00A3FF",
  },
});
