import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_EVENTS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";
import { EventCard } from "@/components/EventCard";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { bookings } = useBookings();
  const [activeSection, setActiveSection] = useState<"saved" | "settings">("saved");

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  const savedEvents = MOCK_EVENTS.filter((e) =>
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: headerTop + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
          <Pressable
            onPress={() => router.push("/business/register" as any)}
            style={[styles.businessBtn, { backgroundColor: colors.glass, borderColor: colors.primary }]}
          >
            <Ionicons name="business-outline" size={14} color={colors.primary} />
            <Text style={[styles.businessBtnText, { color: colors.primary }]}>
              {user?.isBusinessAccount ? "Dashboard" : "List Event"}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar section */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLetter}>
              {(user?.username ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.username ?? "Guest"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {user?.email ?? ""}
            </Text>
            <View style={styles.badgeRow}>
              {user?.isPhoneVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}22` }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
                </View>
              )}
              {user?.isBusinessAccount && (
                <View style={[styles.verifiedBadge, { backgroundColor: `${colors.primary}22` }]}>
                  <Ionicons name="business" size={12} color={colors.primary} />
                  <Text style={[styles.verifiedText, { color: colors.primary }]}>Business</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable style={[styles.editBtn, { borderColor: colors.border }]}>
            <Ionicons name="pencil-outline" size={16} color={colors.foreground} />
          </Pressable>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
          style={[styles.statsRow]}
        >
          {stats.map((stat, i) => (
            <View
              key={i}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Section tabs */}
        <View style={[styles.sectionTabs, { backgroundColor: colors.secondary }]}>
          {(["saved", "settings"] as const).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.sectionTab,
                activeSection === s && [styles.activeSectionTab, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveSection(s)}
            >
              <Ionicons
                name={s === "saved" ? "bookmark-outline" : "settings-outline"}
                size={16}
                color={activeSection === s ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sectionTabText,
                  {
                    color: activeSection === s ? colors.foreground : colors.mutedForeground,
                    fontFamily:
                      activeSection === s ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
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
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={36} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved events</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the bookmark icon on any event to save it
              </Text>
            </View>
          )
        ) : (
          <View style={styles.settingsList}>
            <SettingRow
              icon="person-outline"
              label="Edit Profile"
              onPress={() => {}}
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
              badgeColor={user?.isPhoneVerified ? colors.success : colors.accent}
            />
            <SettingRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => {}}
              colors={colors}
            />
            <SettingRow
              icon="lock-closed-outline"
              label="Privacy & Security"
              onPress={() => {}}
              colors={colors}
            />
            <SettingRow
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => {}}
              colors={colors}
            />
            <SettingRow
              icon="document-text-outline"
              label="Terms & Privacy"
              onPress={() => {}}
              colors={colors}
            />
            <Pressable
              style={[styles.logoutBtn, { borderColor: colors.destructive }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              <Text style={[styles.logoutText, { color: colors.destructive }]}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  colors,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Pressable
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      {badge && (
        <View style={[styles.settingBadge, { backgroundColor: `${badgeColor}22` }]}>
          <Text style={[styles.settingBadgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  businessBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  businessBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeSectionTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTabText: { fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 30,
  },
  settingsList: { gap: 2 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  settingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  settingBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
