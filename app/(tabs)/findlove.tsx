import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function FindLoveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: Platform.OS === "web" ? 84 + 24 : insets.bottom + 100,
        },
      ]}
    >
      <View style={[styles.mark, { backgroundColor: colors.secondary }]}>
        <Ionicons name="heart" size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>FindLove</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        Meet people going to the same events. This space is ready for matches once accounts can connect.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  mark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
