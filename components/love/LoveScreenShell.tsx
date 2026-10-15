import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

/** Header + scrolling body for the FindLove create and edit profile screens. */
export function LoveScreenShell({
  title,
  onBack,
  stepLabel,
  right,
  children,
}: {
  title: string;
  onBack: () => void;
  stepLabel?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} accessibilityRole="header">
            {title}
          </Text>
          {stepLabel ? <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>{stepLabel}</Text> : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  right: { minWidth: 44, alignItems: "flex-end" },
  headerText: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 16, gap: 18 },
});
