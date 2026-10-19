import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { LoveProfileForm, type LoveProfileFormErrors, type LoveProfileFormValues } from "@/components/love/LoveProfileForm";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { LoveProfileInputError } from "@/services/findLoveService";
import { isAgeVerified } from "@/utils/findLoveAgeVerification";
import { isAdult, MIN_LOVE_AGE, validateLoveGender, validateLoveUsername } from "@/utils/findLoveProfile";

/**
 * Create a FindLove profile. The ID age check (app/love/verify.tsx) comes
 * first; the date of birth is the one read from the ID, never typed here.
 */
export default function CreateLoveProfileScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { myProfile, status, save, verification } = useMyLoveProfile();

  const [values, setValues] = useState<LoveProfileFormValues>({ username: "", accountType: "public", photoUrls: [] });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<LoveProfileFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const errors = useMemo<LoveProfileFormErrors>(() => {
    const shown = (key: keyof LoveProfileFormErrors) => submitAttempted || touched[key];
    return {
      username: serverErrors.username ?? (shown("username") ? validateLoveUsername(values.username) : undefined),
      gender: shown("gender") ? validateLoveGender(values.gender) : undefined,
      photoUrls: serverErrors.photoUrls,
    };
  }, [values, touched, submitAttempted, serverErrors]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/findlove" as any));

  if (!user) {
    return (
      <LoveScreenShell title="Create profile" onBack={back}>
        <SectionState
          kind="empty"
          icon="person-outline"
          title="Sign in to use FindLove"
          message="Your FindLove profile is linked to your Eventis account."
          actionLabel="Sign in"
          onAction={() => router.replace("/auth/login" as any)}
        />
      </LoveScreenShell>
    );
  }

  if (status === "loading" || status === "idle") {
    return (
      <LoveScreenShell title="Create profile" onBack={back}>
        <SectionState kind="loading" message="Checking your FindLove profile…" />
      </LoveScreenShell>
    );
  }

  // Someone who already has a profile edits it instead of making a second one.
  if (myProfile) {
    return (
      <LoveScreenShell title="Create profile" onBack={back}>
        <SectionState
          kind="empty"
          icon="heart-outline"
          title="You already have a profile"
          message={`You're on FindLove as @${myProfile.username}.`}
          actionLabel="Edit my profile"
          onAction={() => router.replace("/love/edit" as any)}
        />
      </LoveScreenShell>
    );
  }

  if (!user.phone) {
    return (
      <LoveScreenShell title="Create profile" onBack={back}>
        <SectionState
          kind="empty"
          icon="call-outline"
          title="Add a phone number first"
          message="FindLove uses the phone number on your Eventis account. Add one in Edit Profile, then come back."
          actionLabel="Edit Profile"
          onAction={() => router.push("/profile/edit" as any)}
        />
      </LoveScreenShell>
    );
  }

  // Step 1 is the ID check; this screen opens again once it's verified.
  if (!isAgeVerified(verification)) {
    return <Redirect href={{ pathname: "/love/verify", params: { from: "create" } } as any} />;
  }

  const dateOfBirth = verification.dateOfBirth ?? "";

  const submit = async () => {
    setSubmitAttempted(true);
    setSaveError(null);
    const hasErrors = !!validateLoveUsername(values.username) || !!validateLoveGender(values.gender);
    if (hasErrors || !values.gender) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSaving(true);
    try {
      await save({
        username: values.username,
        gender: values.gender,
        dateOfBirth,
        accountType: values.accountType,
        photoUrls: values.photoUrls,
        confirmedAdult: true,
      });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Private is a paid membership: the profile starts Public until payment is confirmed.
      if (values.accountType === "private") {
        router.replace({ pathname: "/love/membership", params: { from: "create" } } as any);
      } else {
        router.replace("/(tabs)/findlove" as any);
      }
    } catch (err) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof LoveProfileInputError) {
        if (err.field === "username" || err.field === "photoUrls") {
          setServerErrors({ [err.field]: err.message });
        } else {
          setSaveError(err.message);
        }
      } else {
        setSaveError(describeError(err, "We couldn't create your profile. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  };

  // The server rejects under-18 IDs; this is a safety net in case a verified
  // reply carries no usable date of birth.
  if (!isAdult(dateOfBirth)) {
    return (
      <LoveScreenShell title="FindLove" onBack={back}>
        <View style={styles.blocked}>
          <View style={[styles.blockedIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="hand-left-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.blockedTitle, { color: colors.foreground }]}>FindLove is for adults only</Text>
          <Text style={[styles.blockedText, { color: colors.mutedForeground }]}>
            You need to be {MIN_LOVE_AGE} or older to create a FindLove profile. You can keep using everything else on Eventis.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)" as any)}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Back to events</Text>
          </Pressable>
        </View>
      </LoveScreenShell>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LoveScreenShell title="Create profile" onBack={back} stepLabel="Step 2 of 2">
        {saveError ? <InlineError message={saveError} /> : null}
        <LoveProfileForm
          values={values}
          errors={errors}
          onChange={(next) => {
            setSaveError(null);
            setServerErrors({});
            setValues(next);
          }}
          onBlur={(field) => setTouched((t) => ({ ...t, [field]: true }))}
          phone={user.phone}
          disabled={saving}
        />
        <Pressable
          onPress={() => void submit()}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: saving || pressed ? 0.85 : 1, marginBottom: insets.bottom + 24 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>{values.accountType === "private" ? "Create profile and continue to payment" : "Create my profile"}</Text>
          )}
        </Pressable>
      </LoveScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  primaryBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  blocked: { alignItems: "center", paddingVertical: 40, gap: 14 },
  blockedIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  blockedTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  blockedText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 420 },
});
