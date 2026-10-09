import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

export type NotificationCategory = "all" | "events" | "activity" | "organizers";

export interface AppNotification {
  id: string;
  category: "events" | "activity" | "organizers";
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  eventId?: string;
  avatarUrl?: string;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif_1",
    category: "events",
    title: "Upcoming Event Tomorrow",
    message: "Neon Pulse Music Festival starts tomorrow at 18:00 at BK Arena. Have your digital pass ready at Gate 2.",
    timeAgo: "25m ago",
    isRead: false,
    iconName: "calendar",
    iconColor: "#6E96FF",
    iconBg: "rgba(110, 150, 255, 0.16)",
    eventId: "evt_1",
  },
  {
    id: "notif_2",
    category: "events",
    title: "Ticket Confirmed",
    message: "Your VIP pass for FutureTech Summit 2026 has been issued. Tap to view QR barcode and entry instructions.",
    timeAgo: "2h ago",
    isRead: false,
    iconName: "ticket",
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.16)",
    eventId: "evt_2",
  },
  {
    id: "notif_3",
    category: "organizers",
    title: "New Story Moment",
    message: "Kigali Jazz posted 3 backstage moments for tonight's Jazz Under The Stars live sessions.",
    timeAgo: "3h ago",
    isRead: false,
    iconName: "sparkles",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.16)",
    avatarUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80",
    eventId: "evt_3",
  },
  {
    id: "notif_4",
    category: "activity",
    title: "Event Shared With You",
    message: "Sarah K. sent you Kigali Culinary Weekend. Check out the guest chefs and tasting menu schedule.",
    timeAgo: "5h ago",
    isRead: true,
    iconName: "paper-plane",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.16)",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
    eventId: "evt_4",
  },
  {
    id: "notif_5",
    category: "events",
    title: "Flash Sale: 20% Off",
    message: "Early bird tickets for Afro Beats Night are ending tonight! Use promo code AFRO20 before midnight.",
    timeAgo: "1d ago",
    isRead: true,
    iconName: "flash",
    iconColor: "#EC4899",
    iconBg: "rgba(236, 72, 153, 0.16)",
    eventId: "evt_6",
  },
  {
    id: "notif_6",
    category: "activity",
    title: "Saved Event Update",
    message: "Rwanda Tech Expo announced 6 new keynote speakers from Silicon Valley and Nairobi.",
    timeAgo: "1d ago",
    isRead: true,
    iconName: "bookmark",
    iconColor: "#3B82F6",
    iconBg: "rgba(59, 130, 246, 0.16)",
    eventId: "evt_5",
  },
  {
    id: "notif_7",
    category: "organizers",
    title: "Venue Upgrade Announcement",
    message: "Kigali Fashion Week main runway has been upgraded to Camp Kigali Arena due to popular demand.",
    timeAgo: "2d ago",
    isRead: true,
    iconName: "megaphone",
    iconColor: "#14B8A6",
    iconBg: "rgba(20, 184, 166, 0.16)",
    avatarUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=160&auto=format&fit=crop&q=80",
    eventId: "evt_7",
  },
];

const CATEGORY_TABS: { label: string; value: NotificationCategory }[] = [
  { label: "All", value: "all" },
  { label: "Events", value: "events" },
  { label: "Activity", value: "activity" },
  { label: "Organizers", value: "organizers" },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>("all");
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications([]);
  }, []);

  const handlePressNotification = useCallback(
    (item: AppNotification) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Mark as read
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );

      // Navigate if event associated
      if (item.eventId) {
        router.push(`/event/${item.eventId}`);
      }
    },
    [router]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed Glassmorphic Header */}
      <GlassSurface
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRightActions}>
            {unreadCount > 0 ? (
              <Pressable
                onPress={handleMarkAllRead}
                style={[styles.markReadBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read"
              >
                <Ionicons name="checkmark-done" size={15} color={colors.primary} />
                <Text style={[styles.markReadText, { color: colors.primary }]}>Mark read</Text>
              </Pressable>
            ) : notifications.length > 0 ? (
              <Pressable
                onPress={handleClearAll}
                style={[styles.clearBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Clear all notifications"
              >
                <Text style={[styles.clearText, { color: colors.mutedForeground }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Category Filter Pills */}
        <View style={styles.categoryRow}>
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.value;
            const count =
              tab.value === "all"
                ? notifications.length
                : notifications.filter((n) => n.category === tab.value).length;
            return (
              <Pressable
                key={tab.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(tab.value);
                }}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? "#FFFFFF" : colors.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.categoryCountBadge,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255, 255, 255, 0.25)"
                          : `${colors.mutedForeground}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryCountText,
                        { color: isSelected ? "#FFFFFF" : colors.mutedForeground },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + 120,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePressNotification(item)}
            style={[
              styles.notifCard,
              {
                backgroundColor: item.isRead ? colors.card : `${colors.primary}0D`,
                borderColor: item.isRead ? colors.border : `${colors.primary}40`,
              },
            ]}
          >
            {/* Left: Icon or Avatar */}
            <View style={styles.notifLeftWrap}>
              {item.avatarUrl ? (
                <View style={styles.avatarWithIconWrap}>
                  <Image source={{ uri: item.avatarUrl }} style={styles.notifAvatar} />
                  <View style={[styles.avatarMiniBadge, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.iconName} size={11} color={item.iconColor} />
                  </View>
                </View>
              ) : (
                <View style={[styles.notifIconWrap, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.iconName} size={20} color={item.iconColor} />
                </View>
              )}
            </View>

            {/* Center: Details */}
            <View style={styles.notifCenterCol}>
              <View style={styles.notifTopRow}>
                <Text
                  style={[
                    styles.notifTitle,
                    {
                      color: colors.foreground,
                      fontFamily: item.isRead ? "Inter_600SemiBold" : "Inter_700Bold",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {item.timeAgo}
                </Text>
              </View>

              <Text
                style={[
                  styles.notifMessage,
                  { color: item.isRead ? colors.mutedForeground : colors.foreground },
                ]}
                numberOfLines={3}
              >
                {item.message}
              </Text>

              {item.eventId && (
                <View style={styles.viewEventRow}>
                  <Text style={[styles.viewEventLink, { color: colors.primary }]}>
                    View event details
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                </View>
              )}
            </View>

            {/* Right: Unread indicator */}
            {!item.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="notifications-off-outline" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              You're completely caught up! Upcoming event reminders, live story moments, and ticket updates will appear right here.
            </Text>
            <Pressable
              style={[styles.emptyCtaBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)" as any)}
            >
              <Ionicons name="compass" size={16} color="#FFFFFF" />
              <Text style={styles.emptyCtaBtnText}>Browse Events</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  headerRightActions: {
    minWidth: 70,
    alignItems: "flex-end",
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  markReadText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  categoryCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  categoryCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  notifLeftWrap: {
    paddingTop: 2,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWithIconWrap: {
    position: "relative",
  },
  notifAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarMiniBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0D1020",
  },
  notifCenterCol: {
    flex: 1,
    gap: 4,
  },
  notifTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  notifTitle: {
    fontSize: 14,
    flex: 1,
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  notifMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  viewEventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  viewEventLink: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    marginTop: 10,
  },
  emptyCtaBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
