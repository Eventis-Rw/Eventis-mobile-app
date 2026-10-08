import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

type DashTab = "overview" | "events";

const STATS = [
  { label: "Total Views", value: "4,320", icon: "eye-outline" as const, colorKey: "primary" as const },
  { label: "Attendees", value: "890", icon: "people-outline" as const, colorKey: "success" as const },
  { label: "Link Clicks", value: "312", icon: "trending-up-outline" as const, colorKey: "accent" as const },
  { label: "Revenue", value: "RWF 15.2M", icon: "cash-outline" as const, colorKey: "info" as const },
];

const ACTIVITY = [
  { icon: "ticket-outline" as const, text: "12 new ticket sales", time: "2 hours ago", colorKey: "primary" as const },
  { icon: "eye-outline" as const, text: "284 profile views today", time: "Today", colorKey: "info" as const },
  { icon: "star-outline" as const, text: "New 5-star review received", time: "Yesterday", colorKey: "accent" as const },
];

export default function BusinessDashboard() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const { events } = useEvents();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  // No organizer filter yet: the events API doesn't say which events belong to this business.
  const myEvents = events.slice(0, 4);

  const colorFor = (key: typeof STATS[0]["colorKey"]) => colors[key];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Dashboard
          </Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/business/create-event" as any)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          {(["overview", "events"] as DashTab[]).map((t) => (
            <Pressable
              key={t}
              style={[
                styles.tabBtn,
                activeTab === t && [styles.tabBtnActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === t ? colors.foreground : colors.mutedForeground,
                    fontFamily: activeTab === t ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t === "overview" ? "Overview" : "My Events"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" ? (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {STATS.map((s, i) => {
                const accent = colorFor(s.colorKey);
                return (
                  <Animated.View
                    key={s.label}
                    entering={
                      Platform.OS !== "web"
                        ? FadeInDown.delay(i * 70).springify()
                        : undefined
                    }
                    style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.statIcon, { backgroundColor: accent + "22" }]}>
                      <Ionicons name={s.icon} size={22} color={accent} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {s.value}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      {s.label}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>

            {/* Recent activity */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Activity
            </Text>
            <View
              style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {ACTIVITY.map((item, i) => {
                const accent = colorFor(item.colorKey);
                return (
                  <View
                    key={i}
                    style={[
                      styles.activityRow,
                      i < ACTIVITY.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: accent + "22" }]}>
                      <Ionicons name={item.icon} size={18} color={accent} />
                    </View>
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityText, { color: colors.foreground }]}>
                        {item.text}
                      </Text>
                      <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                        {item.time}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Quick actions */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Quick Actions
            </Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/business/create-event" as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>New Event</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Promote</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Events
            </Text>
            {myEvents.map((event, i) => (
              <Animated.View
                key={event.id}
                entering={
                  Platform.OS !== "web"
                    ? FadeInDown.delay(i * 70).springify()
                    : undefined
                }
                style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.eventStripe, { backgroundColor: colors.primary }]} />
                <View style={styles.eventBody}>
                  <View style={styles.eventTitleRow}>
                    <Text
                      style={[styles.eventTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <View style={[styles.liveBadge, { backgroundColor: colors.success + "22" }]}>
                      <Text style={[styles.liveBadgeText, { color: colors.success }]}>
                        Live
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                    {event.attendees} attendees ·{" "}
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <View style={styles.eventActionsRow}>
                    <Pressable
                      style={[styles.eventAction, { backgroundColor: colors.secondary }]}
                    >
                      <Text style={[styles.eventActionText, { color: colors.foreground }]}>
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.eventAction, { backgroundColor: colors.info + "22" }]}
                    >
                      <Text style={[styles.eventActionText, { color: colors.info }]}>
                        Analytics
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: { fontSize: 14 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activityMeta: { flex: 1, gap: 2 },
  activityText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  activityTime: { fontSize: 12, fontFamily: "Inter_400Regular" },

  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
    borderRadius: 16,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  eventCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  eventStripe: { width: 5 },
  eventBody: { flex: 1, padding: 14, gap: 6 },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  eventMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  eventActionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  eventAction: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eventActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
