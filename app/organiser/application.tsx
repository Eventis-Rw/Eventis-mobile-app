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

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
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
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Organiser application" step={1} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Natural human-crafted intro header */}
          <View style={styles.introHeader}>
            <Text style={[styles.heading, { color: palette.text }]}>
              Tell us about your organization
            </Text>
            <Text style={[styles.subheading, { color: palette.muted }]}>
              This information will be displayed on your official organizer profile and event pages across Eventis.
            </Text>
          </View>

          {/* Form Groups */}
          <View style={styles.formFlow}>
            {/* Group 1: Identity */}
            <View
              style={[
                styles.groupCard,
                { backgroundColor: palette.surface, borderColor: palette.line },
              ]}
            >
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconWrap, { backgroundColor: palette.blueSoft }]}>
                  <Ionicons name="business" size={17} color={palette.blue} />
                </View>
                <Text style={[styles.groupTitle, { color: palette.text }]}>
                  Organization profile
                </Text>
              </View>

              {/* Field: Name */}
              <View style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  Organization name <Text style={{ color: palette.blue }}>*</Text>
                </Text>
                <Text style={[styles.fieldHint, { color: palette.muted }]}>
                  The public name attendees will see on your event pages.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surfaceRaised,
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
                    name="text-outline"
                    size={18}
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

              {/* Field: Activities */}
              <View style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  What kind of events do you host? <Text style={{ color: palette.blue }}>*</Text>
                </Text>
                <Text style={[styles.fieldHint, { color: palette.muted }]}>
                  A brief summary of the experiences you curate for attendees.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surfaceRaised,
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
                    size={18}
                    color={focusedField === "activities" ? palette.blue : palette.muted}
                    style={styles.fieldLeadingIcon}
                  />
                  <TextInput
                    value={values.activities}
                    onChangeText={(t) => updateField("activities", t)}
                    onFocus={() => setFocusedField("activities")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Live music concerts, art exhibitions, tech conferences"
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
            </View>

            {/* Group 2: Bio & Description */}
            <View
              style={[
                styles.groupCard,
                { backgroundColor: palette.surface, borderColor: palette.line },
              ]}
            >
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconWrap, { backgroundColor: palette.blueSoft }]}>
                  <Ionicons name="document-text-outline" size={17} color={palette.blue} />
                </View>
                <Text style={[styles.groupTitle, { color: palette.text }]}>
                  About your brand
                </Text>
              </View>

              <View style={styles.fieldItem}>
                <View style={styles.labelWithCounter}>
                  <Text style={[styles.fieldLabel, { color: palette.text }]}>
                    Bio & description <Text style={{ color: palette.blue }}>*</Text>
                  </Text>
                  <Text style={[styles.counterText, { color: palette.muted }]}>
                    {values.description.length}/{LIMITS.description}
                  </Text>
                </View>
                <Text style={[styles.fieldHint, { color: palette.muted }]}>
                  Share who you are, what inspires your events, and what attendees can expect.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    styles.textAreaContainer,
                    {
                      backgroundColor: palette.surfaceRaised,
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
                    placeholder="Tell attendees about your journey, the experiences you create, and the community you build..."
                    placeholderTextColor={palette.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={LIMITS.description}
                    style={[styles.textInput, styles.textArea, { color: palette.text }]}
                    accessibilityLabel="Bio and description"
                  />
                </View>
                {submitted && errors.description ? (
                  <Text style={[styles.fieldError, { color: palette.danger }]}>
                    {errors.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Group 3: Location & Web Links */}
            <View
              style={[
                styles.groupCard,
                { backgroundColor: palette.surface, borderColor: palette.line },
              ]}
            >
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconWrap, { backgroundColor: palette.blueSoft }]}>
                  <Ionicons name="map-outline" size={17} color={palette.blue} />
                </View>
                <Text style={[styles.groupTitle, { color: palette.text }]}>
                  Location & online presence
                </Text>
              </View>

              {/* Field: Location */}
              <View style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  Where are you based? <Text style={{ color: palette.blue }}>*</Text>
                </Text>
                <Text style={[styles.fieldHint, { color: palette.muted }]}>
                  City or region where your events primarily happen.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surfaceRaised,
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
                    size={18}
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

              {/* Field: Website */}
              <View style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  Website or social profile{" "}
                  <Text style={{ color: palette.muted, fontFamily: "Inter_400Regular" }}>(optional)</Text>
                </Text>
                <Text style={[styles.fieldHint, { color: palette.muted }]}>
                  Your official site, Instagram, or social link for attendees.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surfaceRaised,
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
                    size={18}
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
                    accessibilityLabel="Website or social profile"
                  />
                </View>
                {submitted && errors.website ? (
                  <Text style={[styles.fieldError, { color: palette.danger }]}>
                    {errors.website}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Reassurance Note */}
          <View
            style={[
              styles.infoCallout,
              { backgroundColor: palette.surface, borderColor: palette.line },
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={palette.blue} />
            <Text style={[styles.infoCalloutText, { color: palette.muted }]}>
              You can update your organization details, upload your logo, and add your team members anytime from your organizer settings.
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: `${palette.danger}18`, borderColor: palette.danger },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
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
                {created ? "Retry and continue" : "Continue to plan selection"}
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
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  introHeader: {
    gap: 8,
    marginTop: 4,
  },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.6,
  },
  subheading: {
    fontSize: 14.5,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  formFlow: {
    gap: 16,
  },
  groupCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 18,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 2,
  },
  groupIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 15.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  fieldItem: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  fieldHint: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
    marginBottom: 4,
  },
  labelWithCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  inputContainer: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  textAreaContainer: {
    minHeight: 112,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  fieldLeadingIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 88,
    lineHeight: 22,
    paddingTop: 0,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  infoCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  button: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  buttonText: {
    fontSize: 15.5,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
