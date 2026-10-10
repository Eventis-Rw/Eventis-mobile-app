import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface ProfileSectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

/** Titled block on the profile screen with an optional "See all" style link. */
export function ProfileSection({ title, actionLabel, onAction, children }: ProfileSectionProps) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${actionLabel}: ${title}`}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export interface ProfileStat {
  label: string;
  value: number;
  icon: IconName;
  onPress?: () => void;
}

export function ProfileStatGrid({ stats }: { stats: ProfileStat[] }) {
  const colors = useColors();
  return (
    <View style={styles.statGrid}>
      {stats.map((stat) => (
        <Pressable
          key={stat.label}
          onPress={stat.onPress}
          disabled={!stat.onPress}
          style={({ pressed }) => [styles.statCell, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole={stat.onPress ? "button" : "text"}
          accessibilityLabel={`${stat.value} ${stat.label}`}
        >
          <GlassSurface style={styles.statCard}>
            <Ionicons name={stat.icon} size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
              {stat.label}
            </Text>
          </GlassSurface>
        </Pressable>
      ))}
    </View>
  );
}

interface ProfileNavRowProps {
  icon: IconName;
  label: string;
  sublabel?: string;
  onPress: () => void;
}

export function ProfileNavRow({ icon, label, sublabel, onPress }: ProfileNavRowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.navIcon, { backgroundColor: `${colors.primary}1A` }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navCopy}>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.navSublabel, { color: colors.mutedForeground }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

/** Groups rows into one card with hairline dividers between them. */
export function ProfileCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <GlassSurface style={styles.card}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          {row}
        </React.Fragment>
      ))}
    </GlassSurface>
  );
}

type SectionStateProps =
  | { kind: "loading"; message: string }
  | { kind: "empty"; icon: IconName; title: string; message: string; actionLabel?: string; onAction?: () => void }
  | { kind: "error"; message: string; onRetry: () => void };

/** Inline loading / empty / error placeholder for a single profile section. */
export function SectionState(props: SectionStateProps) {
  const colors = useColors();

  if (props.kind === "loading") {
    return (
      <GlassSurface style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{props.message}</Text>
      </GlassSurface>
    );
  }

  const isError = props.kind === "error";
  const actionLabel = isError ? "Try again" : props.actionLabel;
  const onAction = isError ? props.onRetry : props.onAction;

  return (
    <GlassSurface style={styles.state}>
      <Ionicons
        name={isError ? "cloud-offline-outline" : props.icon}
        size={28}
        color={isError ? colors.destructive : colors.mutedForeground}
      />
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>
        {isError ? "Couldn't load this section" : props.title}
      </Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{props.message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.stateBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.stateBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  sectionAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statGrid: { flexDirection: "row", gap: 10 },
  statCell: { flex: 1 },
  statCard: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { paddingHorizontal: 14, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  navCopy: { flex: 1, minWidth: 0 },
  navLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  navSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  state: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20, gap: 8 },
  stateTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  stateText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "center" },
  stateBtn: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  stateBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
