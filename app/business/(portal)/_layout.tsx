import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

type TabIconName = React.ComponentProps<typeof Feather>["name"];

// Organiser portal tabs. Add a tab here (and a screen file next to this one)
// for new organiser management areas.
const PORTAL_TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "dashboard", title: "Overview", icon: "grid" },
  { name: "create", title: "Create", icon: "plus-square" },
  { name: "organisation", title: "Organisation", icon: "briefcase" },
];

export default function OrganiserPortalLayout() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      safeAreaInsets={insets}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : (Platform.OS === "ios" ? 58 : 62) + insets.bottom,
          paddingBottom: isWeb ? 0 : insets.bottom,
        },
      }}
    >
      {PORTAL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Feather name={tab.icon} size={21} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: { paddingTop: 6 },
  label: { fontSize: 11, fontWeight: "600", marginTop: 3 },
});
