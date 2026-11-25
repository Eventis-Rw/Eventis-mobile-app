import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrganisationFields, organisationFormValues, toOrganisationInput, validateOrganisation, type OrganisationFormValues } from "@/components/OrganisationForm";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
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
    if (Object.keys(errors).length) return;
    setBusy(true);
    setError(null);
    try {
      const { logoUri: _logo, ...input } = toOrganisationInput(values);
      const application = created ?? await createOrganiserApplication(input);
      setCreated(application);
      await refreshOrganiserSubscription();
      router.replace((application.manualPaymentId ? "/organiser/payments" : "/organiser/subscribe") as never);
    } catch (err) {
      setError(describeError(err, "Could not submit your application. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <ActivityIndicator accessibilityLabel="Loading organiser access" />;
  const step = getOrganiserStep(user);
  if (step === "setup") return <Redirect href="/organiser/setup" />;
  if (step === "ready") return <Redirect href="/business/dashboard" />;

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={{ color: palette.accent }}>Back</Text></Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Organiser application</Text>
        <Text style={{ color: palette.muted }}>Tell us about your organisation before choosing and paying for a plan.</Text>
        <OrganisationFields
          values={values}
          onChange={(key, text) => { if (!created) setValues((current) => ({ ...current, [key]: text })); }}
          onBlur={() => {}}
          errorFor={(key) => submitted ? errors[key] : undefined}
          onLogoChange={() => {}}
          showLogo={false}
        />
        {error ? <Text style={{ color: "#d33" }}>{error}</Text> : null}
        <Pressable style={[styles.button, { backgroundColor: palette.blue }]} onPress={() => void submit()} disabled={busy} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{created ? "Retry and continue" : "Continue to payment"}</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  title: { fontSize: 26, fontWeight: "700" },
  button: { borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
});
