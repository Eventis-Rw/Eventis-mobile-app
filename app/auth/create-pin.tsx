import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Logo } from "@/components/Logo";
import { PinInput } from "@/components/PinInput";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

export default function CreatePinScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { pendingSignup, register, user } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<{ pin?: string; confirmation?: string; submit?: string }>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async () => {
    if (submitting.current || !pendingSignup?.verified) return;
    const nextErrors = {
      pin: /^\d{5}$/.test(pin) ? undefined : "Enter exactly 5 digits.",
      confirmation: /^\d{5}$/.test(confirmation) ? (pin === confirmation ? undefined : "Your PINs don't match. Please try again.") : "Re-enter your 5 digit PIN.",
    };
    setErrors(nextErrors);
    if (nextErrors.pin || nextErrors.confirmation) return;
    submitting.current = true;
    setLoading(true);
    try {
      await register({ phone: pendingSignup.phone, username: pendingSignup.username, pin });
      setPin("");
      setConfirmation("");
      router.replace("/(tabs)");
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Couldn't create your account. Please try again." });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (user) return <Redirect href="/(tabs)" />;
  if (!pendingSignup?.verified) return <Redirect href="/auth/register" />;

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) }]} keyboardShouldPersistTaps="handled" bottomOffset={24}>
      <Pressable onPress={() => router.replace("/auth/register")} disabled={loading} accessibilityRole="button" accessibilityLabel="Back to signup details" style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>
      <View style={styles.heading}>
        <Logo variant="primary" style={styles.logo} />
        <Text style={[styles.step, { color: colors.primary }]}>STEP 3 OF 3 · SECURE YOUR ACCOUNT</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Create your PIN</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Choose a 5 digit PIN to sign in. Enter it again below to make sure it's right.</Text>
      </View>
      <View style={[styles.verified, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
        <View style={styles.flex}><Text style={[styles.verifiedLabel, { color: colors.mutedForeground }]}>Phone verified</Text><Text style={[styles.phone, { color: colors.foreground }]}>{pendingSignup.phone}</Text></View>
      </View>
      <PinInput value={pin} onChangeText={(value) => { setPin(value); setErrors({}); }} error={errors.pin} />
      <PinInput label="Confirm PIN" placeholder="Re-enter your PIN" value={confirmation} onChangeText={(value) => { setConfirmation(value); setErrors((current) => ({ pin: current.pin })); }} error={errors.confirmation} />
      {errors.submit ? <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{errors.submit}</Text> : null}
      <Pressable onPress={handleSubmit} disabled={loading} accessibilityRole="button" accessibilityState={{ busy: loading }} style={[styles.submit, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
        <Text style={styles.submitText}>{loading ? "Creating account..." : "Create account"}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>Use this PIN with your phone number whenever you sign in.</Text>
    </KeyboardAwareScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 24, gap: 22 },
  back: { minHeight: 44, width: 44, justifyContent: "center" },
  heading: { alignItems: "center", gap: 14 }, logo: { width: 68, height: 68, marginBottom: 8 },
  step: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, textAlign: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 23, textAlign: "center" },
  verified: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 16 },
  flex: { flex: 1 }, verifiedLabel: { fontSize: 12, marginBottom: 4 }, phone: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  submit: { minHeight: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", padding: 14 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" }, hint: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
