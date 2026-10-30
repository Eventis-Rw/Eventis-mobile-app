import React from "react";
import { StyleSheet, View } from "react-native";

import { OptionPicker } from "@/components/love/OptionPicker";
import { Section } from "@/components/love/LoveProfileForm";
import { FormField } from "@/components/OrganisationForm";
import { useColors } from "@/hooks/useColors";
import {
  LOVE_BIO_MAX,
  LOVE_INTERESTS,
  LOVE_INTERESTS_MAX,
  LOVE_LOOKING_FOR_MAX,
  LOVE_RELATIONSHIP_GOALS,
  neighborhoodsFor,
  type LoveRelationshipGoal,
} from "@/utils/findLoveProfile";

export interface LoveProfileExtrasValues {
  bio: string;
  interests: string[];
  relationshipGoal?: LoveRelationshipGoal;
  lookingFor: string;
  neighborhood?: string;
}

export type LoveProfileExtrasErrors = Partial<Record<keyof LoveProfileExtrasValues, string>>;

/** Optional profile details, edited after the profile is created. */
export function LoveProfileExtras({
  values,
  country,
  errors,
  onChange,
  disabled,
}: {
  values: LoveProfileExtrasValues;
  /** Neighbourhoods are listed per country; none are shown where there is no list yet. */
  country?: string;
  errors: LoveProfileExtrasErrors;
  onChange: (next: LoveProfileExtrasValues) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const neighborhoods = neighborhoodsFor(country);

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

      <Section title="Interests (optional)" hint={`Pick up to ${LOVE_INTERESTS_MAX}.`}>
        <OptionPicker
          multiple
          label="Interests"
          placeholder="Select your interests"
          options={INTEREST_OPTIONS}
          max={LOVE_INTERESTS_MAX}
          searchable
          value={values.interests}
          onChange={(interests) => onChange({ ...values, interests })}
          error={errors.interests}
          disabled={disabled}
        />
      </Section>

      <Section title="Relationship goal (optional)" hint="Let people know what you are here for.">
        <OptionPicker
          label="Relationship goal"
          placeholder="Select a goal"
          options={GOAL_OPTIONS}
          value={values.relationshipGoal}
          onChange={(goal) => onChange({ ...values, relationshipGoal: goal as LoveRelationshipGoal | undefined })}
          error={errors.relationshipGoal}
          disabled={disabled}
        />
        <View style={[styles.card, styles.lookingFor, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FormField
            label="What I'm looking for"
            placeholder="e.g. Someone kind who loves live music as much as I do."
            multiline
            showCount
            maxLength={LOVE_LOOKING_FOR_MAX}
            value={values.lookingFor}
            onChangeText={(lookingFor) => onChange({ ...values, lookingFor })}
            error={errors.lookingFor}
            editable={!disabled}
          />
        </View>
      </Section>

      {neighborhoods.length ? (
        <Section
          title="Neighbourhood (optional)"
          hint="Helps people nearby find you. Only the neighbourhood is shown, never your exact location."
        >
          <OptionPicker
            label="Neighbourhood"
            placeholder="Select your neighbourhood"
            options={neighborhoods.map(({ name, city }) => ({ value: name, label: city === "Kigali" ? name : `${name}, ${city}` }))}
            searchable
            value={values.neighborhood}
            onChange={(neighborhood) => onChange({ ...values, neighborhood })}
            error={errors.neighborhood}
            disabled={disabled}
          />
        </Section>
      ) : null}
    </>
  );
}

const INTEREST_OPTIONS = LOVE_INTERESTS.map((interest) => ({ value: interest, label: interest }));
const GOAL_OPTIONS = LOVE_RELATIONSHIP_GOALS.map((goal) => ({ value: goal, label: goal }));

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  lookingFor: { marginTop: 12 },
});
