import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/OrganisationForm";
import { InlineError } from "@/components/profile/ProfileSection";
import type { LoveVisibility } from "@/constants/loveProfiles";
import { useColors } from "@/hooks/useColors";
import {
  FREE_LOVE_PHOTO_LIMIT,
  LOVE_GENDERS,
  LOVE_USERNAME_MAX,
  type LoveGender,
} from "@/utils/findLoveProfile";

export interface LoveProfileFormValues {
  username: string;
  gender?: LoveGender;
  visibility: LoveVisibility;
  photoUrls: string[];
}

export type LoveProfileFormErrors = Partial<Record<"username" | "gender" | "photoUrls", string>>;

interface Props {
  values: LoveProfileFormValues;
  errors: LoveProfileFormErrors;
  onChange: (next: LoveProfileFormValues) => void;
  onBlur: (field: keyof LoveProfileFormErrors) => void;
  /** The Eventis account phone; FindLove uses it as-is. */
  phone?: string;
  disabled?: boolean;
}

/** Fields shared by "Create profile" and "Edit profile". */
export function LoveProfileForm({ values, errors, onChange, onBlur, phone, disabled }: Props) {
  const colors = useColors();
  const set = <K extends keyof LoveProfileFormValues>(key: K, value: LoveProfileFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.root}>
      <Section
        title="Photos (optional)"
        hint={`A main photo plus ${FREE_LOVE_PHOTO_LIMIT - 1} extra. You can add or change them any time in your profile.`}
      >
        <PhotoSlots
          photoUrls={values.photoUrls}
          onChange={(photoUrls) => {
            set("photoUrls", photoUrls);
            onBlur("photoUrls");
          }}
          disabled={disabled}
        />
        {errors.photoUrls ? <InlineError message={errors.photoUrls} /> : null}
      </Section>

      <Section title="About you">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FormField
            label="Username"
            required
            icon="at-outline"
            placeholder="e.g. amara.k"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={LOVE_USERNAME_MAX + 1}
            value={values.username}
            onChangeText={(text) => set("username", text)}
            onBlur={() => onBlur("username")}
            error={errors.username}
            editable={!disabled}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Shown to other members instead of your Eventis name. Letters, numbers, dots and underscores.
          </Text>

          <View style={styles.group}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              I am a <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {LOVE_GENDERS.map((gender) => {
                const selected = values.gender === gender;
                return (
                  <Pressable
                    key={gender}
                    onPress={() => {
                      set("gender", gender);
                      onBlur("gender");
                    }}
                    disabled={disabled}
                    style={[
                      styles.choice,
                      {
                        backgroundColor: selected ? colors.primary : colors.secondary,
                        borderColor: selected ? colors.primary : errors.gender ? colors.destructive : colors.border,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled }}
                  >
                    <Text style={[styles.choiceText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{gender}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.gender ? <InlineError message={errors.gender} /> : null}
          </View>

          <View style={styles.group}>
            <Text style={[styles.label, { color: colors.foreground }]}>Phone number</Text>
            <View style={[styles.readOnly, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {phone || "No phone number on your account"}
              </Text>
              <Ionicons name="lock-closed-outline" size={14} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              From your Eventis account. It is never shown to other members. Change it in Edit Profile.
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Profile type">
        <VisibilityOption
          title="Public"
          description="Free. Members can find you in FindLove."
          icon="globe-outline"
          selected={values.visibility === "public"}
          onPress={() => set("visibility", "public")}
          disabled={disabled}
        />
        <VisibilityOption
          title="Private"
          description="Premium. Only premium members can see you. Available when FindLove plans launch."
          icon="lock-closed-outline"
          selected={values.visibility === "private"}
          onPress={() => set("visibility", "private")}
          disabled
          badge="Soon"
        />
      </Section>
    </View>
  );
}

function PhotoSlots({
  photoUrls,
  onChange,
  disabled,
}: {
  photoUrls: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = async (index: number) => {
    setPickError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // Android's crop screen hides its confirm button under the status bar
        // (edge-to-edge), so only iOS gets the crop step. See app/profile/edit.tsx.
        allowsEditing: Platform.OS === "ios",
        aspect: [4, 5],
        quality: 0.6,
      });
      if (result.canceled) return;
      const next = [...photoUrls];
      next[Math.min(index, next.length)] = result.assets[0].uri;
      onChange(next.slice(0, FREE_LOVE_PHOTO_LIMIT));
    } catch {
      setPickError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const remove = (index: number) => onChange(photoUrls.filter((_, i) => i !== index));

  return (
    <View style={styles.photoBlock}>
      <View style={styles.photoRow}>
        {Array.from({ length: FREE_LOVE_PHOTO_LIMIT }, (_, index) => {
          const uri = photoUrls[index];
          // The extra slot opens only after the main photo is set.
          const locked = index > photoUrls.length;
          const label = index === 0 ? "Main photo" : "Extra photo";
          return (
            <View key={index} style={styles.photoCell}>
              <Pressable
                onPress={() => void pick(index)}
                disabled={disabled || locked}
                style={[
                  styles.photoSlot,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: uri ? colors.border : colors.primary,
                    opacity: locked ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={uri ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Ionicons name="add" size={28} color={colors.primary} />
                    <Text style={[styles.photoEmptyText, { color: colors.mutedForeground }]}>{label}</Text>
                  </View>
                )}
              </Pressable>
              {uri ? (
                <Pressable
                  onPress={() => remove(index)}
                  disabled={disabled}
                  hitSlop={8}
                  style={[styles.removeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label.toLowerCase()}`}
                >
                  <Ionicons name="close" size={16} color={colors.foreground} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      {pickError ? <InlineError message={pickError} /> : null}
    </View>
  );
}

function VisibilityOption({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.option,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled && !selected ? 0.6 : 1,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
    >
      <View style={[styles.optionIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.optionBody}>
        <View style={styles.optionTitleRow}>
          <Text style={[styles.optionTitle, { color: colors.foreground }]}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.optionText, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? colors.primary : colors.mutedForeground}
      />
    </Pressable>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  group: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", gap: 10 },
  choice: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  readOnly: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, minHeight: 46 },
  readOnlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  photoBlock: { gap: 8 },
  photoRow: { flexDirection: "row", gap: 12 },
  photoCell: { flex: 1, maxWidth: 220 },
  photoSlot: { aspectRatio: 4 / 5, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoEmptyText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  removeBtn: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1.5, padding: 14 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionBody: { flex: 1, gap: 3 },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  optionText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
