import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CustomerOverview,
  EventManagementActions,
  PublishedEventsList,
  PublisherOverview,
} from "@/components/profile/ProfileActivity";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileCard, ProfileNavRow, ProfileSection, SectionState } from "@/components/profile/ProfileSection";
import { ProfileTabBar } from "@/components/profile/ProfileTabBar";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import { useProfileData } from "@/hooks/useProfileData";
import type { ProfileTab } from "@/utils/accountCapabilities";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const profile = useProfileData();
  const capabilities = useAccountCapabilities();
  const { openOrganiserFlow } = useOrganiserAccess();
  const [refreshing, setRefreshing] = useState(false);

  const { profileTabs } = capabilities;
  // `?tab=` deep links into a section; anything the account can't see falls back to Overview.
  const resolveTab = useCallback(
    (key?: string): ProfileTab => profileTabs.find((t) => t.key === key)?.key ?? "overview",
    [profileTabs],
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => resolveTab(params.tab));

  useEffect(() => {
    setActiveTab((current) => resolveTab(params.tab ?? current));
  }, [params.tab, resolveTab]);

  const selectTab = useCallback(
    (tab: ProfileTab) => {
      setActiveTab(tab);
      router.setParams({ tab });
    },
    [router],
  );

  const headerTop = Platform.OS === "web" ? 67 : insets.top;
  const openSettings = () => router.push("/(tabs)/settings" as any);
  const openEditProfile = () => router.push("/profile/edit" as any);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([profile.refresh(), capabilities.refreshVerification()]);
    } finally {
      setRefreshing(false);
    }
  };

  const topBar = (
    <View
      style={[
        styles.topBar,
        { paddingTop: headerTop + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/" as any))}
        hitSlop={8}
        style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
        Profile
      </Text>
      <Pressable
        onPress={openSettings}
        hitSlop={8}
        style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Ionicons name="settings-outline" size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );

  if (profile.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {topBar}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>Loading your profile…</Text>
        </View>
      </View>
    );
  }

  if (!profile.isAuthenticated || !profile.user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {topBar}
        <View style={styles.centered}>
          <View style={[styles.guestAvatar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Sign in to see your profile</Text>
          <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>
            Your tickets, bookings and events live here once you're signed in.
          </Text>
          <Pressable
            onPress={() => router.push("/auth/login" as any)}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Sign In / Register</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { user, accountType } = profile;
  const publisherProps = {
    publishedEvents: profile.publishedEvents,
    eventsLoading: profile.eventsLoading,
    eventsError: profile.eventsError,
    onRetryEvents: () => void profile.refreshEvents(),
    canManage: capabilities.canManageEvents,
  };

  const moreCard = (
    <ProfileSection title="More">
      <ProfileCard>
        {capabilities.isPublisher ? (
          <ProfileNavRow
            icon="ticket-outline"
            label="My tickets"
            sublabel={`${profile.upcomingTickets.length} upcoming`}
            onPress={() => router.push("/(tabs)/tickets" as any)}
          />
        ) : (
          <ProfileNavRow
            icon="megaphone-outline"
            label="Become an organiser"
            sublabel="Publish your own events on Eventis"
            onPress={() => openOrganiserFlow()}
          />
        )}
        <ProfileNavRow
          icon="settings-outline"
          label="Settings"
          sublabel="Account, notifications and privacy"
          onPress={openSettings}
        />
      </ProfileCard>
    </ProfileSection>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            {capabilities.isPublisher ? (
              <PublisherOverview organisation={profile.organisation} onSelectTab={selectTab} {...publisherProps} />
            ) : (
              <CustomerOverview
                upcomingTickets={profile.upcomingTickets}
                pastBookings={profile.pastBookings}
                savedEventsCount={profile.savedEvents.length}
                isLoading={profile.bookingsLoading}
                onSelectTab={selectTab}
              />
            )}
            {moreCard}
          </>
        );
      case "published":
        return (
          <PublishedEventsList
            events={profile.publishedEvents}
            isLoading={profile.eventsLoading}
            error={profile.eventsError}
            onRetry={publisherProps.onRetryEvents}
            canManage={capabilities.canManageEvents}
          />
        );
      case "manage":
        return <EventManagementActions includeOrganisation={accountType === "business"} />;
      default:
        // TEMPORARY: bookings, tickets, saved organisers, reviews and analytics
        // tabs are built in the next subtasks.
        return (
          <SectionState
            kind="empty"
            icon="construct-outline"
            title="Coming next"
            message="This section is being built."
          />
        );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {topBar}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 104 : 110 }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerWrap}>
          <ProfileHeader
            user={user}
            accountType={accountType}
            organisation={profile.organisation}
            location={profile.location}
            verificationStatus={capabilities.businessVerification}
            onEditProfile={openEditProfile}
          />
        </View>

        <ProfileTabBar tabs={profileTabs} active={activeTab} onChange={selectTab} />

        <View style={styles.tabBody}>
          {renderTab()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  headerWrap: { paddingTop: 16, paddingBottom: 12 },
  tabBody: { paddingTop: 16, gap: 22 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  centeredText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  guestAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  primaryBtn: { marginTop: 8, paddingHorizontal: 24, minHeight: 48, justifyContent: "center", borderRadius: 14 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
