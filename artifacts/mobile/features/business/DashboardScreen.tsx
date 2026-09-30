import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_EVENTS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

type DashTab = "overview" | "events";

const STATS = [
  { label: "Total Views", value: "4,320", icon: "eye-outline" as const, colorKey: "primary" as const },
  { label: "Attendees", value: "890", icon: "people-outline" as const, colorKey: "success" as const },
  { label: "Link Clicks", value: "312", icon: "trending-up-outline" as const, colorKey: "accent" as const },
  { label: "Revenue", value: "£15,240", icon: "cash-outline" as const, colorKey: "info" as const },
];

const ACTIVITY = [
  { icon: "ticket-outline" as const, text: "12 new ticket sales", time: "2 hours ago", colorKey: "primary" as const },
  { icon: "eye-outline" as const, text: "284 profile views today", time: "Today", colorKey: "info" as const },
  { icon: "star-outline" as const, text: "New 5-star review received", time: "Yesterday", colorKey: "accent" as const },
];

const ICON_BG: Record<(typeof STATS)[0]["colorKey"], string> = {
  primary: "bg-primary/15",
  success: "bg-success/15",
  accent: "bg-accent/15",
  info: "bg-info/15",
};

export default function BusinessDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashTab>("overview");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const myEvents = MOCK_EVENTS.slice(0, 4);

  const colorFor = (key: typeof STATS[0]["colorKey"]) => colors[key];

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        className="gap-3 border-b border-border px-5 pb-3 dark:border-border-dark"
        style={{ paddingTop: topPad + 8 }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="flex-1 text-[22px] font-bold text-foreground dark:text-foreground-dark">
            Dashboard
          </Text>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/business/create-event" as any)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Tab switcher */}
        <View className="flex-row rounded-xl bg-secondary p-1 dark:bg-secondary-dark">
          {(["overview", "events"] as DashTab[]).map((t) => (
            <Pressable
              key={t}
              className={`flex-1 items-center rounded-[10px] py-2 ${
                activeTab === t
                  ? "bg-card shadow-sm elevation-2 dark:bg-card-dark"
                  : ""
              }`}
              onPress={() => setActiveTab(t)}
            >
              <Text
                className={`text-sm ${
                  activeTab === t
                    ? "font-semibold text-foreground dark:text-foreground-dark"
                    : "font-sans text-muted-foreground dark:text-muted-foreground-dark"
                }`}
              >
                {t === "overview" ? "Overview" : "My Events"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" ? (
          <>
            {/* Stats grid */}
            <View className="flex-row flex-wrap gap-3">
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
                    className="w-[47%] gap-2 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-xl ${ICON_BG[s.colorKey]}`}
                    >
                      <Ionicons name={s.icon} size={22} color={accent} />
                    </View>
                    <Text className="text-[22px] font-bold text-foreground dark:text-foreground-dark">
                      {s.value}
                    </Text>
                    <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                      {s.label}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>

            {/* Recent activity */}
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">
              Recent Activity
            </Text>
            <View className="overflow-hidden rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark">
              {ACTIVITY.map((item, i) => {
                const accent = colorFor(item.colorKey);
                return (
                  <View
                    key={i}
                    className={`flex-row items-center gap-3 p-3.5 ${
                      i < ACTIVITY.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-full ${ICON_BG[item.colorKey]}`}
                    >
                      <Ionicons name={item.icon} size={18} color={accent} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-sm font-medium text-foreground dark:text-foreground-dark">
                        {item.text}
                      </Text>
                      <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                        {item.time}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Quick actions */}
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-5"
                onPress={() => router.push("/business/create-event" as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                <Text className="text-sm font-semibold text-primary-foreground">New Event</Text>
              </Pressable>
              <Pressable className="flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-5 dark:border-border-dark dark:bg-secondary-dark">
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                <Text className="text-sm font-semibold text-primary">Promote</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">
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
                className="mb-1 flex-row overflow-hidden rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark"
              >
                <View className="w-[5px] bg-primary" />
                <View className="flex-1 gap-1.5 p-3.5">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      className="flex-1 text-[15px] font-semibold text-foreground dark:text-foreground-dark"
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <View className="rounded-md bg-success/15 px-2 py-[3px]">
                      <Text className="text-[11px] font-semibold text-success">Live</Text>
                    </View>
                  </View>
                  <Text className="text-[13px] font-sans text-muted-foreground dark:text-muted-foreground-dark">
                    {event.attendees} attendees ·{" "}
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <View className="mt-1 flex-row gap-2">
                    <Pressable className="rounded-lg bg-secondary px-3.5 py-1.5 dark:bg-secondary-dark">
                      <Text className="text-[13px] font-semibold text-foreground dark:text-foreground-dark">
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable className="rounded-lg bg-info/15 px-3.5 py-1.5">
                      <Text className="text-[13px] font-semibold text-info">Analytics</Text>
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
