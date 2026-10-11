import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/OrganisationForm";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { InlineError } from "@/components/profile/ProfileSection";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeProfileError } from "@/services/profileService";
import { changePassword, PASSWORD_CHANGE_SUPPORTED, validateNewPassword } from "@/services/securityService";
import { getToken } from "@/utils/apiClient";

/** Sign-in details, phone verification, password and the way out. */
export default function SecurityScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [hasServerSession, setHasServerSession] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  // Demo and offline phone sessions have no password to change.
  useEffect(() => {
    getToken().then((token) => setHasServerSession(!!token && !token.startsWith("demo_token_") && !user?.isDemo));
  }, [user?.isDemo]);

  if (!user) return null;
  const canChangePassword = PASSWORD_CHANGE_SUPPORTED && hasServerSession;

  const submitPassword = async () => {
    const problem = validateNewPassword(current, next, repeat);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      setChanged(true);
      setShowPasswordForm(false);
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      setError(describeProfileError(err, "We couldn't change your password."));
    } finally {
      setSaving(false);
    }
  };

  const field = (value: string, setter: (v: string) => void) => ({
    value,
    onChangeText: (text: string) => {
      setter(text);
      setError(null);
    },
    secureTextEntry: true,
    autoCapitalize: "none" as const,
    autoCorrect: false,
    editable: !saving,
  });

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileSubHeader title="Security" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <SettingsGroup title="Sign-in" footer="Contact support to change your sign-in email.">
          <SettingsRow icon="mail-outline" label="Email" sublabel={user.email} />
          <SettingsRow
            icon="phone-portrait-outline"
            label="Phone"
            sublabel={user.phone ?? "No phone number"}
            badge={user.isPhoneVerified ? { text: "Verified", tone: "success" } : { text: "Verify", tone: "primary" }}
            onPress={
              user.isPhoneVerified
                ? undefined
                : () => router.push({ pathname: "/verify-phone", params: { purpose: "settings" } } as any)
            }
          />
        </SettingsGroup>

        {canChangePassword ? (
          <SettingsGroup
            title="Password"
            footer={changed ? "Your password was changed." : undefined}
          >
            {showPasswordForm ? (
              <View style={styles.form}>
                <FormField label="Current password" icon="lock-closed-outline" {...field(current, setCurrent)} />
                <FormField label="New password" icon="key-outline" {...field(next, setNext)} />
                <FormField label="Repeat new password" icon="key-outline" {...field(repeat, setRepeat)} />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>At least 8 characters, with letters and numbers.</Text>
                {error ? <InlineError message={error} /> : null}
                <View style={styles.formActions}>
                  <Pressable
                    onPress={() => setShowPasswordForm(false)}
                    disabled={saving}
                    style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitPassword}
                    disabled={saving}
                    style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.8 : 1 }]}
                    accessibilityRole="button"
                    accessibilityState={{ busy: saving }}
                  >
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Save</Text>}
                  </Pressable>
                </View>
              </View>
            ) : (
              <SettingsRow
                icon="key-outline"
                label="Change password"
                onPress={() => {
                  setChanged(false);
                  setShowPasswordForm(true);
                }}
              />
            )}
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="Delete account" footer="Requires a one-time code and typing DELETE.">
          <SettingsRow
            icon="trash-outline"
            label="Delete account"
            sublabel="Permanently remove your account and data"
            destructive
            onPress={() => router.push("/delete-account" as any)}
          />
        </SettingsGroup>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 22 },
  form: { paddingVertical: 12, gap: 12 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  formActions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
