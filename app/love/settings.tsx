import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { Section } from "@/components/love/LoveProfileForm";
import { useColors } from "@/hooks/useColors";
import { useLoveSettings } from "@/hooks/useLoveSettings";
import { MATCH_DISTANCES_KM, type LoveSettings } from "@/utils/findLoveSettings";

type IconName = keyof typeof Ionicons.glyphMap;

const SAFETY: { key: Exclude<keyof LoveSettings, "maxDistanceKm">; icon: IconName; label: string; description: string }[] = [
  {
    key: "showOnlineStatus",
    icon: "radio-button-on-outline",
    label: "Show when I'm online",
    description: "Others see the \"Online now\" badge on your profile.",
  },
  {
    key: "readReceipts",
    icon: "checkmark-done-outline",
    label: "Read receipts",
    description: "Let people you chat with see when you've read their messages.",
  },
  {
    key: "pauseProfile",
    icon: "eye-off-outline",
    label: "Pause my profile",
    description: "Hide your profile from Home. Your chats and matches stay.",
  },
];

/** FindLove match distance and account safety settings, opened from Me. */
export default function LoveSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { settings, update } = useLoveSettings();

  return (
    <LoveScreenShell title="Settings" onBack={() => router.back()}>
      <Section title="Match distance" hint={`Show people within ${settings.maxDistanceKm} km of you.`}>
        <View style={styles.distances} accessibilityRole="radiogroup">
          {MATCH_DISTANCES_KM.map((km) => {
            const selected = settings.maxDistanceKm === km;
            return (
              <Pressable
                key={km}
                onPress={() => update({ maxDistanceKm: km })}
                style={[
                  styles.distance,
                  { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${km} kilometres`}
              >
                <Text style={[styles.distanceText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{km} km</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Account safety">
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SAFETY.map((item, index) => (
            <View
              key={item.key}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
                <Ionicons name={item.icon} size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.rowText, { color: colors.mutedForeground }]}>{item.description}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={(value) => update({ [item.key]: value })}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
                accessibilityLabel={item.label}
              />
            </View>
          ))}
        </View>
      </Section>

      <View style={[styles.note, { backgroundColor: colors.secondary }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
          These settings are saved on this phone for now. They start working for everyone once FindLove's servers support them.
        </Text>
      </View>
    </LoveScreenShell>
  );
}

const styles = StyleSheet.create({
  distances: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  distance: { minWidth: 64, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  distanceText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  note: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 12 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
