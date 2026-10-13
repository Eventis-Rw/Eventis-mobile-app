import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

const STEPS = ["Discover", "Choose plan", "Create profile"];

export function OrganiserFlowHeader({
  title,
  step,
  canGoBack = true,
}: {
  title: string;
  step: number;
  canGoBack?: boolean;
}) {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: palette.canvas, borderBottomColor: palette.line }]}>
      <View style={styles.row}>
        {canGoBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            style={({ pressed }) => [styles.back, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={21} color={palette.text} />
          </Pressable>
        ) : <View style={styles.back} />}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.meta, { color: palette.muted }]}>{STEPS[step - 1]} · {step} of {STEPS.length}</Text>
        </View>
        <View style={[styles.step, { backgroundColor: palette.blueSoft }]}>
          <Text style={[styles.stepText, { color: palette.blue }]}>{step}</Text>
        </View>
      </View>
      <View style={styles.progress}>
        {STEPS.map((label, index) => (
          <View key={label} style={[styles.segment, { backgroundColor: index < step ? palette.blue : palette.line }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  back: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.25 },
  meta: { fontSize: 10, fontFamily: "Inter_500Medium" },
  step: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progress: { flexDirection: "row", gap: 6 },
  segment: { height: 3, flex: 1, borderRadius: 2 },
});
