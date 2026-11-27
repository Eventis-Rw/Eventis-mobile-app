import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DateOfBirthPicker } from "@/components/love/DateOfBirthPicker";
import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { USE_FINDLOVE_API } from "@/services/findLoveService";
import { isAdult, MIN_LOVE_AGE } from "@/utils/findLoveProfile";
import {
  describeAgeVerification,
  ID_DOCUMENTS,
  missingSides,
  sideLabel,
  type IdDocumentType,
  type IdSide,
} from "@/utils/findLoveAgeVerification";

const SHOW_DEMO_CONTROLS = __DEV__ && !USE_FINDLOVE_API;
/** The backend can't read IDs yet, so with the real API the member types the date of birth from their ID. */
const ASK_DATE_OF_BIRTH = USE_FINDLOVE_API;

function dateOfBirthError(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    return "Use format YYYY-MM-DD, e.g. 1998-03-15.";
  }
  if (!isAdult(value)) {
    return `Must be ${MIN_LOVE_AGE} or older.`;
  }
  return undefined;
}

/**
 * ID age check, the first step of FindLove:
 * Compact, modern, non-confusing interface that fits cleanly on screen.
 */
export default function VerifyAgeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuth();
  const {
    myProfile,
    status,
    error: loadError,
    reload,
    verification,
    submitVerification,
    refreshVerification,
    resetDemoVerification,
  } = useMyLoveProfile();

  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [documentType, setDocumentType] = useState<IdDocumentType>("national_id");
  const [photos, setPhotos] = useState<Partial<Record<IdSide, string>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
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

  // FindLove's own terms live in the app (the website only has the general Eventis ones).
  const openPolicy = (doc: "terms" | "guidelines" | "privacy") => {
    router.push({ pathname: "/love/policies", params: { doc } } as any);
  };

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
          <SectionState
            kind="error"
            message={loadError ?? "We couldn't load your age check."}
            onRetry={() => void reload()}
          />
        ) : (
          <SectionState kind="loading" message="Loading…" />
        )}
      </LoveScreenShell>
    );
  }

  const send = async () => {
    if (missingSides(documentType, photos).length) {
      setError("Please add a photo of each required side.");
      return;
    }
    if (ASK_DATE_OF_BIRTH && dateOfBirthError(dateOfBirth)) {
      setError(dateOfBirthError(dateOfBirth) ?? null);
      return;
    }
    if (!confirmed) {
      setError(`Please confirm you are ${MIN_LOVE_AGE}+ and agree to the FindLove Terms, Community Guidelines and Privacy Notice.`);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await submitVerification({
        documentType,
        photos,
        confirmedAdult: true,
        ...(ASK_DATE_OF_BIRTH ? { dateOfBirth } : {}),
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          result.status === "verified"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
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
          <ActivityIndicator size="large" color="#FF2D55" />
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Checking your ID</Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            This takes a moment. Keep this screen open.
          </Text>
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
            : { name: "time-outline" as const, color: "#FF2D55" };
    return (
      <LoveScreenShell title="Verify your age" onBack={leave} stepLabel={stepLabel}>
        <View style={styles.status}>
          <View style={[styles.statusIcon, { backgroundColor: "rgba(255, 45, 85, 0.12)" }]}>
            <Ionicons name={icon.name} size={32} color={icon.color} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.foreground }]} accessibilityRole="header">
            {copy.title}
          </Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{copy.message}</Text>
          {error ? <InlineError message={error} /> : null}

          {verification.status === "verified" ? (
            <PrimaryButton
              label={myProfile ? "Continue to FindLove" : "Continue to profile setup"}
              onPress={continueAfterVerified}
            />
          ) : verification.status === "failed" ? (
            <PrimaryButton label="Try again" onPress={() => setCapturing(true)} />
          ) : verification.status === "processing" || verification.status === "manual_review" ? (
            <>
              <PrimaryButton
                label={checking ? "Checking…" : "Check again"}
                onPress={() => void checkAgain()}
                busy={checking}
              />
              <TextButton label="Back to Eventis" onPress={() => router.replace("/(tabs)" as any)} />
            </>
          ) : (
            <PrimaryButton label="Back to events" onPress={() => router.replace("/(tabs)" as any)} />
          )}

          {SHOW_DEMO_CONTROLS ? (
            <TextButton label="Demo: start the ID check again" onPress={() => void resetDemoVerification()} />
          ) : null}
        </View>
      </LoveScreenShell>
    );
  }

  const sides = ID_DOCUMENTS[documentType].sides;
  const ready = missingSides(documentType, photos).length === 0;

  return (
    <LoveScreenShell
      title="Verify your age"
      onBack={verification.status === "failed" ? () => setCapturing(false) : leave}
      stepLabel={stepLabel}
    >
      {/* Concise Header */}
      <View style={styles.headerBlock}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Confirm you're 18+</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Your ID is used solely to verify age and is strictly private.
        </Text>
      </View>

      {/* Warning banner if previous attempt failed */}
      {verification.status === "failed" && verification.reason ? (
        <View style={[styles.alertBanner, { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)" }]}>
          <Ionicons name="alert-circle" size={18} color="#F59E0B" />
          <Text style={[styles.alertText, { color: colors.foreground }]}>
            {verification.reason} ({verification.attemptsLeft} attempts left)
          </Text>
        </View>
      ) : null}

      {/* 1. Document Type Segmented Selector */}
      <View style={styles.sectionCompact}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DOCUMENT TYPE</Text>
        <View style={[styles.segmentedContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(Object.keys(ID_DOCUMENTS) as IdDocumentType[]).map((type) => {
            const isSelected = documentType === type;
            const doc = ID_DOCUMENTS[type];
            return (
              <Pressable
                key={type}
                onPress={() => {
                  setDocumentType(type);
                  setPhotos({});
                  setError(null);
                }}
                style={[
                  styles.segmentItem,
                  isSelected && styles.segmentItemActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Ionicons
                  name={type === "national_id" ? "card-outline" : "airplane-outline"}
                  size={16}
                  color={isSelected ? "#FFFFFF" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.segmentText,
                    { color: isSelected ? "#FFFFFF" : colors.mutedForeground },
                  ]}
                >
                  {doc.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Photo Upload Slots (Side-by-side for 2 sides, centered for 1) */}
      <View style={styles.sectionCompact}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {documentType === "national_id" ? "ID PHOTOS (FRONT & BACK)" : "PASSPORT PHOTO PAGE"}
        </Text>
        <View style={styles.photoRow}>
          {sides.map((side) => (
            <CompactPhotoSlot
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
      </View>

      {/* 3. Date of Birth Picker (Only when required) */}
      {ASK_DATE_OF_BIRTH ? (
        <View style={styles.sectionCompact}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DATE OF BIRTH</Text>
          <DateOfBirthPicker
            value={dateOfBirth}
            onChange={(selectedDate) => {
              setError(null);
              setDateOfBirth(selectedDate);
            }}
            error={dateOfBirth ? dateOfBirthError(dateOfBirth) : undefined}
          />
        </View>
      ) : null}

      {/* Terms & Privacy Confirmation Row */}
      <View
        style={[
          styles.confirmRow,
          {
            backgroundColor: colors.card,
            borderColor: confirmed ? "#FF2D55" : colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            setError(null);
            setConfirmed((c) => !c);
          }}
          hitSlop={8}
          style={styles.checkboxTouch}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          accessibilityLabel="I confirm I am 18 or older and agree to the FindLove Terms, Community Guidelines and Privacy Notice"
        >
          <Ionicons
            name={confirmed ? "checkbox" : "square-outline"}
            size={22}
            color={confirmed ? "#FF2D55" : colors.mutedForeground}
          />
        </Pressable>

        <Text style={[styles.confirmText, { color: colors.foreground }]}>
          I confirm I am {MIN_LOVE_AGE}+ and agree to the{" "}
          FindLove{" "}
          <Text style={styles.termsLink} onPress={() => openPolicy("terms")} accessibilityRole="link">
            Terms
          </Text>
          ,{" "}
          <Text style={styles.termsLink} onPress={() => openPolicy("guidelines")} accessibilityRole="link">
            Community Guidelines
          </Text>
          {" "}and{" "}
          <Text style={styles.termsLink} onPress={() => openPolicy("privacy")} accessibilityRole="link">
            Privacy Notice
          </Text>
          .
        </Text>
      </View>

      {error ? <InlineError message={error} /> : null}

      {/* Primary Action Button */}
      <PrimaryButton
        label={from === "create" ? "Continue to Profile Setup" : "Verify & Continue"}
        onPress={() => void send()}
        disabled={
          !ready ||
          !confirmed ||
          (ASK_DATE_OF_BIRTH && (!dateOfBirth || !!dateOfBirthError(dateOfBirth)))
        }
      />
    </LoveScreenShell>
  );
}

/** Compact Photo Upload Card */
function CompactPhotoSlot({
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

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onError("Please allow camera access to take a photo of your ID.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("Couldn't open camera. Try gallery instead.");
    }
  };

  const pickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("Couldn't open photos. Check permissions and try again.");
    }
  };

  const handleCardPress = () => {
    if (Platform.OS === "web") {
      void pickGallery();
      return;
    }
    Alert.alert(label, "Select photo source:", [
      { text: "Take Photo", onPress: () => void takePhoto() },
      { text: "Choose from Gallery", onPress: () => void pickGallery() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View
      style={[
        styles.slotCard,
        {
          backgroundColor: colors.card,
          borderColor: uri ? "#10B981" : colors.border,
        },
      ]}
    >
      {/* Slot Header */}
      <View style={styles.slotTopRow}>
        <Text style={[styles.slotTitle, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
        {uri ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.verifiedText}>Added</Text>
          </View>
        ) : null}
      </View>

      {/* Card Body / Preview */}
      <Pressable
        onPress={handleCardPress}
        style={styles.previewBox}
        accessibilityRole="button"
        accessibilityLabel={`Upload ${label}`}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.slotImage} resizeMode="cover" />
        ) : (
          <View style={[styles.emptyPreview, { backgroundColor: colors.secondary }]}>
            <Ionicons name="camera" size={24} color={colors.mutedForeground} />
            <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Tap to add</Text>
          </View>
        )}
      </Pressable>

      {/* Quick Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void takePhoto()}
          style={({ pressed }) => [
            styles.miniBtn,
            { backgroundColor: "#FF2D55", opacity: pressed ? 0.85 : 1 },
          ]}
          hitSlop={4}
        >
          <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
          <Text style={styles.miniBtnText}>{uri ? "Retake" : "Camera"}</Text>
        </Pressable>

        <Pressable
          onPress={() => void pickGallery()}
          style={({ pressed }) => [
            styles.miniBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1 },
          ]}
          hitSlop={4}
        >
          <Ionicons name="images-outline" size={13} color={colors.foreground} />
          <Text style={[styles.miniBtnText, { color: colors.foreground }]}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: disabled ? colors.disabled : "#FF2D55",
          opacity: busy || pressed ? 0.88 : 1,
        },
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
  headerBlock: {
    gap: 4,
  },
  heading: {
    fontSize: 22,
    letterSpacing: -0.5,
    fontFamily: "Inter_700Bold",
  },
  subheading: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
  },
  sectionCompact: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: "#FF2D55",
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
  },
  slotCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    gap: 8,
  },
  slotTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slotTitle: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    color: "#10B981",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  previewBox: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 9,
    overflow: "hidden",
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tapHint: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
  },
  miniBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 7,
  },
  miniBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  checkboxTouch: {
    padding: 2,
  },
  confirmText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  termsLink: {
    color: "#FF2D55",
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  primary: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontFamily: "Inter_700Bold",
  },
  textBtn: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  status: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 14,
  },
  statusIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statusText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 380,
  },
});
