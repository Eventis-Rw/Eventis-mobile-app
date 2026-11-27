import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import {
  organisationFormValues,
  toOrganisationInput,
  validateOrganisation,
  type OrganisationFormValues,
} from "@/components/OrganisationForm";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { createOrganiserApplication } from "@/services/organiserApplicationService";
import { describeError, USE_ORGANISER_API } from "@/services/organiserService";

const LIMITS = { name: 80, description: 1000, activities: 140, location: 100 };

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const errors = validateOrganisation(values);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  const updateField = (key: keyof OrganisationFormValues, val: string) => {
    if (!created) {
      setValues((prev) => ({ ...prev, [key]: val }));
    }
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { logoUri: _logo, ...input } = toOrganisationInput(values);
      let application = created;
      if (!application) {
        try {
          application = await createOrganiserApplication(input);
        } catch (apiErr) {
          if (user?.isDemo || !USE_ORGANISER_API) {
            application = { manualPaymentId: null } as any;
          } else {
            throw apiErr;
          }
        }
      }
      setCreated(application);
      await refreshOrganiserSubscription();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace(
        (application?.manualPaymentId ? "/organiser/payments" : "/organiser/subscribe") as never
      );
    } catch (err) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      setError(
        describeError(err, "Could not submit your application. Please check your details and try again.")
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.blue} size="large" accessibilityLabel="Loading application" />
      </View>
    );
  }

  const step = getOrganiserStep(user);
  if (step === "setup") return <Redirect href="/organiser/setup" />;
  if (step === "ready") return <Redirect href="/business/dashboard" />;

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      {/* Clean Home-styled Top Header with Chevron Back */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: palette.canvas,
            borderBottomColor: palette.line,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: palette.surface,
                borderColor: palette.line,
              },
              pressed && { backgroundColor: palette.surfaceRaised },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: palette.text }]}>Application</Text>

          {/* Spacer to balance back button */}
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header intro seamlessly on the canvas */}
          <View style={styles.introHeader}>
            <Text style={[styles.heading, { color: palette.text }]}>
              Tell us about your organization
            </Text>
            <Text style={[styles.subheading, { color: palette.muted }]}>
              Basic details to set up your organizer profile and event pages.
            </Text>
          </View>

          {/* Form fields directly sharing the page background (no outer div / box) */}
          <View style={styles.fieldsContainer}>
            {/* Organization Name */}
            <View style={styles.fieldItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                Organization name <Text style={{ color: palette.blue }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: palette.surface,
                    borderColor:
                      submitted && errors.name
                        ? palette.danger
                        : focusedField === "name"
                        ? palette.blue
                        : palette.line,
                  },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={17}
                  color={focusedField === "name" ? palette.blue : palette.muted}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  value={values.name}
                  onChangeText={(t) => updateField("name", t)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Kigali Jazz Collective"
                  placeholderTextColor={palette.muted}
                  maxLength={LIMITS.name}
                  style={[styles.textInput, { color: palette.text }]}
                  accessibilityLabel="Organization name"
                />
              </View>
              {submitted && errors.name ? (
                <Text style={[styles.fieldError, { color: palette.danger }]}>
                  {errors.name}
                </Text>
              ) : null}
            </View>

            {/* Event Focus */}
            <View style={styles.fieldItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                What kind of events do you host? <Text style={{ color: palette.blue }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: palette.surface,
                    borderColor:
                      submitted && errors.activities
                        ? palette.danger
                        : focusedField === "activities"
                        ? palette.blue
                        : palette.line,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={17}
                  color={focusedField === "activities" ? palette.blue : palette.muted}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  value={values.activities}
                  onChangeText={(t) => updateField("activities", t)}
                  onFocus={() => setFocusedField("activities")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Live music concerts, festivals, conferences"
                  placeholderTextColor={palette.muted}
                  maxLength={LIMITS.activities}
                  style={[styles.textInput, { color: palette.text }]}
                  accessibilityLabel="What kind of events do you host"
                />
              </View>
              {submitted && errors.activities ? (
                <Text style={[styles.fieldError, { color: palette.danger }]}>
                  {errors.activities}
                </Text>
              ) : null}
            </View>

            {/* Description */}
            <View style={styles.fieldItem}>
              <View style={styles.labelWithCounter}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  About your organization <Text style={{ color: palette.blue }}>*</Text>
                </Text>
                <Text style={[styles.counterText, { color: palette.muted }]}>
                  {values.description.length}/{LIMITS.description}
                </Text>
              </View>
              <View
                style={[
                  styles.inputContainer,
                  styles.textAreaContainer,
                  {
                    backgroundColor: palette.surface,
                    borderColor:
                      submitted && errors.description
                        ? palette.danger
                        : focusedField === "description"
                        ? palette.blue
                        : palette.line,
                  },
                ]}
              >
                <TextInput
                  value={values.description}
                  onChangeText={(t) => updateField("description", t)}
                  onFocus={() => setFocusedField("description")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="A brief bio of who you are and what attendees can expect..."
                  placeholderTextColor={palette.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={LIMITS.description}
                  style={[styles.textInput, styles.textArea, { color: palette.text }]}
                  accessibilityLabel="About your organization"
                />
              </View>
              {submitted && errors.description ? (
                <Text style={[styles.fieldError, { color: palette.danger }]}>
                  {errors.description}
                </Text>
              ) : null}
            </View>

            {/* Location */}
            <View style={styles.fieldItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                Location <Text style={{ color: palette.blue }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: palette.surface,
                    borderColor:
                      submitted && errors.location
                        ? palette.danger
                        : focusedField === "location"
                        ? palette.blue
                        : palette.line,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={focusedField === "location" ? palette.blue : palette.muted}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  value={values.location}
                  onChangeText={(t) => updateField("location", t)}
                  onFocus={() => setFocusedField("location")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Kigali, Rwanda"
                  placeholderTextColor={palette.muted}
                  maxLength={LIMITS.location}
                  style={[styles.textInput, { color: palette.text }]}
                  accessibilityLabel="Location"
                />
              </View>
              {submitted && errors.location ? (
                <Text style={[styles.fieldError, { color: palette.danger }]}>
                  {errors.location}
                </Text>
              ) : null}
            </View>

            {/* Website or Social */}
            <View style={styles.fieldItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                Website or social{" "}
                <Text style={{ color: palette.muted, fontFamily: "Inter_400Regular" }}>(optional)</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: palette.surface,
                    borderColor:
                      submitted && errors.website
                        ? palette.danger
                        : focusedField === "website"
                        ? palette.blue
                        : palette.line,
                  },
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={17}
                  color={focusedField === "website" ? palette.blue : palette.muted}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  value={values.website}
                  onChangeText={(t) => updateField("website", t)}
                  onFocus={() => setFocusedField("website")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="https://instagram.com/yourhandle"
                  placeholderTextColor={palette.muted}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.textInput, { color: palette.text }]}
                  accessibilityLabel="Website or social"
                />
              </View>
              {submitted && errors.website ? (
                <Text style={[styles.fieldError, { color: palette.danger }]}>
                  {errors.website}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: `${palette.danger}18`, borderColor: palette.danger },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={17} color={palette.danger} />
              <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Submit CTA Button */}
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
              <ActivityIndicator color={palette.onBlue} />
            ) : (
              <Text style={[styles.buttonText, { color: palette.onBlue }]}>
                {created ? "Retry and continue" : "Continue to plans"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  introHeader: {
    gap: 4,
    marginTop: 2,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  fieldsContainer: {
    gap: 14,
  },
  fieldItem: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  labelWithCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterText: {
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
  },
  inputContainer: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  textAreaContainer: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  fieldLeadingIcon: {
    marginRight: 9,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: "Inter_500Medium",
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 68,
    lineHeight: 21,
    paddingTop: 0,
  },
  fieldError: {
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },
  button: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 6,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
