import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ColorValue,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useAuth } from "@/context/AuthContext";
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
        size={26}
        color={focused ? colors.primaryForeground : color}
      />
    </View>
  );
}

function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations } = useChat();
  const [showOrganizerSheet, setShowOrganizerSheet] = useState(false);
  const unread = conversations.reduce(
    (count, item) => count + item.unreadCount,
    0,
  );
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const isDark = scheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  return (
    <>
      <Tabs
        safeAreaInsets={insets}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarItemStyle: styles.item,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS
              ? "transparent"
              : isDark
              ? "rgba(7, 8, 20, 0.92)"
              : "rgba(240, 244, 250, 0.92)",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            elevation: 0,
            height: isWeb ? 70 : 60 + insets.bottom,
            paddingBottom: isWeb ? 0 : insets.bottom,
            paddingTop: 6,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.glass,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                  } as any,
                ]}
              />
            ) : null,
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
            tabBarBadgeStyle: {
              backgroundColor: "#38BDF8",
              color: "#FFFFFF",
              fontSize: 10,
              fontFamily: "Inter_700Bold",
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              lineHeight: 18,
              alignSelf: "center",
            },
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="message-circle" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="create-entry"
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              if (user?.isBusinessAccount) {
                router.push("/business/create-post" as any);
              } else {
                setShowOrganizerSheet(true);
              }
            },
          }}
          options={{
            title: "Post",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="plus-square" color={color} focused={focused} />
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
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="settings" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>

      {/* Become an organizer to create post modal */}
      <Modal
        visible={showOrganizerSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrganizerSheet(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOrganizerSheet(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              Platform.OS === "web"
                ? ({
                    backdropFilter: "blur(28px) saturate(1.5)",
                    WebkitBackdropFilter: "blur(28px) saturate(1.5)",
                  } as any)
                : null,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(10, 16, 36, 0.78)"
                    : "rgba(255, 255, 255, 0.82)",
                borderColor: `${colors.primary}55`,
                paddingBottom: Math.max(insets.bottom, 16) + 16,
                overflow: "hidden",
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {Platform.OS !== "web" ? (
              <BlurView
                intensity={85}
                tint={scheme === "dark" ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            ) : null}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` },
              ]}
            >
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.modalEyebrow, { color: colors.primary }]}>ORGANIZER EXCLUSIVE</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Become an organizer to create a post
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Publishing event posts, photos, and live story moments is only available to registered organizers on Eventis. Create your organizer workspace to start sharing.
            </Text>
            <View style={styles.modalFeatures}>
              {[
                "Publish event posts with photos and captions",
                "Share real-time moments to event stories",
                "Reach attendees directly across Rwanda",
              ].map((f) => (
                <View
                  key={f}
                  style={[
                    styles.modalFeatureRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[styles.modalCheck, { backgroundColor: `${colors.primary}24` }]}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.modalFeatureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={[styles.modalCta, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowOrganizerSheet(false);
                router.push("/business/register" as any);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.modalCtaText}>Become an Organizer</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => setShowOrganizerSheet(false)}
              accessibilityRole="button"
              style={styles.modalDismissButton}
            >
              <Text style={[styles.modalDismiss, { color: colors.foreground }]}>Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  activePill: {
    borderRadius: 20,
    height: 40,
    position: "absolute",
    width: 52,
  },
  iconSlot: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 52,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  disabledItem: {
    opacity: 0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.50)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    alignItems: "center",
    gap: 10,
    elevation: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginTop: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 26,
  },
  modalBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  modalFeatures: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  modalFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modalFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  modalCta: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  modalCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalDismissButton: {
    paddingVertical: 8,
  },
  modalDismiss: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});

export default TabLayout;
