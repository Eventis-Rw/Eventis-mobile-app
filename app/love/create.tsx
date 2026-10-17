import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { LoveProfileForm, Section, type LoveProfileFormErrors, type LoveProfileFormValues } from "@/components/love/LoveProfileForm";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { LoveProfileInputError } from "@/services/findLoveService";
import {
  isAdult,
  MIN_LOVE_AGE,
  parseDateOfBirth,
  validateLoveGender,
  validateLoveUsername,
} from "@/utils/findLoveProfile";

type Step = "age" | "underage" | "profile";

/** Create a FindLove profile: 18+ check first, then the profile itself. */
export default function CreateLoveProfileScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { myProfile, status, save } = useMyLoveProfile();

  const [step, setStep] = useState<Step>("age");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");

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

  const checkAge = () => {
    const parsed = parseDateOfBirth(dob.day, dob.month, dob.year);
    if ("error" in parsed) {
      setAgeError(parsed.error);
      return;
    }
    if (!isAdult(parsed.value)) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setStep("underage");
      return;
    }
    if (!confirmed) {
      setAgeError(`Tick the box to confirm you are ${MIN_LOVE_AGE} or older.`);
      return;
    }
    setAgeError(null);
    setDateOfBirth(parsed.value);
    setStep("profile");
  };

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
        if (err.field === "dateOfBirth" || err.field === "confirmedAdult") {
          setStep("age");
          setAgeError(err.message);
        } else if (err.field === "username" || err.field === "photoUrls") {
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

  if (step === "underage") {
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

  if (step === "age") {
    const setPart = (key: keyof typeof dob, text: string) => {
      setAgeError(null);
      setDob((d) => ({ ...d, [key]: text.replace(/\D/g, "") }));
    };
    return (
      <LoveScreenShell title="Create profile" onBack={back} stepLabel="Step 1 of 2">
        <Text style={[styles.lead, { color: colors.foreground }]}>First, confirm your age</Text>
        <Text style={[styles.leadText, { color: colors.mutedForeground }]}>
          FindLove is only for people aged {MIN_LOVE_AGE} and over. Your date of birth is used to show your age; it is
          not shown in full to other members.
        </Text>

        <Section title="Date of birth">
          <View style={styles.dobRow}>
            <DobInput label="Day" placeholder="DD" maxLength={2} value={dob.day} onChangeText={(t) => setPart("day", t)} />
            <DobInput label="Month" placeholder="MM" maxLength={2} value={dob.month} onChangeText={(t) => setPart("month", t)} />
            <DobInput label="Year" placeholder="YYYY" maxLength={4} value={dob.year} onChangeText={(t) => setPart("year", t)} wide />
          </View>
        </Section>

        <Pressable
          onPress={() => {
            setAgeError(null);
            setConfirmed((c) => !c);
          }}
          style={[styles.confirmRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
        >
          <Ionicons name={confirmed ? "checkbox" : "square-outline"} size={24} color={confirmed ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.confirmText, { color: colors.foreground }]}>
            I confirm I am {MIN_LOVE_AGE} or older and the date above is my real date of birth.
          </Text>
        </Pressable>

        {ageError ? <InlineError message={ageError} /> : null}

        <Pressable
          onPress={checkAge}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
      </LoveScreenShell>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LoveScreenShell title="Create profile" onBack={() => setStep("age")} stepLabel="Step 2 of 2">
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

function DobInput({
  label,
  wide,
  ...props
}: { label: string; wide?: boolean } & React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return (
    <View style={[styles.dobCell, wide && styles.dobWide]}>
      <Text style={[styles.dobLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        {...props}
        keyboardType="number-pad"
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={`Birth ${label.toLowerCase()}`}
        style={[styles.dobInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lead: { fontSize: 24, letterSpacing: -0.6, fontFamily: "Inter_700Bold" },
  leadText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: -8 },
  dobRow: { flexDirection: "row", gap: 10 },
  dobCell: { flex: 1, gap: 6 },
  dobWide: { flex: 1.6 },
  dobLabel: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 4 },
  dobInput: { minHeight: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  confirmText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium" },
  primaryBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  blocked: { alignItems: "center", paddingVertical: 40, gap: 14 },
  blockedIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  blockedTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  blockedText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 420 },
});
