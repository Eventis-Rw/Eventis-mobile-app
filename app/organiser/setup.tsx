import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { describeError, USE_ORGANISER_API } from "@/services/organiserService";

interface FormValues {
  name: string;
  description: string;
  activities: string;
  location: string;
  website: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const LIMITS = { name: 80, description: 1000, activities: 300, location: 120 };
const SHOW_DEMO_CONTROLS = __DEV__ && !USE_ORGANISER_API;

/** Organisation name/description limits mirror organizerApplication in @eventis/contracts. */
function validateOrganisation(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (v.name.trim().length < 2) errors.name = "Enter your organisation's name (at least 2 characters).";
  if (v.description.trim().length < 20) errors.description = "Describe your organisation in at least 20 characters.";
  if (v.activities.trim().length < 3) errors.activities = "Tell attendees what your organisation does.";
  if (v.location.trim().length < 2) errors.location = "Enter where your organisation is based.";
  const website = v.website.trim();
  if (website && !/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(website)) {
    errors.website = "Enter a valid website, e.g. https://example.com";
  }
  return errors;
}

function normaliseWebsite(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function OrganisationSetupScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, setupOrganisation } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [values, setValues] = useState<FormValues>({
    name: user?.businessName ?? "",
    description: "",
    activities: "",
    location: "",
    website: user?.businessWebsite ?? "",
  });
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [logoError, setLogoError] = useState<string | undefined>();
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
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
  const visibleError = (key: keyof FormValues) =>
    touched[key] || submitAttempted ? errors[key] : undefined;

  const set = (key: keyof FormValues) => (text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
    if (submitError) setSubmitError(null);
  };
  const blur = (key: keyof FormValues) => () => setTouched((t) => ({ ...t, [key]: true }));

  const pickLogo = async () => {
    setLogoError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) setLogoUri(result.assets[0].uri);
    } catch {
      setLogoError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

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
      await setupOrganisation(
        {
          name: values.name.trim(),
          description: values.description.trim(),
          activities: values.activities.trim(),
          location: values.location.trim(),
          website: normaliseWebsite(values.website),
          logoUri,
        },
        demoFail,
      );
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
    const toCreatePost = () => router.replace("/business/create-event" as any);
    const toDashboard = () => router.replace("/business/dashboard" as any);
    const primary = from === "create-post"
      ? { label: "Create your first post", icon: "create-outline" as const, onPress: toCreatePost }
      : { label: "Go to organiser dashboard", icon: "grid-outline" as const, onPress: toDashboard };
    const secondary = from === "create-post"
      ? { label: "Go to organiser dashboard", onPress: toDashboard }
      : { label: "Create your first post", onPress: toCreatePost };

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
              {values.name.trim()} is set up on your account. You can now create posts and events, and
              you can keep browsing Eventis as usual.
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

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.logoRow}>
            <Pressable
              onPress={pickLogo}
              style={[styles.logo, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={logoUri ? "Change organisation logo" : "Add organisation logo"}
            >
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImg} />
              ) : (
                <Ionicons name="camera-outline" size={26} color={colors.mutedForeground} />
              )}
            </Pressable>
            <View style={styles.logoCopy}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Logo / profile image <Text style={{ color: colors.mutedForeground }}>(optional)</Text>
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>Square images work best.</Text>
              <View style={styles.logoActions}>
                <Pressable onPress={pickLogo} hitSlop={6}>
                  <Text style={[styles.link, { color: colors.primary }]}>{logoUri ? "Change" : "Upload image"}</Text>
                </Pressable>
                {logoUri && (
                  <Pressable onPress={() => setLogoUri(undefined)} hitSlop={6}>
                    <Text style={[styles.link, { color: colors.destructive }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
              {logoError && <Text style={[styles.error, { color: colors.destructive }]}>{logoError}</Text>}
            </View>
          </View>

          <FormField
            label="Organisation name"
            required
            icon="business-outline"
            value={values.name}
            onChangeText={set("name")}
            onBlur={blur("name")}
            error={visibleError("name")}
            placeholder="e.g. Kigali Jazz Collective"
            maxLength={LIMITS.name}
          />
          <FormField
            label="Description"
            required
            value={values.description}
            onChangeText={set("description")}
            onBlur={blur("description")}
            error={visibleError("description")}
            placeholder="Who you are and the kind of events you host"
            multiline
            maxLength={LIMITS.description}
            showCount
          />
          <FormField
            label="What your organisation does"
            required
            icon="sparkles-outline"
            value={values.activities}
            onChangeText={set("activities")}
            onBlur={blur("activities")}
            error={visibleError("activities")}
            placeholder="e.g. Live music nights, workshops, festivals"
            maxLength={LIMITS.activities}
          />
          <FormField
            label="Location"
            required
            icon="location-outline"
            value={values.location}
            onChangeText={set("location")}
            onBlur={blur("location")}
            error={visibleError("location")}
            placeholder="e.g. Kigali, Rwanda"
            maxLength={LIMITS.location}
          />
          <FormField
            label="Website"
            icon="globe-outline"
            value={values.website}
            onChangeText={set("website")}
            onBlur={blur("website")}
            error={visibleError("website")}
            placeholder="https://yourorganisation.com"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

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

function FormField({
  label,
  required,
  icon,
  error,
  multiline,
  showCount,
  value,
  maxLength,
  ...input
}: {
  label: string;
  required?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  error?: string;
  showCount?: boolean;
} & TextInputProps) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label}
        {required && <Text style={{ color: colors.primary }}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMulti,
          { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border },
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.mutedForeground} />}
        <TextInput
          {...input}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, multiline && styles.inputMulti, { color: colors.foreground }]}
          accessibilityLabel={label}
          accessibilityHint={error}
        />
      </View>
      <View style={styles.fieldFooter}>
        {error ? (
          <Text style={[styles.error, styles.flex, { color: colors.destructive }]}>{error}</Text>
        ) : (
          <View style={styles.flex} />
        )}
        {showCount && maxLength && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {(value ?? "").length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  section: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoCopy: { flex: 1, gap: 3 },
  logoActions: { flexDirection: "row", gap: 16, marginTop: 4 },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputWrapMulti: { alignItems: "flex-start" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 12 },
  inputMulti: { height: 110 },
  fieldFooter: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
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
