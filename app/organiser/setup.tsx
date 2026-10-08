import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import {
  OrganisationFields,
  organisationFormValues,
  toOrganisationInput,
  validateOrganisation,
  type OrganisationFormValues,
} from "@/components/OrganisationForm";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { describeError, USE_ORGANISER_API } from "@/services/organiserService";

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_ORGANISER_API;

export default function OrganisationSetupScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, setupOrganisation } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [values, setValues] = useState<OrganisationFormValues>(() =>
    organisationFormValues({ name: user?.businessName, website: user?.businessWebsite }),
  );
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [touched, setTouched] = useState<Partial<Record<keyof OrganisationFormValues, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [demoFail, setDemoFail] = useState(false);

  const step = getOrganiserStep(user);
  // Setup is only reachable after paying; deep links without a subscription start from the beginning.
  if (!completed && step === "intro") {
    return <Redirect href={{ pathname: "/organiser" as any, params: from ? { from } : {} }} />;
  }
  // `submitting` covers the gap where the user is already updated but `completed` isn't set yet.
  if (!completed && !submitting && step === "ready") {
    return <Redirect href={"/business/dashboard" as any} />;
  }

  const errors = validateOrganisation(values);

  const submit = async () => {
    setSubmitAttempted(true);
    if (Object.keys(errors).length) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await setupOrganisation(toOrganisationInput(values, logoUri), demoFail);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCompleted(true);
    } catch (error) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError(describeError(error, "We couldn't save your organisation. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    // replace() swaps the whole onboarding stack out, so Back doesn't return into it.
    const toCreate = () => router.replace("/business/create" as any);
    const toPortal = () => router.replace("/business/dashboard" as any);
    const primary = from === "create-post"
      ? { label: "Start creating", icon: "create-outline" as const, onPress: toCreate }
      : { label: "Open organiser portal", icon: "grid-outline" as const, onPress: toPortal };
    const secondary = from === "create-post"
      ? { label: "Open organiser portal", onPress: toPortal }
      : { label: "Start creating", onPress: toCreate };

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.doneWrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn} style={styles.done}>
            <View style={[styles.doneLogo, { backgroundColor: colors.primary }]}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={[styles.logoImg, { borderRadius: 48 }]} />
              ) : (
                <Text style={styles.doneLetter}>{values.name.trim().charAt(0).toUpperCase()}</Text>
              )}
              <View style={[styles.doneCheck, { backgroundColor: colors.success, borderColor: colors.background }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            </View>
            <Text style={[styles.doneTitle, { color: colors.foreground }]}>You're an organiser</Text>
            <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
              {values.name.trim()} is set up on your account. Manage it and create events, posts and
              stories from the organiser portal, and keep browsing Eventis as usual.
            </Text>
            <View style={styles.doneActions}>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={primary.onPress}>
                <Ionicons name={primary.icon} size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{primary.label}</Text>
              </Pressable>
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.border }]}
                onPress={secondary.onPress}
              >
                <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>{secondary.label}</Text>
              </Pressable>
              <Pressable onPress={() => router.dismissTo("/(tabs)" as any)} style={styles.secondaryBtn}>
                <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Back to Eventis</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  const errorCount = submitAttempted ? Object.keys(errors).length : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserFlowHeader title="Organisation setup" step={3} canGoBack={!submitting} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}>
          <Text style={[styles.title, { color: colors.foreground }]}>Tell us about your organisation</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            This is what attendees see on your posts. It's linked to your account, so there's no
            separate login.
          </Text>
        </Animated.View>

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
            if (submitError) setSubmitError(null);
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

        {submitError && (
          <View style={[styles.banner, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive + "55" }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.destructive} />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Setup didn't complete</Text>
              <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
                {submitError} Your details are still here.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.75 : 1 }]}
          onPress={submit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityState={{ busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={submitError ? "refresh" : "checkmark-circle-outline"} size={20} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>
            {submitting ? "Setting up…" : submitError ? "Try again" : "Finish setup"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  logoImg: { width: "100%", height: "100%" },
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
  outlineBtn: { alignItems: "center", paddingVertical: 15, borderRadius: 16, borderWidth: 1 },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  doneWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  done: { alignItems: "center", gap: 14 },
  doneLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneLetter: { color: "#fff", fontSize: 40, fontFamily: "Inter_700Bold" },
  doneCheck: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  doneActions: { alignSelf: "stretch", gap: 10, marginTop: 12 },
});
