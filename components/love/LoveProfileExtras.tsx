import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Section } from "@/components/love/LoveProfileForm";
import { FormField } from "@/components/OrganisationForm";
import { InlineError } from "@/components/profile/ProfileSection";
import { useColors } from "@/hooks/useColors";
import {
  LOVE_BIO_MAX,
  LOVE_INTERESTS,
  LOVE_INTERESTS_MAX,
  LOVE_NEIGHBORHOODS,
} from "@/utils/findLoveProfile";

export interface LoveProfileExtrasValues {
  bio: string;
  interests: string[];
  neighborhood?: string;
}

export type LoveProfileExtrasErrors = Partial<Record<keyof LoveProfileExtrasValues, string>>;

/** Optional profile details, edited after the profile is created. */
export function LoveProfileExtras({
  values,
  errors,
  onChange,
  disabled,
}: {
  values: LoveProfileExtrasValues;
  errors: LoveProfileExtrasErrors;
  onChange: (next: LoveProfileExtrasValues) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const atLimit = values.interests.length >= LOVE_INTERESTS_MAX;

  const toggleInterest = (interest: string) => {
    const has = values.interests.includes(interest);
    if (!has && atLimit) return;
    onChange({
      ...values,
      interests: has ? values.interests.filter((i) => i !== interest) : [...values.interests, interest],
    });
  };

  return (
    <>
      <Section title="Bio (optional)" hint="A line or two so people get a feel for you.">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FormField
            label="About me"
            placeholder="e.g. Live music, good coffee and spontaneous weekend plans."
            multiline
            showCount
            maxLength={LOVE_BIO_MAX}
            value={values.bio}
            onChangeText={(bio) => onChange({ ...values, bio })}
            error={errors.bio}
            editable={!disabled}
          />
        </View>
      </Section>

      <Section
        title="Interests (optional)"
        hint={`Pick up to ${LOVE_INTERESTS_MAX}. ${values.interests.length}/${LOVE_INTERESTS_MAX} selected.`}
      >
        <View style={styles.chips}>
          {LOVE_INTERESTS.map((interest) => {
            const selected = values.interests.includes(interest);
            const blocked = !selected && atLimit;
            return (
              <Chip
                key={interest}
                label={interest}
                selected={selected}
                onPress={() => toggleInterest(interest)}
                disabled={disabled || blocked}
                role="checkbox"
              />
            );
          })}
        </View>
        {errors.interests ? <InlineError message={errors.interests} /> : null}
      </Section>

      <Section
        title="Neighbourhood (optional)"
        hint="Helps people nearby find you. Only the neighbourhood is shown, never your exact location."
      >
        <View style={styles.chips}>
          {LOVE_NEIGHBORHOODS.map(({ name, city }) => {
            const selected = values.neighborhood === name;
            return (
              <Chip
                key={name}
                label={city === "Kigali" ? name : `${name}, ${city}`}
                selected={selected}
                // Tapping the selected one again clears it.
                onPress={() => onChange({ ...values, neighborhood: selected ? undefined : name })}
                disabled={disabled}
                role="radio"
              />
            );
          })}
        </View>
        {errors.neighborhood ? <InlineError message={errors.neighborhood} /> : null}
      </Section>
    </>
  );
}

function Chip({
  label,
  selected,
  onPress,
  disabled,
  role,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  role: "checkbox" | "radio";
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.secondary,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled && !selected ? 0.5 : 1,
        },
      ]}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
    >
      <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 38, justifyContent: "center", borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
