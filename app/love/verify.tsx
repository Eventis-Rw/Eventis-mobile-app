import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { Section } from "@/components/love/LoveProfileForm";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { USE_FINDLOVE_API } from "@/services/findLoveService";
import { MIN_LOVE_AGE } from "@/utils/findLoveProfile";
import {
  describeAgeVerification,
  ID_DOCUMENTS,
  missingSides,
  sideLabel,
  type IdDocumentType,
  type IdSide,
} from "@/utils/findLoveAgeVerification";

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_FINDLOVE_API;

const TIPS = [
  "The whole document is inside the photo",
  "Text is sharp and easy to read",
  "No glare, shadows or fingers over the details",
];

/**
 * ID age check, the first step of FindLove: photos of the member's ID go to
 * the server, which reads the date of birth and decides. No profile can be
 * created until the result is "verified"; the profile then uses the date of
 * birth from the ID. Opened from profile creation (from=create) or the
 * FindLove gate.
 */
export default function VerifyAgeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuth();
  const { myProfile, status, error: loadError, reload, verification, submitVerification, refreshVerification, resetDemoVerification } =
    useMyLoveProfile();

  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [documentType, setDocumentType] = useState<IdDocumentType>("national_id");
  const [photos, setPhotos] = useState<Partial<Record<IdSide, string>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving while the photos upload would hide the result, so the back button waits.
  useEffect(() => {
    if (!sending) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [sending]);

  const leave = () => {
    if (from === "create" || !router.canGoBack()) router.replace("/love" as any);
    else router.back();
  };

  // Verified: on to the profile, unless the member already has one.
  const continueAfterVerified = () => {
    if (!myProfile) router.replace("/love/create" as any);
    else leave();
  };

  const stepLabel = from === "create" ? "Step 1 of 2" : undefined;

  if (!user) {
    return (
      <LoveScreenShell title="Verify your age" onBack={leave}>
        <SectionState
          kind="empty"
          icon="person-outline"
          title="Sign in to use FindLove"
          message="The age check is linked to your Eventis account."
          actionLabel="Sign in"
          onAction={() => router.replace("/auth/login" as any)}
        />
      </LoveScreenShell>
    );
  }

  if (status !== "ready") {
    return (
      <LoveScreenShell title="Verify your age" onBack={leave}>
        {status === "error" ? (
          <SectionState kind="error" message={loadError ?? "We couldn't load your age check."} onRetry={() => void reload()} />
        ) : (
          <SectionState kind="loading" message="Loading…" />
        )}
      </LoveScreenShell>
    );
  }

  const send = async () => {
    if (missingSides(documentType, photos).length) {
      setError("Add a photo of every side of your ID first.");
      return;
    }
    if (!confirmed) {
      setError(`Tick the box to confirm you are ${MIN_LOVE_AGE} or older and this is your own ID.`);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await submitVerification({ documentType, photos, confirmedAdult: true });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          result.status === "verified" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
        );
      }
      setPhotos({});
      setCapturing(false);
    } catch (err) {
      setError(describeError(err, "We couldn't send your ID. Check your connection and try again."));
    } finally {
      setSending(false);
    }
  };

  const checkAgain = async () => {
    setChecking(true);
    try {
      await refreshVerification();
    } catch (err) {
      setError(describeError(err, "We couldn't check your status. Please try again."));
    } finally {
      setChecking(false);
    }
  };

  if (sending) {
    return (
      <LoveScreenShell title="Verify your age" onBack={() => undefined} stepLabel={stepLabel}>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <View style={styles.status}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Checking your ID</Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>This takes a moment. Keep this screen open.</Text>
        </View>
      </LoveScreenShell>
    );
  }

  const showForm = capturing || verification.status === "not_started";

  if (!showForm) {
    const copy = describeAgeVerification(verification);
    const icon =
      verification.status === "verified"
        ? { name: "shield-checkmark" as const, color: colors.success }
        : verification.status === "rejected"
          ? { name: "hand-left-outline" as const, color: colors.destructive }
          : verification.status === "failed"
            ? { name: "alert-circle-outline" as const, color: colors.warning }
            : { name: "time-outline" as const, color: colors.primary };
    return (
      <LoveScreenShell title="Verify your age" onBack={leave} stepLabel={stepLabel}>
        <View style={styles.status}>
          <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name={icon.name} size={32} color={icon.color} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.foreground }]} accessibilityRole="header">{copy.title}</Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{copy.message}</Text>
          {error ? <InlineError message={error} /> : null}

          {verification.status === "verified" ? (
            <PrimaryButton label={myProfile ? "Continue to FindLove" : "Continue to your profile"} onPress={continueAfterVerified} />
          ) : verification.status === "failed" ? (
            <PrimaryButton label="Try again" onPress={() => setCapturing(true)} />
          ) : verification.status === "processing" || verification.status === "manual_review" ? (
            <>
              <PrimaryButton label={checking ? "Checking…" : "Check again"} onPress={() => void checkAgain()} busy={checking} />
              <TextButton label="Back to Eventis" onPress={() => router.replace("/(tabs)" as any)} />
            </>
          ) : (
            <PrimaryButton label="Back to events" onPress={() => router.replace("/(tabs)" as any)} />
          )}

          {SHOW_DEMO_CONTROLS ? <TextButton label="Demo: start the ID check again" onPress={() => void resetDemoVerification()} /> : null}
        </View>
      </LoveScreenShell>
    );
  }

  const sides = ID_DOCUMENTS[documentType].sides;
  const ready = missingSides(documentType, photos).length === 0;

  return (
    <LoveScreenShell title="Verify your age" onBack={verification.status === "failed" ? () => setCapturing(false) : leave} stepLabel={stepLabel}>
      <Text style={[styles.lead, { color: colors.foreground }]}>Confirm you're {MIN_LOVE_AGE}+ with your ID</Text>
      <Text style={[styles.leadText, { color: colors.mutedForeground }]}>
        FindLove is for adults only. We read your date of birth from your ID, so there's nothing to type.
      </Text>

      <View style={[styles.privacy, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.success} />
        <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
          Your ID is only used to check your age. Your ID, date of birth and age are never shown to other members.
        </Text>
      </View>

      {verification.status === "failed" && verification.reason ? (
        <View style={[styles.privacy, { backgroundColor: colors.secondary, borderColor: colors.warning }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          <Text style={[styles.privacyText, { color: colors.foreground }]}>
            {verification.reason} {verification.attemptsLeft} {verification.attemptsLeft === 1 ? "attempt" : "attempts"} left.
          </Text>
        </View>
      ) : null}

      <Section title="Document">
        <View style={styles.documents} accessibilityRole="radiogroup">
          {(Object.keys(ID_DOCUMENTS) as IdDocumentType[]).map((type) => {
            const selected = documentType === type;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  setDocumentType(type);
                  setPhotos({});
                  setError(null);
                }}
                style={[styles.document, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                <View style={styles.documentCopy}>
                  <Text style={[styles.documentLabel, { color: colors.foreground }]}>{ID_DOCUMENTS[type].label}</Text>
                  <Text style={[styles.documentText, { color: colors.mutedForeground }]}>{ID_DOCUMENTS[type].description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Photos">
        <View style={styles.slots}>
          {sides.map((side) => (
            <PhotoSlot
              key={`${documentType}-${side}`}
              label={sideLabel(documentType, side)}
              uri={photos[side]}
              onPicked={(uri) => {
                setError(null);
                setPhotos((p) => ({ ...p, [side]: uri }));
              }}
              onError={setError}
            />
          ))}
        </View>
        <View style={styles.tips}>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tip}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Pressable
        onPress={() => {
          setError(null);
          setConfirmed((c) => !c);
        }}
        style={[styles.confirmRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
      >
        <Ionicons name={confirmed ? "checkbox" : "square-outline"} size={24} color={confirmed ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.confirmText, { color: colors.foreground }]}>
          I confirm I am {MIN_LOVE_AGE} or older and this is my own ID.
        </Text>
      </Pressable>

      {error ? <InlineError message={error} /> : null}
      <PrimaryButton label="Send for checking" onPress={() => void send()} disabled={!ready || !confirmed} />
    </LoveScreenShell>
  );
}

function PhotoSlot({
  label,
  uri,
  onPicked,
  onError,
}: {
  label: string;
  uri?: string;
  onPicked: (uri: string) => void;
  onError: (message: string) => void;
}) {
  const colors = useColors();

  const take = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onError("Allow camera access to take a photo of your ID, or choose one from your photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("We couldn't open the camera. Try choosing a photo instead.");
    }
  };

  const choose = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  return (
    <View style={[styles.slot, { backgroundColor: colors.card, borderColor: uri ? colors.success : colors.border }]}>
      <View style={styles.slotHeader}>
        <Text style={[styles.slotLabel, { color: colors.foreground }]}>{label}</Text>
        {uri ? <Ionicons name="checkmark-circle" size={16} color={colors.success} /> : null}
      </View>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" accessibilityLabel={`${label} photo`} />
      ) : (
        <View style={[styles.preview, styles.placeholder, { backgroundColor: colors.secondary }]}>
          <Ionicons name="card-outline" size={24} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.slotActions}>
        <Pressable
          onPress={() => void take()}
          style={[styles.slotButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`${uri ? "Retake" : "Take"} photo: ${label}`}
        >
          <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
          <Text style={styles.slotButtonText}>{uri ? "Retake" : "Camera"}</Text>
        </Pressable>
        <Pressable
          onPress={() => void choose()}
          style={[styles.slotButton, { backgroundColor: colors.secondary }]}
          accessibilityRole="button"
          accessibilityLabel={`Choose from photos: ${label}`}
        >
          <Ionicons name="images-outline" size={15} color={colors.foreground} />
          <Text style={[styles.slotButtonText, { color: colors.foreground }]}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const colors = useColors();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: disabled ? colors.disabled : colors.primary, opacity: busy || pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.textBtn} accessibilityRole="button">
      <Text style={[styles.textBtnText, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 24, letterSpacing: -0.6, fontFamily: "Inter_700Bold" },
  leadText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: -8 },
  privacy: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 12 },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  documents: { gap: 10 },
  document: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 12 },
  documentCopy: { flex: 1, gap: 2 },
  documentLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  documentText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  // Side by side, each half the width, so front and back fit on one row.
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slot: { flexBasis: "47%", flexGrow: 0, flexShrink: 1, maxWidth: 260, borderRadius: 14, borderWidth: 1.5, padding: 8, gap: 7 },
  slotHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  slotLabel: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  preview: { width: "100%", aspectRatio: 1.586, borderRadius: 9 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  slotActions: { flexDirection: "row", gap: 6 },
  slotButton: { flex: 1, minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 9 },
  slotButtonText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tips: { gap: 6, marginTop: 10 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  confirmText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium" },
  tip: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  primary: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  textBtn: { minHeight: 44, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  textBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  status: { alignItems: "center", paddingVertical: 32, gap: 14 },
  statusIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 420 },
});
