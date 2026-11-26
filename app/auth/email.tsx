import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/KeyboardCompat";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

export default function EmailAuthScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const registering = mode === "register";
  const { sendEmailCode, verifyEmailCode } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [sentEmail, setSentEmail] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const coolingDown = seconds > 0 && sentEmail === email.trim().toLowerCase();
  const send = async () => {
    if (submitting.current || coolingDown) return;
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanEmail.length > 255
    ) {
      setError("Enter a valid email address.");
      return;
    }
    if (registering && username.trim().length < 2) {
      setError("Enter a username with at least 2 characters.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const challenge = await sendEmailCode({
        email: cleanEmail,
        purpose: registering ? "register" : "login",
        ...(registering ? { username: username.trim() } : {}),
      });
      setEmail(cleanEmail);
      setSentEmail(cleanEmail);
      setChallengeId(challenge.challengeId);
      setCode("");
      setResendAt(Date.now() + challenge.retryAfterSeconds * 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to send your code.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const verify = async () => {
    if (submitting.current || !challengeId) return;
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6 digit code from your email.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await verifyEmailCode({ email, challengeId, code });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to verify your code.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    setChallengeId(null);
    setCode("");
    setError("");
  }, [mode]);
  const fieldStyle = [
    styles.field,
    {
      color: colors.foreground,
      backgroundColor: colors.input,
      borderColor: colors.border,
    },
  ];
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === "dark"
            ? ["#121212", "#000000", colors.background]
            : ["#D9E6FF", "#E8EEF8", colors.background]
        }
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Logo style={styles.logo} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {challengeId
            ? "Check your email"
            : registering
              ? "Register with email"
              : "Sign in with email"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {challengeId
            ? registering
              ? `Check ${email} for your code. Check spam too, or try signing in if you already have an account.`
              : `If you have an account with ${email}, we’ve sent a 6 digit code. Check your spam folder too.`
            : "We’ll email you a verification code to continue."}
        </Text>
        {!challengeId ? (
          <>
            {registering ? (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Username
                </Text>
                <TextInput
                  accessibilityLabel="Username"
                  editable={!busy}
                  style={fieldStyle}
                  value={username}
                  onChangeText={setUsername}
                  maxLength={60}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </>
            ) : null}
            <Text style={[styles.label, { color: colors.foreground }]}>
              Email address
            </Text>
            <TextInput
              accessibilityLabel="Email address"
              editable={!busy}
              style={fieldStyle}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={255}
              onSubmitEditing={() => void send()}
            />
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Verification code
            </Text>
            <TextInput
              accessibilityLabel="Email verification code"
              editable={!busy}
              style={[...fieldStyle, styles.code]}
              value={code}
              onChangeText={(text) =>
                setCode(text.replace(/\D/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              onSubmitEditing={() => void verify()}
            />
          </>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.destructive }}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy }}
          disabled={busy || (!challengeId && coolingDown)}
          onPress={() => void (challengeId ? verify() : send())}
          style={[
            styles.submit,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.submitText}>
            {busy
              ? "Please wait…"
              : challengeId
                ? "Verify and continue"
                : coolingDown
                  ? `Send again in ${seconds}s`
                  : "Send verification code"}
          </Text>
        </Pressable>
        {challengeId ? (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={busy || seconds > 0}
              onPress={() => void send()}
            >
              <Text
                style={[
                  styles.link,
                  {
                    color:
                      seconds > 0 ? colors.mutedForeground : colors.primary,
                  },
                ]}
              >
                {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setChallengeId(null);
                setCode("");
                setError("");
              }}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                Change email address
              </Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            router.replace({
              pathname: "/auth/email",
              params: { mode: registering ? "login" : "register" },
            })
          }
        >
          <Text style={[styles.link, { color: colors.primary }]}>
            {registering
              ? "Already registered? Sign in"
              : "New to Eventis? Register"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 16, flexGrow: 1 },
  logo: { width: 68, height: 68, alignSelf: "center", marginTop: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center" },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 12,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  field: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
  },
  code: { fontSize: 24, letterSpacing: 8, textAlign: "center" },
  submit: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  link: { textAlign: "center", paddingVertical: 8, fontSize: 14 },
});
