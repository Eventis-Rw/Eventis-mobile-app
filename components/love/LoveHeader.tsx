import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

const ExitContext = createContext<() => void>(() => {});

/**
 * Lets any FindLove screen leave FindLove in one step. Mount it in the /love
 * layout, where the navigation object is the root stack's "love" screen, so
 * going back drops the whole FindLove section and returns to Eventis.
 */
export function LoveExitProvider({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  const router = useRouter();
  const exit = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace("/(tabs)");
  }, [navigation, router]);
  return <ExitContext.Provider value={exit}>{children}</ExitContext.Provider>;
}

export function useExitFindLove() {
  return useContext(ExitContext);
}

/**
 * Top bar for FindLove's main screens: back to Eventis, the screen title, an
 * optional action. Tab screens hide the back button; the Eventis tab does that job.
 */
export function LoveHeader({ title, right, showExit = true }: { title: string; right?: React.ReactNode; showExit?: boolean }) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const exit = useExitFindLove();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      {showExit ? (
        <Pressable
          onPress={exit}
          hitSlop={8}
          style={[styles.exit, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back to Eventis"
        >
          <Ionicons name="chevron-back" size={18} color={colors.foreground} />
          <Text style={[styles.exitText, { color: colors.foreground }]}>Eventis</Text>
        </Pressable>
      ) : (
        <View style={styles.right} />
      )}
      <View style={styles.titleWrap}>
        <Ionicons name="heart" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  exit: { flexDirection: "row", alignItems: "center", gap: 2, height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 18, borderWidth: 1 },
  exitText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  // Same width as the exit button so the title stays centred.
  right: { minWidth: 88, alignItems: "flex-end" },
});
