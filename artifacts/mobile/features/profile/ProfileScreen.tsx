import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";
import { EventCard } from "@/components/EventCard";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { bookings } = useBookings();
  const { events } = useEvents();
  const [activeSection, setActiveSection] = useState<"saved" | "settings">("saved");
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  const savedEvents = events.filter((e) =>
    user?.savedEvents.includes(e.id)
  );

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      return;
    }
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  const stats = [
    { label: "Booked", value: bookings.filter((b) => b.status !== "cancelled").length },
    { label: "Saved", value: user?.savedEvents.length ?? 0 },
    { label: "Reviews", value: 4 },
  ];

  // Guest view
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <View
          className="border-b border-border px-5 pb-4 dark:border-border-dark"
          style={{ paddingTop: headerTop + 8 }}
        >
          <Text className="text-[28px] font-bold text-foreground dark:text-foreground-dark">
            Profile
          </Text>
        </View>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary dark:bg-secondary-dark">
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text className="text-center text-xl font-bold text-foreground dark:text-foreground-dark">
            You're browsing as a guest
          </Text>
          <Text className="text-center text-sm font-sans leading-[22px] text-muted-foreground dark:text-muted-foreground-dark">
            Sign in to save events, book tickets and more
          </Text>
          <Pressable
            className="mt-2 rounded-2xl bg-primary px-8 py-4"
            onPress={() => router.push("/auth/register" as any)}
          >
            <Text className="text-base font-bold text-primary-foreground">Sign In / Register</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="border-b border-border px-5 pb-4 dark:border-border-dark"
        style={{ paddingTop: headerTop + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[28px] font-bold text-foreground dark:text-foreground-dark">
            Profile
          </Text>
          <Pressable
            onPress={() => router.push("/business/register" as any)}
            className="flex-row items-center gap-1.5 rounded-xl border border-primary bg-glass px-3.5 py-2 dark:bg-glass-dark"
          >
            <Ionicons name="business-outline" size={14} color={colors.primary} />
            <Text className="text-[13px] font-semibold text-primary">
              {user?.isBusinessAccount ? "Dashboard" : "List Event"}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pt-5"
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar section */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
          className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-[28px] font-bold text-primary-foreground">
              {(user?.username ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">
              {user?.username ?? "Guest"}
            </Text>
            <Text className="mt-0.5 text-[13px] font-sans text-muted-foreground dark:text-muted-foreground-dark">
              {user?.email ?? ""}
            </Text>
            <View className="mt-1.5 flex-row gap-1.5">
              {user?.isPhoneVerified && (
                <View className="flex-row items-center gap-1 rounded-[20px] bg-success/15 px-2 py-[3px]">
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text className="text-[11px] font-semibold text-success">Verified</Text>
                </View>
              )}
              {user?.isBusinessAccount && (
                <View className="flex-row items-center gap-1 rounded-[20px] bg-primary/15 px-2 py-[3px]">
                  <Ionicons name="business" size={12} color={colors.primary} />
                  <Text className="text-[11px] font-semibold text-primary">Business</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full border border-border dark:border-border-dark"
            onPress={() => router.push("/profile/edit" as any)}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.foreground} />
          </Pressable>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
          className="flex-row gap-2.5"
        >
          {stats.map((stat, i) => (
            <View
              key={i}
              className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark"
            >
              <Text className="text-2xl font-bold text-foreground dark:text-foreground-dark">
                {stat.value}
              </Text>
              <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Become an Organiser banner */}
        {!user?.isBusinessAccount && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}
          >
            <Pressable
              className="flex-row items-center justify-between rounded-2xl bg-primary p-4"
              onPress={() => setShowOrganizerModal(true)}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="megaphone-outline" size={22} color="#fff" />
                <View>
                  <Text className="text-[15px] font-bold text-primary-foreground">
                    Become an Organiser
                  </Text>
                  <Text className="mt-0.5 text-xs font-sans text-primary-foreground/75">
                    Host your own events on Eventis
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </Animated.View>
        )}

        {/* Section tabs */}
        <View className="flex-row gap-1 rounded-xl bg-secondary p-1 dark:bg-secondary-dark">
          {(["saved", "settings"] as const).map((s) => (
            <Pressable
              key={s}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-2.5 ${
                activeSection === s
                  ? "bg-card shadow-sm elevation-2 dark:bg-card-dark"
                  : ""
              }`}
              onPress={() => setActiveSection(s)}
            >
              <Ionicons
                name={s === "saved" ? "bookmark-outline" : "settings-outline"}
                size={16}
                color={activeSection === s ? colors.primary : colors.mutedForeground}
              />
              <Text
                className={`text-sm ${
                  activeSection === s
                    ? "font-semibold text-foreground dark:text-foreground-dark"
                    : "font-sans text-muted-foreground dark:text-muted-foreground-dark"
                }`}
              >
                {s === "saved" ? "Saved" : "Settings"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeSection === "saved" ? (
          savedEvents.length > 0 ? (
            savedEvents.map((event) => (
              <EventCard key={event.id} event={event} variant="standard" />
            ))
          ) : (
            <View className="items-center gap-2.5 pt-10">
              <Ionicons name="bookmark-outline" size={36} color={colors.border} />
              <Text className="text-[17px] font-semibold text-foreground dark:text-foreground-dark">
                No saved events
              </Text>
              <Text className="px-[30px] text-center text-[13px] font-sans text-muted-foreground dark:text-muted-foreground-dark">
                Tap the bookmark icon on any event to save it
              </Text>
            </View>
          )
        ) : (
          <View className="gap-0.5">
            <SettingRow
              icon="person-outline"
              label="Edit Profile"
              onPress={() => router.push("/profile/edit" as any)}
              colors={colors}
            />
            <SettingRow
              icon="phone-portrait-outline"
              label={user?.isPhoneVerified ? "Phone Verified" : "Verify Phone"}
              onPress={() =>
                router.push({
                  pathname: "/auth/otp",
                  params: { purpose: "register" },
                } as any)
              }
              colors={colors}
              badge={user?.isPhoneVerified ? "Verified" : "Required"}
              badgeVariant={user?.isPhoneVerified ? "success" : "accent"}
            />
            <SettingRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() =>
                Alert.alert(
                  "Notifications",
                  "Manage notification preferences in your device settings.",
                  [{ text: "OK" }]
                )
              }
              colors={colors}
            />
            <SettingRow
              icon="lock-closed-outline"
              label="Privacy & Security"
              onPress={() =>
                Alert.alert(
                  "Privacy & Security",
                  "Your data is encrypted and never shared with third parties.",
                  [{ text: "Got it" }]
                )
              }
              colors={colors}
            />
            <SettingRow
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => Linking.openURL("mailto:support@eventis.app")}
              colors={colors}
            />
            <SettingRow
              icon="document-text-outline"
              label="Terms & Privacy"
              onPress={() => Linking.openURL("https://eventis.app/terms")}
              colors={colors}
            />
            <Pressable
              className="mt-4 flex-row items-center justify-center gap-2 rounded-[14px] border border-destructive py-3.5"
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              <Text className="text-base font-semibold text-destructive">Sign Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Organiser Modal */}
      <Modal visible={showOrganizerModal} transparent animationType="slide" onRequestClose={() => setShowOrganizerModal(false)}>
        <Pressable
          className="flex-1 justify-end bg-overlay dark:bg-overlay-dark"
          onPress={() => setShowOrganizerModal(false)}
        >
          <Pressable
            className="items-center gap-3 rounded-t-3xl bg-card p-6 dark:bg-card-dark"
            onPress={() => {}}
          >
            <View className="mb-2 h-1 w-10 rounded-sm bg-border dark:bg-border-dark" />
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Ionicons name="megaphone" size={32} color="#fff" />
            </View>
            <Text className="text-center text-[22px] font-bold text-foreground dark:text-foreground-dark">
              Become an Organiser
            </Text>
            <Text className="text-center text-sm font-sans leading-[22px] text-muted-foreground dark:text-muted-foreground-dark">
              List your events, manage bookings, and reach thousands of people near you. It's free to get started.
            </Text>
            <View className="my-1 w-full gap-2.5">
              {["Create & manage events", "Sell tickets or list free events", "View attendee analytics"].map((f) => (
                <View key={f} className="flex-row items-center gap-2.5">
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text className="text-sm font-sans text-foreground dark:text-foreground-dark">{f}</Text>
                </View>
              ))}
            </View>
            <Pressable
              className="w-full items-center rounded-2xl bg-primary py-4"
              onPress={() => {
                setShowOrganizerModal(false);
                router.push("/business/register" as any);
              }}
            >
              <Text className="text-base font-bold text-primary-foreground">
                Get Started as Organiser
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowOrganizerModal(false)}>
              <Text className="py-2 text-sm font-sans text-muted-foreground dark:text-muted-foreground-dark">
                Maybe later
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  colors,
  badge,
  badgeVariant,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  badge?: string;
  badgeVariant?: "success" | "accent";
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3.5 border-b border-border py-3.5 dark:border-border-dark"
      onPress={onPress}
    >
      <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-secondary dark:bg-secondary-dark">
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark">
        {label}
      </Text>
      {badge && (
        <View
          className={`rounded-[20px] px-2 py-[3px] ${
            badgeVariant === "success" ? "bg-success/15" : "bg-accent/15"
          }`}
        >
          <Text
            className={`text-[11px] font-semibold ${
              badgeVariant === "success" ? "text-success" : "text-accent"
            }`}
          >
            {badge}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}
