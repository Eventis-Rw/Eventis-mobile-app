import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ColorValue,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";

type TabIconName = React.ComponentProps<typeof Feather>["name"];

// Change this single flag to true when FindLove is ready to return to navigation.
const FIND_LOVE_ENABLED = false;

function TabIcon({
  color,
  focused,
  name,
}: {
  color: ColorValue;
  focused: boolean;
  name: TabIconName;
}) {
  const colors = useColors();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return (
    <View style={styles.iconSlot}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activePill,
          {
            backgroundColor: colors.primary,
            opacity: progress,
            transform: [
              {
                scaleX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 1],
                }),
              },
              {
                scaleY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.72, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Feather
        name={name}
        size={21}
        color={focused ? colors.primaryForeground : color}
      />
    </View>
  );
}

function TabLayout() {
  const router = useRouter();
  const { conversations } = useChat();
  const unread = conversations.reduce(
    (count, item) => count + item.unreadCount,
    0,
  );
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();

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
          position: "absolute",
          backgroundColor: scheme === "dark" ? "#11162A" : "#FFFFFF",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: scheme === "dark" ? "rgba(255,255,255,0.13)" : "rgba(20,35,70,0.10)",
          elevation: 18,
          marginHorizontal: 12,
          bottom: Math.max(insets.bottom, 8),
          height: 70,
          borderRadius: 24,
          paddingBottom: 0,
          overflow: "hidden",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: scheme === "dark" ? 0.5 : 0.2,
          shadowRadius: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat-entry"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/chat");
          },
        }}
        options={{
          title: "Chat",
          tabBarBadge: unread || undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message-circle" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="findlove"
        listeners={{
          tabPress: (event) => {
            if (!FIND_LOVE_ENABLED) event.preventDefault();
          },
        }}
        options={{
          title: FIND_LOVE_ENABLED ? "FindLove" : "Love · Soon",
          tabBarAccessibilityLabel: FIND_LOVE_ENABLED
            ? "FindLove"
            : "FindLove, temporarily unavailable",
          tabBarItemStyle: [
            styles.item,
            !FIND_LOVE_ENABLED && styles.disabledItem,
          ],
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="heart"
              color={FIND_LOVE_ENABLED ? color : colors.disabled}
              focused={FIND_LOVE_ENABLED && focused}
            />
          ),
        }}
      />
      <Tabs.Screen name="tickets" options={{ href: null }} />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="share-2" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activePill: {
    borderRadius: 14,
    height: 34,
    position: "absolute",
    width: 52,
  },
  iconSlot: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 52,
  },
  item: {
    paddingTop: 7,
  },
  disabledItem: {
    opacity: 0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
});

export default TabLayout;
