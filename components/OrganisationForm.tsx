import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import type { Organisation, OrganisationInput } from "@/services/organiserService";

export interface OrganisationFormValues {
  name: string;
  description: string;
  activities: string;
  location: string;
  website: string;
}

export type OrganisationFormErrors = Partial<Record<keyof OrganisationFormValues, string>>;

const LIMITS = { name: 80, description: 1000, activities: 300, location: 120 };

export function organisationFormValues(org?: Partial<Organisation>): OrganisationFormValues {
  return {
    name: org?.name ?? "",
    description: org?.description ?? "",
    activities: org?.activities ?? "",
    location: org?.location ?? "",
    website: org?.website ?? "",
  };
}

/** Organisation name/description limits mirror organizerApplication in @eventis/contracts. */
export function validateOrganisation(v: OrganisationFormValues): OrganisationFormErrors {
  const errors: OrganisationFormErrors = {};
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

export function toOrganisationInput(v: OrganisationFormValues, logoUri?: string): OrganisationInput {
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    activities: v.activities.trim(),
    location: v.location.trim(),
    website: normaliseWebsite(v.website),
    logoUri,
  };
}

/** Logo + organisation details, shared by onboarding setup and the portal's edit screen. */
export function OrganisationFields({
  values,
  onChange,
  onBlur,
  errorFor,
  logoUri,
  onLogoChange,
}: {
  values: OrganisationFormValues;
  onChange: (key: keyof OrganisationFormValues, text: string) => void;
  onBlur: (key: keyof OrganisationFormValues) => void;
  /** Error to show for a field right now (callers decide when errors become visible). */
  errorFor: (key: keyof OrganisationFormValues) => string | undefined;
  logoUri?: string;
  onLogoChange: (uri: string | undefined) => void;
}) {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const [logoError, setLogoError] = useState<string | undefined>();

  const pickLogo = async () => {
    setLogoError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // Android's crop screen hides its confirm button under the status bar (edge-to-edge).
        allowsEditing: Platform.OS === "ios",
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) onLogoChange(result.assets[0].uri);
    } catch {
      setLogoError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const field = (key: keyof OrganisationFormValues) => ({
    value: values[key],
    onChangeText: (text: string) => onChange(key, text),
    onBlur: () => onBlur(key),
    error: errorFor(key),
  });

  return (
    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={styles.logoRow}>
        <Pressable
          onPress={pickLogo}
          style={[styles.logo, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}
          accessibilityRole="button"
          accessibilityLabel={logoUri ? "Change organisation logo" : "Add organisation logo"}
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImg} />
          ) : (
            <Ionicons name="camera-outline" size={26} color={palette.muted} />
          )}
        </Pressable>
        <View style={styles.logoCopy}>
          <Text style={[styles.label, { color: palette.text }]}>
            Brand image <Text style={{ color: palette.muted }}>(optional)</Text>
          </Text>
          <Text style={[styles.hint, { color: palette.muted }]}>Shown on events, posts and your public profile.</Text>
          <View style={styles.logoActions}>
            <Pressable onPress={pickLogo} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.link, { color: palette.accent }]}>{logoUri ? "Change" : "Choose image"}</Text>
            </Pressable>
            {logoUri && (
              <Pressable onPress={() => onLogoChange(undefined)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Remove organisation image">
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
        {...field("name")}
        placeholder="e.g. Kigali Jazz Collective"
        maxLength={LIMITS.name}
      />
      <FormField
        label="Description"
        required
        {...field("description")}
        placeholder="Who you are and the kind of events you host"
        multiline
        maxLength={LIMITS.description}
        showCount
      />
      <FormField
        label="What your organisation does"
        required
        icon="sparkles-outline"
        {...field("activities")}
        placeholder="e.g. Live music nights, workshops, festivals"
        maxLength={LIMITS.activities}
      />
      <FormField
        label="Location"
        required
        icon="location-outline"
        {...field("location")}
        placeholder="e.g. Kigali, Rwanda"
        maxLength={LIMITS.location}
      />
      <FormField
        label="Website"
        icon="globe-outline"
        {...field("website")}
        placeholder="https://yourorganisation.com"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export function FormField({
  label,
  required,
  icon,
  error,
  multiline,
  showCount,
  value,
  maxLength,
  onFocus,
  onBlur,
  ...input
}: {
  label: string;
  required?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  error?: string;
  showCount?: boolean;
} & TextInputProps) {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text }]}>
        {label}
        {required && <Text style={{ color: palette.accent }}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMulti,
          {
            backgroundColor: focused ? palette.surface : palette.surfaceRaised,
            borderColor: error ? palette.danger : focused ? palette.blue : palette.line,
          },
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={focused ? palette.blue : palette.muted} />}
        <TextInput
          {...input}
          value={value}
          maxLength={maxLength}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={palette.muted}
          style={[styles.input, multiline && styles.inputMulti, { color: palette.text }]}
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
          <Text style={[styles.hint, { color: palette.muted }]}>
            {(value ?? "").length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 20,
  },
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
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputWrapMulti: { alignItems: "flex-start" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 13 },
  inputMulti: { minHeight: 120 },
  fieldFooter: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
});
