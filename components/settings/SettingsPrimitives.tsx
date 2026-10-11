import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Tone = "success" | "warning" | "destructive" | "primary" | "mutedForeground";

/**
 * One settings group: an uppercase title and a card of rows with dividers.
 * Renders nothing when every child is null, so groups disappear when none of
 * their options apply to the account.
 */
export function SettingsGroup({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  const colors = useColors();
  const rows = React.Children.toArray(children).filter(Boolean);
  if (!rows.length) return null;
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      <GlassSurface style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            {row}
          </React.Fragment>
        ))}
      </GlassSurface>
      {footer ? <Text style={[styles.footer, { color: colors.mutedForeground }]}>{footer}</Text> : null}
    </View>
  );
}

interface SettingsRowProps {
  icon: IconName;
  label: string;
  sublabel?: string;
  /** Short status pill on the right, e.g. "Verified". */
  badge?: { text: string; tone: Tone };
  /** Omit for a status-only row (no chevron, not pressable). */
  onPress?: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Opens outside the app (mail, browser): shows an external icon instead of a chevron. */
  external?: boolean;
}

export function SettingsRow({ icon, label, sublabel, badge, onPress, destructive, busy, external }: SettingsRowProps) {
  const colors = useColors();
  const tint = destructive ? colors.destructive : colors.primary;
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: `${tint}14` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.sublabel, { color: colors.mutedForeground }]} numberOfLines={2}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: `${colors[badge.tone]}22` }]}>
          <Text style={[styles.badgeText, { color: colors[badge.tone] }]}>{badge.text}</Text>
        </View>
      ) : null}
      {busy ? (
        <ActivityIndicator size="small" color={tint} />
      ) : onPress && !destructive ? (
        <Ionicons name={external ? "open-outline" : "chevron-forward"} size={16} color={colors.mutedForeground} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[label, sublabel, badge?.text].filter(Boolean).join(", ")}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole={external ? "link" : "button"}
      accessibilityLabel={[label, sublabel, badge?.text].filter(Boolean).join(", ")}
      accessibilityState={{ busy }}
    >
      {content}
    </Pressable>
  );
}

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: "system", label: "Auto", icon: "phone-portrait-outline" },
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
];

/** Light / dark / follow-the-device. Applies immediately and is remembered on the device. */
export function AppearanceRow() {
  const colors = useColors();
  const { preference, setPreference } = useTheme();
  return (
    <View style={styles.appearance}>
      <View style={styles.appearanceHeader}>
        <View style={[styles.icon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="contrast-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.foreground }]}>Appearance</Text>
          <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>Auto follows your phone's setting</Text>
        </View>
      </View>
      <View style={[styles.segment, { backgroundColor: colors.secondary }]} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const selected = preference === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                setPreference(option.id);
              }}
              style={[styles.segmentOption, selected && { backgroundColor: colors.primary }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.label} theme`}
            >
              <Ionicons name={option.icon} size={14} color={selected ? "#FFFFFF" : colors.mutedForeground} />
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? "#FFFFFF" : colors.mutedForeground, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  card: { paddingHorizontal: 14, paddingVertical: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sublabel: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  appearance: { paddingVertical: 12, gap: 10 },
  appearanceHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  segment: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 3 },
  segmentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    borderRadius: 10,
  },
  segmentText: { fontSize: 13 },
});
