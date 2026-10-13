import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { PortalAction } from "@/constants/organiserPortal";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

export function PortalActionList({ actions, prominent }: { actions: PortalAction[]; prominent?: boolean }) {
  const palette = useOrganiserPalette();
  const router = useRouter();

  return (
    <View style={styles.list}>
      {actions.map((action) => {
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
              styles.card,
              prominent && styles.prominent,
              { backgroundColor: palette.surface, borderColor: palette.line },
              pressed && { backgroundColor: palette.surfacePressed },
              !available && styles.unavailable,
            ]}
            accessibilityRole="button"
            accessibilityLabel={available ? action.title : `${action.title}, coming soon`}
            accessibilityHint={action.description}
            accessibilityState={{ disabled: !available }}
          >
            <View style={[styles.icon, prominent && styles.iconProminent, { backgroundColor: available ? palette.blueSoft : palette.surfaceRaised }]}>
              <Ionicons name={action.icon} size={prominent ? 23 : 20} color={available ? palette.blue : palette.muted} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, prominent && styles.titleProminent, { color: available ? palette.text : palette.muted }]}>{action.title}</Text>
              <Text style={[styles.description, { color: palette.muted }]}>{action.description}</Text>
            </View>
            {available ? (
              <View style={[styles.arrow, { backgroundColor: palette.surfaceRaised }]}>
                <Ionicons name="arrow-forward" size={16} color={palette.text} />
              </View>
            ) : (
              <View style={[styles.soon, { backgroundColor: palette.surfaceRaised }]}><Text style={[styles.soonText, { color: palette.muted }]}>SOON</Text></View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 13 },
  prominent: { minHeight: 96, padding: 15 },
  unavailable: { opacity: 0.62 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  iconProminent: { width: 48, height: 48, borderRadius: 15 },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  titleProminent: { fontSize: 16 },
  description: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  arrow: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  soon: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  soonText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
});
