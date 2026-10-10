import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

// Change this single flag to true when FindLove is ready to return to navigation.
const FIND_LOVE_ENABLED = false;

interface TabIconProps {
  color: ColorValue;
  focused: boolean;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
  isCreate?: boolean;
  isDisabled?: boolean;
}

function TabIcon({
  color,
  focused,
  activeIcon,
  inactiveIcon,
  badgeCount,
  isCreate = false,
  isDisabled = false,
}: TabIconProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.14,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleAnim]);

  if (isCreate) {
    return (
      <Animated.View
        style={[
          styles.iconSlot,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View
          style={[
            styles.createSquircle,
            {
              borderColor: focused
                ? colors.primary
                : isDark
                ? "rgba(255, 255, 255, 0.28)"
                : "rgba(0, 0, 0, 0.22)",
              backgroundColor: focused
                ? `${colors.primary}1A`
                : isDark
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(0, 0, 0, 0.04)",
            },
          ]}
        >
          <Ionicons
            name="add"
            size={22}
            color={focused ? colors.primary : colors.foreground}
          />
        </View>
        {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.iconSlot,
        isDisabled && styles.disabledSlot,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Ionicons
        name={focused ? activeIcon : inactiveIcon}
        size={24}
        color={isDisabled ? colors.disabled : focused ? colors.primary : color}
      />

      {/* Unread message badge */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View
          style={[
            styles.tabBadge,
            {
              backgroundColor: "#38BDF8",
              borderColor: isDark ? "#0A0F1E" : "#FFFFFF",
            },
          ]}
        >
          <Text style={styles.tabBadgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      )}

      {/* Active micro indicator dot */}
      {focused && !isDisabled && (
        <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
      )}
    </Animated.View>
  );
}

function LiveTabIcon({
  color,
  focused,
}: {
  color: ColorValue;
  focused: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 2.2,
            duration: 1300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, pulseOpacity]);

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.14,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.iconSlot,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Ionicons
        name={focused ? "videocam" : "videocam-outline"}
        size={24}
        color={focused ? "#EF4444" : color}
      />
      {/* Sleek LIVE micro-badge with pulsing beacon */}
      <View style={styles.liveMicroBadge}>
        <View style={styles.livePulseContainer}>
          <Animated.View
            style={[
              styles.livePulsePing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.livePulseCore} />
        </View>
        <Text style={styles.liveMicroText}>LIVE</Text>
      </View>

      {focused && <View style={[styles.activeDot, { backgroundColor: "#EF4444" }]} />}
    </Animated.View>
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
              ? "rgba(10, 15, 30, 0.94)"
              : "rgba(255, 255, 255, 0.94)",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark
              ? "rgba(255, 255, 255, 0.10)"
              : "rgba(0, 0, 0, 0.08)",
            elevation: 8,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.25 : 0.06,
            shadowRadius: 16,
            height: isWeb ? 68 : 58 + insets.bottom,
            paddingBottom: isWeb ? 0 : Math.max(insets.bottom - 4, 4),
            paddingTop: 4,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
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
              <TabIcon
                activeIcon="home"
                inactiveIcon="home-outline"
                color={color}
                focused={focused}
              />
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                activeIcon="chatbubble-ellipses"
                inactiveIcon="chatbubble-ellipses-outline"
                color={color}
                focused={focused}
                badgeCount={unread}
              />
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
              <TabIcon
                isCreate
                activeIcon="add"
                inactiveIcon="add"
                color={color}
                focused={focused}
              />
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
                activeIcon="heart"
                inactiveIcon="heart-outline"
                color={color}
                focused={FIND_LOVE_ENABLED && focused}
                isDisabled={!FIND_LOVE_ENABLED}
              />
            ),
          }}
        />
        <Tabs.Screen name="tickets" options={{ href: null }} />
        <Tabs.Screen
          name="live"
          options={{
            title: "Live",
            tabBarIcon: ({ color, focused }) => (
              <LiveTabIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
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
  iconSlot: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 48,
    position: "relative",
  },
  disabledSlot: {
    opacity: 0.45,
  },
  activeDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  createSquircle: {
    width: 34,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadge: {
    position: "absolute",
    top: 1,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 11,
    textAlign: "center",
  },
  liveMicroBadge: {
    position: "absolute",
    top: -1,
    right: -7,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
  livePulseContainer: {
    width: 5,
    height: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  livePulsePing: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFFFFF",
  },
  livePulseCore: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: "#FFFFFF",
  },
  liveMicroText: {
    color: "#FFFFFF",
    fontSize: 7.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    lineHeight: 9,
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
