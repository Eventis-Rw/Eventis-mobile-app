import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

type TabIconName = React.ComponentProps<typeof Feather>["name"];

// Organiser portal tabs. Add a tab here (and a screen file next to this one)
// for new organiser management areas.
const PORTAL_TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "dashboard", title: "Overview", icon: "grid" },
  { name: "organisation", title: "Organisation", icon: "briefcase" },
];

export default function OrganiserPortalLayout() {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabSurface = palette.canvas;

  return (
    <Tabs
      safeAreaInsets={insets}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.canvas },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          backgroundColor: tabSurface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.line,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0,
          shadowRadius: 12,
          height: 66 + (isWeb ? 0 : insets.bottom),
          paddingBottom: isWeb ? 0 : insets.bottom,
          paddingTop: 4,
        },
      }}
    >
      {PORTAL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && { backgroundColor: palette.blueSoft }]}>
                <Feather name={tab.icon} size={20} color={color} />
              </View>
            ),
          }}
        />
      ))}
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: { paddingTop: 2 },
  iconWrap: { width: 52, height: 30, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 1 },
});
