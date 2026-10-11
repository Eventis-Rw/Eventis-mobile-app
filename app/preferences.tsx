import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { FormField } from "@/components/OrganisationForm";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useDiscoveryPreferences } from "@/hooks/useDiscoveryPreferences";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import { PROFILE_LIMITS, validateMaxLength } from "@/utils/profileValidation";

/** Preferred event categories and location, used for recommendations and category alerts. */
export default function DiscoveryPreferencesScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { categories: allCategories } = useEvents();
  const discovery = useDiscoveryPreferences();
  const locationPermission = useLocationPermission();

  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [initialised, setInitialised] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const allowLeave = useRef(false);

  // Seed the form once the saved preferences arrive.
  useEffect(() => {
    if (initialised || !discovery.preferences) return;
    setCategories(discovery.preferences.categories);
    setLocation(discovery.preferences.location ?? "");
    setInitialised(true);
  }, [discovery.preferences, initialised]);

  const options = useMemo(() => allCategories.filter((c) => c !== "All"), [allCategories]);
  const saved = discovery.preferences;
  const isDirty =
    initialised &&
    !!saved &&
    (location.trim() !== (saved.location ?? "") ||
      [...categories].sort().join("|") !== [...saved.categories].sort().join("|"));
  const locationError = validateMaxLength(location, PROFILE_LIMITS.location);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (allowLeave.current || !isDirty || saving) return;
      event.preventDefault();
      setPendingLeave(() => () => navigation.dispatch(event.data.action));
    });
  }, [navigation, isDirty, saving]);

  const toggle = (category: string) => {
    setError(null);
    setCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  };

  const detectLocation = async () => {
    setLocateError(null);
    setLocating(true);
    try {
      const granted = locationPermission.status === "granted" || (await locationPermission.request());
      if (!granted) {
        setLocateError("Location access is off. Type your city instead, or allow location in your phone's settings.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      const label = [place?.city ?? place?.subregion ?? place?.region, place?.country].filter(Boolean).join(", ");
      if (!label) throw new Error("no place");
      setLocation(label);
      setError(null);
    } catch {
      setLocateError("We couldn't detect where you are. Type your city instead.");
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (locationError) return;
    setSaving(true);
    setError(null);
    try {
      await discovery.save({ categories, location });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      allowLeave.current = true;
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  let body: React.ReactNode;
  if (!discovery.enabled) {
    body = (
      <SectionState
        kind="empty"
        icon="person-outline"
        title="Sign in to set preferences"
        message="Your preferences are saved to your account."
        actionLabel="Sign in"
        onAction={() => router.replace("/auth/login" as any)}
      />
    );
  } else if (discovery.isLoading || (!initialised && !discovery.error)) {
    body = <SectionState kind="loading" message="Loading your preferences…" />;
  } else if (discovery.error && !initialised) {
    body = <SectionState kind="error" message={discovery.error} onRetry={() => void discovery.reload()} />;
  } else {
    body = (
      <>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.foreground }]}>Categories you like</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            We'll recommend these first and, if you turn it on, tell you when new ones are published.
          </Text>
          <View style={styles.chips}>
            {options.map((category) => {
              const selected = categories.includes(category);
              return (
                <Pressable
                  key={category}
                  onPress={() => toggle(category)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.secondary,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{category}</Text>
                </Pressable>
              );
            })}
          </View>
          {categories.length ? (
            <Pressable onPress={() => setCategories([])} disabled={saving} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.foreground }]}>Preferred location</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Where you usually go out. Used for "Events near you" when location access is off.
          </Text>
          <FormField
            label="City or area"
            icon="location-outline"
            placeholder="e.g. Kigali, Rwanda"
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setError(null);
            }}
            maxLength={PROFILE_LIMITS.location}
            error={locationError}
            editable={!saving}
          />
          {Platform.OS !== "web" ? (
            <Pressable
              onPress={detectLocation}
              disabled={locating || saving}
              style={({ pressed }) => [styles.locateBtn, { borderColor: colors.border, opacity: pressed || locating ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityState={{ busy: locating }}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              )}
              <Text style={[styles.locateText, { color: colors.primary }]}>Use my current location</Text>
            </Pressable>
          ) : null}
          {locateError ? <InlineError message={locateError} /> : null}
        </View>

        {error ? <InlineError message={error} /> : null}

        <Pressable
          onPress={save}
          disabled={saving || !!locationError}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: saving || pressed || locationError ? 0.75 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: !!locationError }}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save preferences</Text>}
        </Pressable>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileSubHeader title="Discovery preferences" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {body}
      </ScrollView>
      <ChatConfirmDialog
        visible={!!pendingLeave}
        title="Discard changes?"
        description="Your preference changes haven't been saved."
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 26 },
  section: { gap: 10 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  locateText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
