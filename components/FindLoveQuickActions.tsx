import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useColors } from "@/hooks/useColors";

export function FindLoveQuickActions() {
  const colors = useColors();
  const router = useRouter();
  const { connections, activity, tokenBalance } = useFindLoveDemo();

  const actions = [
    {
      label: "Connections",
      value: String(connections.length),
      icon: "people-outline" as const,
      onPress: () => router.push("/love/connections" as any),
    },
    {
      label: "Activity",
      value: String(activity.length),
      icon: "pulse-outline" as const,
      onPress: () => router.push({ pathname: "/love/connections", params: { tab: "activity" } } as any),
    },
    {
      label: "Gift tokens",
      value: String(tokenBalance),
      icon: "gift-outline" as const,
      onPress: () => router.push("/love/wallet" as any),
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Your Love space</Text>
        <View style={[styles.demoBadge, { backgroundColor: colors.glass }]}>
          <Text style={[styles.demoText, { color: colors.primary }]}>DEMO MODE</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${action.value}`}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: colors.glass }]}>
              <Ionicons name={action.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.value, { color: colors.foreground }]}>{action.value}</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22, marginBottom: 6 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  heading: { fontSize: 16, fontFamily: "Inter_700Bold" },
  demoBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  demoText: { fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  actions: { flexDirection: "row", gap: 9 },
  action: { flex: 1, minHeight: 105, borderWidth: 1, borderRadius: 18, padding: 11 },
  icon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 8 },
  label: { fontSize: 10, lineHeight: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
});
