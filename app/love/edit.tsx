import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { LoveProfileForm, Section, type LoveProfileFormErrors, type LoveProfileFormValues } from "@/components/love/LoveProfileForm";
import {
  LoveProfileExtras,
  type LoveProfileExtrasErrors,
  type LoveProfileExtrasValues,
} from "@/components/love/LoveProfileExtras";
import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { LoveProfileInputError } from "@/services/findLoveService";
import {
  ageOn,
  formatDateOfBirth,
  neighborhoodsFor,
  validateLoveCountry,
  validateLoveGender,
  validateLoveUsername,
} from "@/utils/findLoveProfile";

type EditValues = LoveProfileFormValues & LoveProfileExtrasValues;

/** Edit the member's own FindLove profile. Date of birth is fixed after creation. */
export default function EditLoveProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { myProfile, status, error, reload, save, accountType } = useMyLoveProfile();
  const allowLeave = useRef(false);

  const initial = useMemo<EditValues | null>(
    () =>
      myProfile
        ? {
            username: myProfile.username,
            gender: myProfile.gender,
            country: myProfile.country,
            photoUrls: myProfile.photoUrls,
            bio: myProfile.bio ?? "",
            interests: myProfile.interests,
            neighborhood: myProfile.neighborhood,
          }
        : null,
    [myProfile],
  );
  const [values, setValues] = useState<EditValues | null>(initial);
  const [extrasErrors, setExtrasErrors] = useState<LoveProfileExtrasErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<LoveProfileFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  // The profile may finish loading after the first render (deep link or reload).
  useEffect(() => {
    if (initial && !values) setValues(initial);
  }, [initial, values]);

  const isDirty = !!values && JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (allowLeave.current || !isDirty || saving) return;
      event.preventDefault();
      setPendingLeave(() => () => navigation.dispatch(event.data.action));
    });
  }, [navigation, isDirty, saving]);

  const errors = useMemo<LoveProfileFormErrors>(() => {
    if (!values) return {};
    const shown = (key: keyof LoveProfileFormErrors) => submitAttempted || touched[key];
    return {
      username: serverErrors.username ?? (shown("username") ? validateLoveUsername(values.username) : undefined),
      gender: shown("gender") ? validateLoveGender(values.gender) : undefined,
      // Profiles made before country was asked show this straight away.
      country: serverErrors.country ?? validateLoveCountry(values.country),
      photoUrls: serverErrors.photoUrls,
    };
  }, [values, touched, submitAttempted, serverErrors]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/love" as any));

  if (!user || status === "error" || !myProfile || !values) {
    return (
      <LoveScreenShell title="My FindLove profile" onBack={back}>
        {!user ? (
          <SectionState
            kind="empty"
            icon="person-outline"
            title="Sign in to use FindLove"
            message="Your FindLove profile is linked to your Eventis account."
            actionLabel="Sign in"
            onAction={() => router.replace("/auth/login" as any)}
          />
        ) : status === "error" ? (
          <SectionState kind="error" message={error ?? "We couldn't load your profile."} onRetry={() => void reload()} />
        ) : status === "ready" && !myProfile ? (
          <SectionState
            kind="empty"
            icon="heart-outline"
            title="No FindLove profile yet"
            message="Create one to start meeting people."
            actionLabel="Create profile"
            onAction={() => router.replace("/love/create" as any)}
          />
        ) : (
          <SectionState kind="loading" message="Loading your profile…" />
        )}
      </LoveScreenShell>
    );
  }

  const submit = async () => {
    setSubmitAttempted(true);
    setSaveError(null);
    if (
      validateLoveUsername(values.username) ||
      validateLoveGender(values.gender) ||
      validateLoveCountry(values.country) ||
      !values.gender ||
      !values.country
    ) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!isDirty) {
      back();
      return;
    }
    setSaving(true);
    try {
      await save({
        username: values.username,
        gender: values.gender,
        country: values.country,
        dateOfBirth: myProfile.dateOfBirth,
        photoUrls: values.photoUrls,
        bio: values.bio,
        interests: values.interests,
        neighborhood: values.neighborhood,
      });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      allowLeave.current = true;
      back();
    } catch (err) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof LoveProfileInputError && (err.field === "username" || err.field === "country" || err.field === "photoUrls")) {
        setServerErrors({ [err.field]: err.message });
      } else if (err instanceof LoveProfileInputError && (err.field === "bio" || err.field === "interests" || err.field === "neighborhood")) {
        setExtrasErrors({ [err.field]: err.message });
      } else {
        setSaveError(describeError(err, "We couldn't save your changes. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  };

  const age = ageOn(myProfile.dateOfBirth);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LoveScreenShell title="My FindLove profile" onBack={back}>
        {saveError ? <InlineError message={saveError} /> : null}

        <LoveProfileForm
          values={values}
          errors={errors}
          onChange={(next) => {
            setSaveError(null);
            setServerErrors({});
            setValues((v) => {
              if (!v) return v;
              const merged = { ...v, ...next };
              // Neighbourhoods belong to a country; drop one that doesn't exist in the new one.
              const keepArea = neighborhoodsFor(merged.country).some((n) => n.name === merged.neighborhood);
              return keepArea ? merged : { ...merged, neighborhood: undefined };
            });
          }}
          onBlur={(field) => setTouched((t) => ({ ...t, [field]: true }))}
          phone={user.phone}
          disabled={saving}
        />

        <LoveProfileExtras
          values={values}
          country={values.country}
          errors={extrasErrors}
          onChange={(next) => {
            setSaveError(null);
            setExtrasErrors({});
            setValues((v) => v && { ...v, ...next });
          }}
          disabled={saving}
        />

        <MembershipSection
          isPrivate={accountType === "private"}
          awaitingPayment={myProfile.membership.type === "private" && myProfile.membership.status === "pending_payment"}
          expiresAt={myProfile.membership.expiresAt}
          onUpgrade={() => router.push({ pathname: "/love/membership", params: { from: "upgrade" } } as any)}
        />

        <Section title="Age" hint="Other members see your age, not your date of birth. Contact support if it is wrong.">
          <View style={[styles.readOnly, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>
              {age !== null ? `${age} · ` : ""}born {formatDateOfBirth(myProfile.dateOfBirth)}
            </Text>
            <Ionicons name="lock-closed-outline" size={14} color={colors.mutedForeground} />
          </View>
        </Section>

        <Pressable
          onPress={() => void submit()}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityState={{ busy: saving }}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save changes</Text>}
        </Pressable>
      </LoveScreenShell>

      <ChatConfirmDialog
        visible={!!pendingLeave}
        title="Discard changes?"
        description="You have unsaved changes to your FindLove profile."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          const leave = pendingLeave;
          setPendingLeave(null);
          allowLeave.current = true;
          leave?.();
        }}
        onClose={() => setPendingLeave(null)}
      />
    </KeyboardAvoidingView>
  );
}

