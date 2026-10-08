import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  OrganisationFields,
  organisationFormValues,
  toOrganisationInput,
  validateOrganisation,
  type OrganisationFormValues,
} from "@/components/OrganisationForm";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeError, USE_ORGANISER_API } from "@/services/organiserService";

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_ORGANISER_API;

export default function EditOrganisationScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const creating = mode === "create";
  const { user, setupOrganisation, updateOrganisation } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const org = creating ? undefined : user?.organisation;

  const [values, setValues] = useState<OrganisationFormValues>(() =>
    organisationFormValues(
      creating ? {} : org ?? { name: user?.businessName, website: user?.businessWebsite },
    ),
  );
  const [logoUri, setLogoUri] = useState<string | undefined>(org?.logoUrl);
  const [touched, setTouched] = useState<Partial<Record<keyof OrganisationFormValues, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [demoFail, setDemoFail] = useState(false);

  const errors = validateOrganisation(values);
  const errorCount = submitAttempted ? Object.keys(errors).length : 0;

  const save = async () => {
    setSubmitAttempted(true);
    if (Object.keys(errors).length) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const input = toOrganisationInput(values, logoUri);
      if (creating) await setupOrganisation(input, demoFail);
      else await updateOrganisation(input, demoFail);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError(describeError(error, "We couldn't save your changes. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PortalScreenHeader title={creating ? "New organisation" : "Edit organisation"} disabled={saving} />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {errorCount > 0 && (
          <View style={[styles.banner, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive + "55" }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>
              {errorCount === 1 ? "1 field needs" : `${errorCount} fields need`} your attention.
            </Text>
          </View>
        )}

        <OrganisationFields
          values={values}
          onChange={(key, text) => {
            setValues((v) => ({ ...v, [key]: text }));
            if (saveError) setSaveError(null);
          }}
          onBlur={(key) => setTouched((t) => ({ ...t, [key]: true }))}
          errorFor={(key) => (touched[key] || submitAttempted ? errors[key] : undefined)}
          logoUri={logoUri}
          onLogoChange={setLogoUri}
        />

        {SHOW_DEMO_CONTROLS && (
          <View style={[styles.demoBox, { borderColor: colors.border }]}>
            <Text style={[styles.hint, styles.flex, { color: colors.mutedForeground }]}>
              Demo mode (no organisations API yet) · simulate a save failure
            </Text>
            <Switch
              value={demoFail}
              onValueChange={setDemoFail}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        )}

        {saveError && (
          <View style={[styles.banner, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive + "55" }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.destructive} />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Changes not saved</Text>
              <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
                {saveError} Your edits are still here.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.75 : 1 }]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={saveError ? "refresh" : "checkmark-circle-outline"} size={20} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>
            {saving ? "Saving…" : saveError ? "Try again" : creating ? "Create organisation" : "Save changes"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  bannerText: { flexShrink: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  demoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
