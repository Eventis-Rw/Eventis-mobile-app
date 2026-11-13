import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useNotificationsOptional } from "@/context/NotificationsContext";

export function NotificationPopupHost() {
  const ctx = useNotificationsOptional();
  const popup = ctx?.popup;
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const translate = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (popup) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, { toValue: -120, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [popup, translate, opacity]);

  if (!ctx) return null;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Animated.View
        pointerEvents={popup ? "auto" : "none"}
        style={[
          styles.wrap,
          {
            top: insets.top + 8,
            transform: [{ translateY: translate }],
            opacity,
          },
        ]}
      >
        {popup ? (
          <Pressable
            onPress={() => {
              ctx.dismissPopup();
              router.push("/notifications" as any);
            }}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...(Platform.OS === "web" ? { boxShadow: "0 8px 24px rgba(0,0,0,0.18)" as any } : { elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }),
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="notifications" size={18} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{popup.title}</Text>
              <Text style={[styles.text, { color: colors.mutedForeground }]} numberOfLines={2}>{popup.body}</Text>
            </View>
            <Pressable onPress={ctx.dismissPopup} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  close: { padding: 4 },
});
