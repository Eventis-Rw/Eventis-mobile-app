import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import {
  OrganisationFields,
  organisationFormValues,
  toOrganisationInput,
  validateOrganisation,
  type OrganisationFormValues,
} from "@/components/OrganisationForm";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { createOrganiserApplication } from "@/services/organiserApplicationService";
import { describeError } from "@/services/organiserService";

export default function OrganiserApplicationScreen() {
  const router = useRouter();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const { user, isLoading, refreshOrganiserSubscription } = useAuth();
  const [values, setValues] = useState<OrganisationFormValues>(() => organisationFormValues());
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ manualPaymentId: string | null } | null>(null);
  const errors = validateOrganisation(values);

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { logoUri: _logo, ...input } = toOrganisationInput(values);
      const application = created ?? (await createOrganiserApplication(input));
      setCreated(application);
      await refreshOrganiserSubscription();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace((application.manualPaymentId ? "/organiser/payments" : "/organiser/subscribe") as never);
    } catch (err) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(describeError(err, "Could not submit your application. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.blue} accessibilityLabel="Loading organiser access" />
      </View>
    );
  }

  const step = getOrganiserStep(user);
  if (step === "setup") return <Redirect href="/organiser/setup" />;
  if (step === "ready") return <Redirect href="/business/dashboard" />;

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Application" step={2} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingWrap}>
          <Text style={[styles.title, { color: palette.text }]}>Tell us about your brand</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Add your organization details before selecting and paying for an access pass.
          </Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <OrganisationFields
            values={values}
            onChange={(key, text) => {
              if (!created) setValues((current) => ({ ...current, [key]: text }));
            }}
            onBlur={() => {}}
            errorFor={(key) => (submitted ? errors[key] : undefined)}
            onLogoChange={() => {}}
            showLogo={false}
          />
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: `${palette.danger}18`, borderColor: palette.danger }]}>
            <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
            <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.blue },
            pressed && styles.pressed,
          ]}
          onPress={() => void submit()}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: palette.onBlue }]}>
                {created ? "Retry and continue" : "Continue to payment"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={palette.onBlue} />
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 18, gap: 18 },
  headingWrap: { gap: 6 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  subtitle: { fontSize: 13.5, lineHeight: 20, fontFamily: "Inter_400Regular" },
  formContainer: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium" },
  button: {
    minHeight: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  buttonText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