/** The member's actual account type, with the way to upgrade when they are Public. */
function MembershipSection({
  isPrivate,
  awaitingPayment,
  expiresAt,
  onUpgrade,
}: {
  isPrivate: boolean;
  awaitingPayment: boolean;
  expiresAt?: string;
  onUpgrade: () => void;
}) {
  const colors = useColors();
  const message = isPrivate
    ? `Paid membership with enhanced connection privileges.${expiresAt ? ` Runs until ${formatDateOfBirth(expiresAt.slice(0, 10))}.` : ""}`
    : awaitingPayment
      ? "You chose Private, but the payment hasn't been confirmed, so your account is Public for now."
      : "Basic account. You can connect with Public members; connecting with Private members needs Private.";
  return (
    <Section title="Account type">
      <View style={[styles.membership, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MembershipBadge type={isPrivate ? "private" : "public"} />
        <Text style={[styles.membershipText, { color: colors.mutedForeground }]}>{message}</Text>
        {!isPrivate ? (
          <Pressable onPress={onUpgrade} style={[styles.upgradeBtn, { borderColor: colors.primary }]} accessibilityRole="button">
            <Ionicons name="diamond-outline" size={16} color={colors.primary} />
            <Text style={[styles.upgradeText, { color: colors.primary }]}>
              {awaitingPayment ? "Complete payment" : "Upgrade to Private"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  membership: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  membershipText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  upgradeBtn: { minHeight: 44, borderRadius: 12, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  upgradeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  readOnly: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, minHeight: 46 },
  readOnlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
