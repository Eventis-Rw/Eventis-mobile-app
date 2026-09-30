import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TicketCard } from "@/components/TicketCard";
import { useBookings } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";

type Tab = "upcoming" | "past" | "cancelled";

export default function TicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookings } = useBookings();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  const now = new Date().toISOString().split("T")[0];

  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && b.eventDate >= now
  );
  const past = bookings.filter(
    (b) => b.status !== "cancelled" && b.eventDate < now
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const activeBookings =
    activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : cancelled;

  const TABS: { label: string; value: Tab; count: number }[] = [
    { label: "Upcoming", value: "upcoming", count: upcoming.length },
    { label: "Past", value: "past", count: past.length },
    { label: "Cancelled", value: "cancelled", count: cancelled.length },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: headerTop + 8, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>My Tickets</Text>

        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.value}
              style={[
                styles.tab,
                activeTab === tab.value && [
                  styles.activeTab,
                  { backgroundColor: colors.card },
                ],
              ]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab.value
                        ? colors.foreground
                        : colors.mutedForeground,
                    fontFamily:
                      activeTab === tab.value
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        activeTab === tab.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          activeTab === tab.value ? "#fff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={activeBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TicketCard booking={item} index={index} />
        )}
        scrollEnabled={!!activeBookings.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="ticket-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTab === "upcoming"
                ? "No upcoming tickets"
                : activeTab === "past"
                ? "No past events"
                : "No cancelled bookings"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === "upcoming"
                ? "Discover events and book your tickets"
                : "Your attended events will appear here"}
            </Text>
            {activeTab === "upcoming" && (
              <Pressable
                style={[styles.discoverBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)" as any)}
              >
                <Text style={styles.discoverBtnText}>Discover Events</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 20, paddingTop: 20 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  discoverBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  discoverBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
