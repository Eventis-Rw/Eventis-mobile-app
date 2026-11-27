import { GoogleIcon } from "@/components/GoogleIcon";
import { KeyboardAwareScrollView } from "@/components/KeyboardCompat";
import { Logo } from "@/components/Logo";
import { PRIVACY_POLICY_URL, TERMS_URL } from "@/constants/legal";
import { useAuth } from "@/context/AuthContext";
import { recordEventisTermsAcceptance } from "@/services/legalAcceptanceService";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/utils/apiClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function RegisterScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { sendEmailCode, signInWithSocial } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; terms?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "email" | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const submitting = useRef(false);

  const validate = () => {
    const nextErrors: { username?: string; email?: string; terms?: string } = {};
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      nextErrors.username = "Enter a username with at least 2 characters.";
    }
    if (!cleanEmail) {
      nextErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (!agreedToTerms) {
      nextErrors.terms = "Please accept the Terms & Conditions and Privacy Policy to continue.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinueWithEmail = async () => {
    if (loading || submitting.current || !validate()) return;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    submitting.current = true;
    setLoading(true);
    setErrors({});
    try {
      const challenge = await sendEmailCode({
        email: cleanEmail,
        purpose: "register",
        username: cleanUsername,
      });
      router.push({
        pathname: "/auth/otp",
        params: {
          email: cleanEmail,
          purpose: "register",
          username: cleanUsername,
          challengeId: challenge.challengeId,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || (err.status === 400 && err.message?.toLowerCase().includes("already")))) {
        setErrors({ general: "An account with this email already exists. Please sign in instead." });
      } else if (err instanceof ApiError && err.status === 429) {
        setErrors({ general: "Too many attempts. Please wait a moment and try again." });
      } else {
        setErrors({
          general: err instanceof Error ? err.message : "Could not start registration. Please try again.",
        });
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    if (loading || socialLoading) return;
    if (!agreedToTerms) {
      setErrors({ terms: "Please accept the Terms & Conditions and Privacy Policy to continue." });
      return;
    }
    if (provider === "apple" && Platform.OS !== "ios") {
      setErrors({ general: "Apple sign-in is only available on iOS devices." });
      return;
    }
    setErrors({});
    setSocialLoading(provider);
    try {
      await signInWithSocial(provider);
      await recordEventisTermsAcceptance();
      router.replace("/(tabs)");
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Could not complete sign in. Please try again.",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleOpenLegalUrl = async (url: string) => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.open(url, "_blank");
        }
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      void Linking.openURL(url).catch(() => {});
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
              <Text style={[styles.title, { color: colors.foreground }]}>Create an account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Join Eventis to discover, attend and share memorable events
              </Text>
            </Animated.View>
          </View>

          {/* Content Section */}
        <View style={styles.formContainer}>
          {/* Username Input Field */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(100).duration(450).springify() : undefined}
            style={styles.inputSection}
          >
            <View
              style={[
                styles.pillInputContainer,
                {
                  backgroundColor: isDark ? "#161616" : colors.input,
                  borderColor: errors.username
                    ? colors.destructive
                    : focusedField === "username"
                    ? "#00A3FF"
                    : isDark
                    ? "#262626"
                    : colors.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={focusedField === "username" ? "#00A3FF" : colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.foreground }]}
                placeholder="Full name or username"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errors.username) setErrors((e) => ({ ...e, username: undefined }));
                }}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel="Username"
              />
              {username.length > 0 ? (
                <Pressable onPress={() => setUsername("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            {errors.username ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errors.username}
              </Text>
            ) : null}
          </Animated.View>

          {/* Email Input Field */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(130).duration(450).springify() : undefined}
            style={styles.inputSection}
          >
            <View
              style={[
                styles.pillInputContainer,
                {
                  backgroundColor: isDark ? "#161616" : colors.input,
                  borderColor: errors.email
                    ? colors.destructive
                    : focusedField === "email"
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
                color={focusedField === "email" ? "#00A3FF" : colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.foreground }]}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
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
            {errors.email ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errors.email}
              </Text>
            ) : null}
          </Animated.View>

          {errors.general ? (
            <Animated.Text
              entering={Platform.OS !== "web" ? FadeInDown.duration(200) : undefined}
              style={[styles.errorText, { color: colors.destructive, textAlign: "center" }]}
              accessibilityRole="alert"
            >
              {errors.general}
            </Animated.Text>
          ) : null}

          {/* Terms & Privacy Policy Agreement Row */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(145).duration(450).springify() : undefined}
            style={styles.termsWrapper}
          >
            <View style={styles.termsRow}>
              <Pressable
                onPress={() => {
                  setAgreedToTerms((v) => !v);
                  if (errors.terms) setErrors((e) => ({ ...e, terms: undefined }));
                }}
                hitSlop={8}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: agreedToTerms ? "#00A3FF" : isDark ? "#161616" : colors.input,
                    borderColor: errors.terms
                      ? colors.destructive
                      : agreedToTerms
                      ? "#00A3FF"
                      : isDark
                      ? "#2E2E2E"
                      : colors.border,
                  },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
                accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              >
                {agreedToTerms ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
              </Pressable>

              <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
                I agree to the{" "}
                <Text
                  style={[styles.termsLink, { color: "#00A3FF" }]}
                  onPress={() => void handleOpenLegalUrl(TERMS_URL)}
                  accessibilityRole="link"
                >
                  Terms & Conditions
                </Text>
                {" "}and{" "}
                <Text
                  style={[styles.termsLink, { color: "#00A3FF" }]}
                  onPress={() => void handleOpenLegalUrl(PRIVACY_POLICY_URL)}
                  accessibilityRole="link"
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
            {errors.terms ? (
              <Text style={[styles.errorText, { color: colors.destructive, paddingHorizontal: 0, marginTop: 2 }]}>
                {errors.terms}
              </Text>
            ) : null}
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
            entering={Platform.OS !== "web" ? FadeInDown.delay(190).duration(450).springify() : undefined}
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
            entering={Platform.OS !== "web" ? FadeInDown.delay(220).duration(450).springify() : undefined}
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

        {/* Footer Link (Toggle to Sign In) */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(260).duration(450).springify() : undefined}
          style={styles.footerSection}
        >
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/auth/login" as any)} hitSlop={8}>
            <Text style={styles.footerLink}>Sign In</Text>
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
    gap: 13,
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
    paddingTop: 20,
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
  termsWrapper: {
    paddingVertical: 2,
    gap: 4,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  termsLink: {
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
});
