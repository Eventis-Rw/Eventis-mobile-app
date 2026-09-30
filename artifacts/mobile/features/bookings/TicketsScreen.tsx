import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TicketCard } from "@/features/bookings/components/TicketCard";
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
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="border-b border-border px-5 pb-4 dark:border-border-dark"
        style={{ paddingTop: headerTop + 8 }}
      >
        <Text className="mb-4 text-[28px] font-bold text-foreground dark:text-foreground-dark">
          My Tickets
        </Text>

        <View className="flex-row gap-0.5 rounded-xl bg-secondary p-1 dark:bg-secondary-dark">
          {TABS.map((tab) => (
            <Pressable
              key={tab.value}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-2 ${
                activeTab === tab.value
                  ? "bg-card shadow-sm elevation-2 dark:bg-card-dark"
                  : ""
              }`}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text
                className={`text-[13px] ${
                  activeTab === tab.value
                    ? "font-semibold text-foreground dark:text-foreground-dark"
                    : "font-sans text-muted-foreground dark:text-muted-foreground-dark"
                }`}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  className={`h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1 ${
                    activeTab === tab.value
                      ? "bg-primary"
                      : "bg-border dark:bg-border-dark"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      activeTab === tab.value
                        ? "text-primary-foreground"
                        : "text-muted-foreground dark:text-muted-foreground-dark"
                    }`}
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
        contentContainerClassName="px-5 pt-5"
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TicketCard booking={item} index={index} />
        )}
        scrollEnabled={!!activeBookings.length}
        ListEmptyComponent={
          <View className="items-center gap-3 pt-[60px]">
            <View className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full bg-secondary dark:bg-secondary-dark">
              <Ionicons name="ticket-outline" size={32} color={colors.primary} />
            </View>
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              {activeTab === "upcoming"
                ? "No upcoming tickets"
                : activeTab === "past"
                ? "No past events"
                : "No cancelled bookings"}
            </Text>
            <Text className="px-10 text-center text-sm font-sans text-muted-foreground dark:text-muted-foreground-dark">
              {activeTab === "upcoming"
                ? "Discover events and book your tickets"
                : "Your attended events will appear here"}
            </Text>
            {activeTab === "upcoming" && (
              <Pressable
                className="mt-2 rounded-xl bg-primary px-6 py-3"
                onPress={() => router.push("/(tabs)" as any)}
              >
                <Text className="text-[15px] font-semibold text-primary-foreground">
                  Discover Events
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}
