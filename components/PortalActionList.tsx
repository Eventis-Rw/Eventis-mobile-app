import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { PortalAction } from "@/constants/organiserPortal";
import { useColors } from "@/hooks/useColors";

/** Card list of organiser portal actions. Actions without an `href` show as "Soon". */
export function PortalActionList({ actions, prominent }: { actions: PortalAction[]; prominent?: boolean }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {actions.map((action, i) => {
        const available = Boolean(action.href);
        return (
          <Pressable
            key={action.key}
            disabled={!available}
            onPress={() => {
              if (!action.href) return;
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(action.href as any);
            }}
            style={({ pressed }) => [
              styles.row,
              prominent && styles.rowProminent,
              i < actions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              pressed && { backgroundColor: colors.secondary },
            ]}
            accessibilityRole="button"
            accessibilityLabel={available ? action.title : `${action.title}, coming soon`}
            accessibilityHint={action.description}
            accessibilityState={{ disabled: !available }}
          >
            <View
              style={[
                styles.icon,
                prominent && styles.iconProminent,
                { backgroundColor: available ? colors.primary + "1F" : colors.secondary },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={prominent ? 24 : 20}
                color={available ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: available ? colors.foreground : colors.mutedForeground }]}>
                {action.title}
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{action.description}</Text>
            </View>
            {available ? (
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            ) : (
              <View style={[styles.soon, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.soonText, { color: colors.mutedForeground }]}>Soon</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowProminent: { paddingVertical: 18 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconProminent: { width: 48, height: 48, borderRadius: 14 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  soon: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  soonText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
