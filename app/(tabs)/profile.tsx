import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { EventCard } from "@/components/EventCard";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, deleteAccount, isAuthenticated } = useAuth();
  const { bookings } = useBookings();
  const { events } = useEvents();
  const [activeSection, setActiveSection] = useState<"saved" | "settings">("saved");
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  const savedEvents = events.filter((e) =>
    user?.savedEvents.includes(e.id)
  );

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace("/onboarding" as any);
    };

    if (Platform.OS === "web") {
      void doLogout();
      return;
    }
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      await deleteAccount();
      router.replace("/onboarding" as any);
    };

    if (Platform.OS === "web") {
      void doDelete();
      return;
    }
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account permanently? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Permanently", style: "destructive", onPress: () => void doDelete() },
      ]
    );
  };

  const stats = [
    { label: "Booked", value: bookings.filter((b) => b.status !== "cancelled").length },
    { label: "Saved", value: user?.savedEvents.length ?? 0 },
    { label: "Reviews", value: 4 },
  ];

  // Guest view
  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: headerTop + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.guestAvatar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>You're browsing as a guest</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Sign in to save events, book tickets and more</Text>
          <Pressable
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.signInBtnText}>Sign In / Register</Text>
          </Pressable>
          <ColorModeSwitcher colors={colors} />
          <SettingRow
            icon="play-circle-outline"
            label="Preview Onboarding"
            onPress={() => router.push("/presentation-splash" as any)}
            colors={colors}
          />
        </View>
      </View>
    );
  }

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
            onPress={() =>
              user?.isBusinessAccount
                ? router.push("/business/register" as any)
                : setShowOrganizerModal(true)
            }
            style={[styles.organizerHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            <Text style={styles.organizerHeaderBtnText}>
              {user?.isBusinessAccount ? "Dashboard" : "Become an organizer"}
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
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>
                {(user?.username ?? "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.username && !user.username.startsWith("Member") && !user.username.startsWith("User ")
                ? user.username
                : "Eventis Explorer"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {user?.email || user?.phone || "Signed in"}
            </Text>
            <View style={styles.badgeRow}>
              {user?.isPhoneVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}22` }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
                </View>
              )}
              {user?.isBusinessAccount ? (
                <View style={[styles.verifiedBadge, { backgroundColor: `${colors.primary}22` }]}>
                  <Ionicons name="business" size={12} color={colors.primary} />
                  <Text style={[styles.verifiedText, { color: colors.primary }]}>Organizer</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.becomeOrganizerBadgeBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowOrganizerModal(true)}
                >
                  <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                  <Text style={styles.becomeOrganizerBadgeText}>Become an organizer</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            style={[styles.editBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/profile/edit" as any)}
          >
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

        {/* Become an Organiser banner */}
        {!user?.isBusinessAccount && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}
          >
            <Pressable
              style={[styles.organiserBanner, { backgroundColor: colors.primary }]}
              onPress={() => setShowOrganizerModal(true)}
            >
              <View style={styles.organiserBannerLeft}>
                <Ionicons name="megaphone-outline" size={22} color="#fff" />
                <View>
                  <Text style={styles.organiserBannerTitle}>Become an organizer</Text>
                  <Text style={styles.organiserBannerSub}>Host your own events on Eventis</Text>
                </View>
              </View>
              <View style={styles.bannerCtaPill}>
                <Text style={styles.bannerCtaPillText}>Get Started</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

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
            <ColorModeSwitcher colors={colors} />
            <SettingRow
              icon="play-circle-outline"
              label="Preview Onboarding"
              onPress={() => router.push("/presentation-splash" as any)}
              colors={colors}
            />
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
              badgeColor={user?.isPhoneVerified ? colors.success : colors.accent}
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
              style={[styles.logoutBtn, { borderColor: colors.destructive }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              <Text style={[styles.logoutText, { color: colors.destructive }]}>
                Sign Out
              </Text>
            </Pressable>

            <Pressable
              style={[styles.deleteAccountBtn, { borderColor: colors.destructive, backgroundColor: `${colors.destructive}12` }]}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              <Text style={[styles.deleteAccountText, { color: colors.destructive }]}>
                Delete Account
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Organiser Modal */}
      <Modal visible={showOrganizerModal} transparent animationType="slide" onRequestClose={() => setShowOrganizerModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOrganizerModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="megaphone" size={32} color="#fff" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Become an organizer</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              List your events, manage bookings, and reach thousands of people near you. It is free to get started.
            </Text>
            <View style={styles.modalFeatures}>
              {["Create and manage events", "Publish free or paid tickets", "View attendee analytics"].map((f) => (
                <View key={f} style={styles.modalFeatureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[styles.modalFeatureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={[styles.modalCta, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowOrganizerModal(false);
                router.push("/business/register" as any);
              }}
            >
              <Text style={styles.modalCtaText}>Get Started as Organizer</Text>
            </Pressable>
            <Pressable onPress={() => setShowOrganizerModal(false)}>
              <Text style={[styles.modalDismiss, { color: colors.mutedForeground }]}>Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ColorModeSwitcher({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { preference, setPreference } = useTheme();
  const options: { id: ThemePreference; label: string }[] = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.modeLabel}>
        <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="contrast-outline" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>Appearance</Text>
      </View>
      <View style={[styles.modeOptions, { backgroundColor: colors.secondary }]}>
        {options.map((option) => {
          const selected = preference === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setPreference(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.modeOption,
                selected && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                  fontSize: 13,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  organizerHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  organizerHeaderBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  becomeOrganizerBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  becomeOrganizerBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  bannerCtaPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  bannerCtaPillText: { color: "#007AFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
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
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteAccountText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  // Guest
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  guestAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  signInBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  modeRow: {
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  modeLabel: { flexDirection: "row", alignItems: "center", gap: 12 },
  modeOptions: { flexDirection: "row", borderRadius: 12, padding: 3 },
  modeOption: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  // Organiser banner
  organiserBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16 },
  organiserBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  organiserBannerTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  organiserBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: "center", gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  modalFeatures: { alignSelf: "stretch", gap: 10, marginVertical: 4 },
  modalFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalFeatureText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalCta: { alignSelf: "stretch", alignItems: "center", paddingVertical: 16, borderRadius: 999 },
  modalCtaText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  modalDismiss: { fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
});
