import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { EventCard } from "@/components/EventCard";
import { GlassSurface } from "@/components/GlassSurface";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";

export default function SettingsScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, logout, deleteAccount, isAuthenticated } = useAuth();
  const { bookings } = useBookings();
  const { events } = useEvents();

  const [activeSection, setActiveSection] = useState<"settings" | "saved">("settings");
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // User interactive preference states (reflect immediately)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [nearMeAlerts, setNearMeAlerts] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [attendanceVisible, setAttendanceVisible] = useState(true);

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
        <GlassSurface
          style={[
            styles.header,
            {
              paddingTop: headerTop + 8,
              borderWidth: 0,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
              borderRadius: 0,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </GlassSurface>
        <View style={styles.guestContainer}>
          <View style={[styles.guestAvatar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>You're browsing as a guest</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Sign in to save events, book tickets, and manage your preferences.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
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
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === "dark"
            ? ["#1A2458", "#070814", colors.background]
            : ["#D9E6FF", "#E8EEF8", colors.background]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* HEADER */}
      <GlassSurface
        style={[
          styles.header,
          {
            paddingTop: headerTop + 8,
            borderWidth: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            borderRadius: 0,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
          <Pressable
            onPress={() =>
              user?.isBusinessAccount
                ? router.push("/business/dashboard" as any)
                : setShowOrganizerModal(true)
            }
            style={({ pressed }) => [
              styles.organizerHeaderBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            <Text style={styles.organizerHeaderBtnText}>
              {user?.isBusinessAccount ? "Organiser portal" : "Become an organiser"}
            </Text>
          </Pressable>
        </View>
      </GlassSurface>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* AVATAR & USER PROFILE CARD */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}
        >
          <GlassSurface style={styles.profileCard}>
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
                    <Text style={[styles.verifiedText, { color: colors.primary }]}>Organiser</Text>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.becomeOrganizerBadgeBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => setShowOrganizerModal(true)}
                  >
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                    <Text style={styles.becomeOrganizerBadgeText}>Become an organiser</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </GlassSurface>
        </Animated.View>

        {/* STATS STRIP */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          style={styles.statsRow}
        >
          {stats.map((stat, i) => (
            <GlassSurface key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </GlassSurface>
          ))}
        </Animated.View>

        {/* ORGANISER HUB SHORTCUT */}
        {user?.isBusinessAccount ? (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(130).springify() : undefined}>
            <Pressable
              style={({ pressed }) => [
                styles.portalSwitch,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/business/dashboard" as any)}
              accessibilityRole="button"
            >
              <View style={styles.organiserBannerLeft}>
                <View style={[styles.portalSwitchIcon, { backgroundColor: `${colors.primary}1F` }]}>
                  <Ionicons name="briefcase" size={20} color={colors.primary} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.portalSwitchTitle, { color: colors.foreground }]}>
                    Switch to Organiser Portal
                  </Text>
                  <Text style={[styles.portalSwitchSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    Manage {user.organisation?.name ?? user.businessName ?? "your organisation"}
                  </Text>
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(130).springify() : undefined}>
            <Pressable
              style={({ pressed }) => [
                styles.organiserBanner,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => setShowOrganizerModal(true)}
            >
              <View style={styles.organiserBannerLeft}>
                <Ionicons name="megaphone-outline" size={22} color="#fff" />
                <View>
                  <Text style={styles.organiserBannerTitle}>Become an Organiser</Text>
                  <Text style={styles.organiserBannerSub}>Host your own events on Eventis</Text>
                </View>
              </View>
              <View style={styles.bannerCtaPill}>
                <Text style={styles.bannerCtaPillText}>Get Started</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* SECTION TABS: SETTINGS vs SAVED */}
        <View style={[styles.sectionTabs, { backgroundColor: colors.secondary }]}>
          {(["settings", "saved"] as const).map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [
                styles.sectionTab,
                activeSection === s && [styles.activeSectionTab, { backgroundColor: colors.card }],
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                setActiveSection(s);
              }}
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
                    fontFamily: activeSection === s ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {s === "saved" ? `Saved (${savedEvents.length})` : "Settings"}
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
              <Ionicons name="bookmark-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved events</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the bookmark icon on any event card to save it here for later.
              </Text>
            </View>
          )
        ) : (
          /* ORGANIZED SETTINGS GROUPS */
          <View style={styles.groupedSettings}>
            {/* GROUP 1: ACCOUNT & SECURITY */}
            <View style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                ACCOUNT & SECURITY
              </Text>
              <GlassSurface style={styles.groupCard}>
                <SettingRow
                  icon="person-outline"
                  label="Edit Profile"
                  sublabel="Update display name, avatar, bio"
                  onPress={() => router.push("/profile/edit" as any)}
                  colors={colors}
                />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="phone-portrait-outline"
                  label="Phone Verification"
                  sublabel={user?.isPhoneVerified ? user?.phone ?? "Verified" : "Verify for tickets & purchases"}
                  onPress={() =>
                    router.push({
                      pathname: "/auth/otp",
                      params: { purpose: "register" },
                    } as any)
                  }
                  colors={colors}
                  badge={user?.isPhoneVerified ? "Verified" : "Verify"}
                  badgeColor={user?.isPhoneVerified ? colors.success : colors.primary}
                />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="shield-checkmark-outline"
                  label="Privacy & Security"
                  sublabel="Manage public visibility and data"
                  onPress={() => setShowPrivacyModal(true)}
                  colors={colors}
                />
              </GlassSurface>
            </View>

            {/* GROUP 2: PREFERENCES & DISPLAY */}
            <View style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                PREFERENCES & DISPLAY
              </Text>
              <GlassSurface style={styles.groupCard}>
                <ColorModeSwitcher colors={colors} />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.toggleRow}>
                  <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}16` }]}>
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                      Event Reminders
                    </Text>
                    <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>
                      Alerts 2 hours before your booked events
                    </Text>
                  </View>
                  <Switch
                    value={pushNotifications}
                    onValueChange={(val) => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      setPushNotifications(val);
                    }}
                    trackColor={{ false: colors.secondary, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.toggleRow}>
                  <View style={[styles.settingIcon, { backgroundColor: "#10B98116" }]}>
                    <Ionicons name="location-outline" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                      Nearby Event Alerts
                    </Text>
                    <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>
                      Recommended pop-ups and live fests near you
                    </Text>
                  </View>
                  <Switch
                    value={nearMeAlerts}
                    onValueChange={(val) => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      setNearMeAlerts(val);
                    }}
                    trackColor={{ false: colors.secondary, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </GlassSurface>
            </View>

            {/* GROUP 3: SUPPORT & LEGAL */}
            <View style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                SUPPORT & LEGAL
              </Text>
              <GlassSurface style={styles.groupCard}>
                <SettingRow
                  icon="help-circle-outline"
                  label="Help & Support"
                  sublabel="Contact Eventis team or report an issue"
                  onPress={() => Linking.openURL("mailto:support@eventis.app")}
                  colors={colors}
                />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="document-text-outline"
                  label="Terms & Privacy Policy"
                  sublabel="Our community rules and guidelines"
                  onPress={() => Linking.openURL("https://eventis.app/terms")}
                  colors={colors}
                />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <SettingRow
                  icon="play-circle-outline"
                  label="Preview Onboarding Flow"
                  sublabel="Replay initial welcome presentation"
                  onPress={() => router.push("/presentation-splash" as any)}
                  colors={colors}
                />
              </GlassSurface>
            </View>

            {/* GROUP 4: SESSION & ACCOUNT ACTIONS */}
            <View style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                SESSION ACTIONS
              </Text>
              <View style={styles.sessionButtonsCol}>
                <Pressable
                  style={({ pressed }) => [
                    styles.logoutBtn,
                    {
                      borderColor: "rgba(239,68,68,0.4)",
                      backgroundColor: pressed ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)",
                    },
                  ]}
                  onPress={handleLogout}
                  accessibilityRole="button"
                >
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  <Text style={[styles.logoutText, { color: "#EF4444" }]}>Sign Out</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteAccountBtn,
                    {
                      borderColor: "rgba(239,68,68,0.25)",
                      backgroundColor: pressed ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.04)",
                    },
                  ]}
                  onPress={handleDeleteAccount}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[styles.deleteAccountText, { color: "#EF4444" }]}>
                    Delete Account Permanently
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
              Eventis Mobile v1.0.0 · Kigali, Rwanda
            </Text>
          </View>
        )}
      </ScrollView>

      {/* PRIVACY & SECURITY MODAL */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPrivacyModal(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: "#0F172A",
                borderColor: "rgba(255,255,255,0.12)",
                paddingBottom: insets.bottom + 24,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
            <View style={[styles.modalIconWrap, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Privacy Preferences</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              You have full control over what other event-goers see on your profile.
            </Text>

            <View style={styles.privacyTogglesList}>
              <View style={[styles.privacyToggleRow, { borderColor: "rgba(255,255,255,0.08)" }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Public Profile</Text>
                  <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>
                    Allow other attendees to see your profile name and avatar
                  </Text>
                </View>
                <Switch
                  value={publicProfile}
                  onValueChange={setPublicProfile}
                  trackColor={{ false: colors.secondary, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.privacyToggleRow, { borderColor: "rgba(255,255,255,0.08)" }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                    Show in Attendance List
                  </Text>
                  <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>
                    Display your avatar in the attendees strip on events you join
                  </Text>
                </View>
                <Switch
                  value={attendanceVisible}
                  onValueChange={setAttendanceVisible}
                  trackColor={{ false: colors.secondary, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <Pressable
              style={[styles.modalCta, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalCtaText}>Save & Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ORGANISER ONBOARDING MODAL */}
      <Modal
        visible={showOrganizerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrganizerModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowOrganizerModal(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: "#0F172A",
                borderColor: `${colors.primary}44`,
                borderWidth: 1,
                borderBottomWidth: 0,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
            <View style={[styles.modalIconWrap, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Host Events on Eventis</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Publish your festivals, nightlife, workshops, and business summits with seamless Mobile Money ticketing.
            </Text>

            <View style={styles.modalFeatures}>
              <View style={styles.modalFeatureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
                <Text style={[styles.modalFeatureText, { color: colors.foreground }]}>
                  Flexible passes: Daily, Weekly, or Monthly
                </Text>
              </View>
              <View style={styles.modalFeatureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
                <Text style={[styles.modalFeatureText, { color: colors.foreground }]}>
                  Instant MTN MoMo & Airtel Money payouts
                </Text>
              </View>
              <View style={styles.modalFeatureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
                <Text style={[styles.modalFeatureText, { color: colors.foreground }]}>
                  Verified Organiser badge & top feed placement
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.modalCta,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                setShowOrganizerModal(false);
                router.push("/organiser" as any);
              }}
            >
              <Text style={styles.modalCtaText}>Explore Organiser Plans</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowOrganizerModal(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
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
  const options: { id: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "system", label: "Auto", icon: "phone-portrait-outline" },
    { id: "light", label: "Light", icon: "sunny-outline" },
    { id: "dark", label: "Dark", icon: "moon-outline" },
  ];

  return (
    <View style={styles.themeRow}>
      <View style={styles.themeLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}16` }]}>
          <Ionicons name="contrast-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Appearance</Text>
          <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]}>
            Theme displays immediately
          </Text>
        </View>
      </View>
      <View style={[styles.modeOptions, { backgroundColor: colors.secondary }]}>
        {options.map((option) => {
          const selected = preference === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                setPreference(option.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.modeOption,
                selected && { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={13}
                color={selected ? "#FFFFFF" : colors.mutedForeground}
              />
              <Text
                style={{
                  color: selected ? "#FFFFFF" : colors.mutedForeground,
                  fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                  fontSize: 12,
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
  sublabel,
  onPress,
  colors,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        pressed && { backgroundColor: "rgba(255,255,255,0.05)" },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.settingTextCol}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.settingSublabel, { color: colors.mutedForeground }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  organizerHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  organizerHeaderBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 18 },

  // Profile Card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    gap: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarLetter: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  becomeOrganizerBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  becomeOrganizerBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 18,
    gap: 3,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Organiser banner
  organiserBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
  },
  organiserBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  organiserBannerTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  organiserBannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bannerCtaPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  bannerCtaPillText: { color: "#0284C7", fontSize: 12, fontFamily: "Inter_700Bold" },

  portalSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  portalSwitchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  portalSwitchTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  portalSwitchSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Tabs
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTabText: { fontSize: 13 },

  // Empty state
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 19,
  },

  // Grouped Settings
  groupedSettings: { gap: 20 },
  groupSection: { gap: 8 },
  groupTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  rowDivider: { height: 1, marginLeft: 62 },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextCol: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  settingSublabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  settingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  settingBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Toggle Row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },

  // Theme row
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  themeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  modeOptions: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 3 },
  modeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },

  // Session
  sessionButtonsCol: { gap: 10 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteAccountText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  versionText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 6,
  },

  // Guest
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  guestAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  signInBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, padding: 24, alignItems: "center", gap: 12 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, marginBottom: 8 },
  modalIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  modalFeatures: { alignSelf: "stretch", gap: 10, marginVertical: 8 },
  modalFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalFeatureText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalCta: { alignSelf: "stretch", alignItems: "center", paddingVertical: 16, borderRadius: 16 },
  modalCtaText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  modalDismiss: { fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 8 },

  privacyTogglesList: { alignSelf: "stretch", gap: 12, marginTop: 10 },
  privacyToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
});
