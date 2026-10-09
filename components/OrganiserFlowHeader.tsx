import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { GlassSurface } from "@/components/GlassSurface";

const STEPS = ["About", "Subscription", "Organisation"];

/** Header for the Become an Organiser flow: back button, title and step progress. */
export function OrganiserFlowHeader({
  title,
  step,
  canGoBack = true,
}: {
  title: string;
  /** 1-based index into STEPS. */
  step: number;
  canGoBack?: boolean;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  return (
    <GlassSurface
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          borderWidth: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          borderRadius: 0,
        },
      ]}
    >
      <View style={styles.row}>
        {canGoBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <View style={styles.spacer} />
      </View>
      <View
        style={styles.progress}
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${STEPS.length}: ${STEPS[step - 1]}`}
      >
        {STEPS.map((label, i) => (
          <View
            key={label}
            style={[styles.segment, { backgroundColor: i < step ? colors.primary : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
        Step {step} of {STEPS.length} · {STEPS[step - 1]}
      </Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spacer: { width: 24 },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  progress: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  stepText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
