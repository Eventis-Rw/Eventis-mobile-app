import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryPill } from "@/components/CategoryPill";
import { EventCard } from "@/components/EventCard";
import { HomeDiscovery, SectionHeading } from "@/components/HomeDiscovery";
import { EventCardSkeleton } from "@/components/SkeletonLoader";
import { StoriesBar } from "@/components/StoriesBar";
import { EVENT_GROUP_LABELS, getEventGroup, type EventGroup } from "@/constants/eventPresentation";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useLocationPermission } from "@/hooks/useLocationPermission";

const PAGE_SIZE = 3;

export default function HomeScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events, categories, isLoading, error, refreshEvents } = useEvents();
  const location = useLocationPermission();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);

  const orderedEvents = useMemo(() => [...events].sort((first, second) => {
    const dateDifference = eventTimestamp(first.date, first.time) - eventTimestamp(second.date, second.time);
    if (dateDifference !== 0) return dateDifference;
    return location.status === "granted" ? first.distance - second.distance : 0;
  }), [events, location.status]);

  const featuredId = orderedEvents[0]?.id;
  const filtered = useMemo(() => orderedEvents.filter((event) => (
    event.id !== featuredId && (selectedCategory === "All" || event.category === selectedCategory)
  )), [featuredId, orderedEvents, selectedCategory]);
  const visibleEvents = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const groupCounts = useMemo(() => filtered.reduce<Record<EventGroup, number>>((counts, event) => {
    const group = getEventGroup(event);
    counts[group] += 1;
    return counts;
  }, { today: 0, tomorrow: 0, weekend: 0, upcoming: 0 }), [filtered]);
  const showSkeletons = isLoading && !refreshing;

  const openSearch = useCallback(() => router.push("/search"), [router]);
  const openOrganizer = useCallback(() => setShowOrganizerModal(true), []);
  const selectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const loadMore = useCallback(() => {
    if (isLoading || refreshing || visibleCount >= filtered.length) return;
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
  }, [filtered.length, isLoading, refreshing, visibleCount]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  const listHeader = (
    <>
      {error && !events.length ? (
        <StateMessage icon="cloud-offline-outline" title="Couldn't load events" text="Check your connection and try again." actionLabel="Try again" onAction={refreshEvents} />
      ) : showSkeletons ? (
        <View style={styles.loadingWrap}><EventCardSkeleton inset={16} /><EventCardSkeleton inset={16} /></View>
      ) : events.length ? (
        <HomeDiscovery
          events={orderedEvents}
          onOpenSearch={openSearch}
          onOpenOrganizer={openOrganizer}
          stories={(
            <View style={styles.storiesSection}>
              <SectionHeading title="The city is talking" subtitle="Fresh updates from organizers you follow" />
              <StoriesBar user={user} onOpenBecomeOrganizer={openOrganizer} />
            </View>
          )}
        />
      ) : (
        <StateMessage icon="calendar-clear-outline" title="No events yet" text="New events will show up here as soon as they're published." actionLabel="Refresh" onAction={refreshEvents} />
      )}

      {events.length ? (
        <View style={styles.exploreSection}>
          <SectionHeading title="Events by when" subtitle="Start with today, tomorrow or your coming weekend" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
            {categories.map((category) => (
              <CategoryPill key={category} category={category} isSelected={selectedCategory === category} onPress={selectCategory} />
            ))}
          </ScrollView>
          <View style={styles.feedHeading}>
            <View>
              <Text style={[styles.feedTitle, { color: colors.foreground }]}>Your upcoming shortlist</Text>
              <Text style={[styles.feedCount, { color: colors.mutedForeground }]}>Showing {Math.min(visibleEvents.length, filtered.length)} of {filtered.length} upcoming</Text>
            </View>
            <View style={[styles.recommendationBadge, { backgroundColor: `${colors.primary}16` }]}>
              <Ionicons name="calendar-clear" size={12} color={colors.primary} />
              <Text style={[styles.recommendationText, { color: colors.primary }]}>SOONEST FIRST</Text>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient pointerEvents="none" colors={scheme === "dark" ? ["#172149", "#070814", "#070814"] : ["#D9E6FF", "#F4F7FF", "#E8EEF8"]} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: scheme === "dark" ? "rgba(7,8,20,0.96)" : "rgba(244,247,255,0.97)", borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.push("/(tabs)/profile" as never)} accessibilityRole="button" accessibilityLabel="View profile" style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.border }]}>
            {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarLetter}>{user?.username?.charAt(0).toUpperCase() ?? "E"}</Text>}
          </Pressable>
          <View style={styles.welcomeCopy}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()},</Text>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{user?.username ?? "Explorer"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={21} color={colors.foreground} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={13} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.mutedForeground }]}>Kigali, Rwanda</Text>
          <Ionicons name="chevron-down" size={13} color={colors.mutedForeground} />
        </View>
        <Pressable onPress={openSearch} accessibilityRole="search" accessibilityLabel="Search events" style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={19} color={colors.mutedForeground} />
          <Text style={[styles.searchText, { color: colors.mutedForeground }]}>Search events, venues, organizers...</Text>
          <View style={[styles.searchFilter, { backgroundColor: colors.primary }]}><Ionicons name="options" size={16} color="#FFFFFF" /></View>
        </Pressable>
      </View>

      <FlatList
        data={showSkeletons ? [] : visibleEvents}
        keyExtractor={(event) => event.id}
        renderItem={({ item, index }) => {
          const group = getEventGroup(item);
          const previousGroup = index > 0 ? getEventGroup(visibleEvents[index - 1]) : null;
          return (
            <>
              {group !== previousGroup ? <EventGroupHeader group={group} count={groupCounts[group]} /> : null}
              <EventCard event={item} variant="feed" inset={0} />
            </>
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!showSkeletons && events.length && !filtered.length ? (
          <StateMessage icon="search-outline" title={`No ${selectedCategory} events`} text="Try another category or browse everything." actionLabel="Show all events" onAction={() => selectCategory("All")} compact />
        ) : null}
        ListFooterComponent={visibleEvents.length ? <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{visibleCount < filtered.length ? "Keep scrolling for the next three" : "You're all caught up"}</Text> : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 128 : 126 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <OrganizerModal visible={showOrganizerModal} onClose={() => setShowOrganizerModal(false)} onContinue={() => { setShowOrganizerModal(false); router.push("/business/register" as never); }} />
    </View>
  );
}

function EventGroupHeader({ group, count }: { group: EventGroup; count: number }) {
  const colors = useColors();
  const copy = EVENT_GROUP_LABELS[group];
  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupCopy}>
        <Text style={[styles.groupTitle, { color: colors.foreground }]}>{copy.title}</Text>
        <Text style={[styles.groupSubtitle, { color: colors.mutedForeground }]}>{copy.subtitle}</Text>
      </View>
      <View style={[styles.groupCount, { backgroundColor: `${colors.primary}16` }]}>
        <Text style={[styles.groupCountText, { color: colors.primary }]}>{count} {count === 1 ? "event" : "events"}</Text>
      </View>
    </View>
  );
}

function StateMessage({ icon, title, text, actionLabel, onAction, compact = false }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string; actionLabel: string; onAction: () => void; compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <View style={[styles.stateIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name={icon} size={30} color={colors.primary} /></View>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{text}</Text>
      <Pressable onPress={onAction} accessibilityRole="button" style={[styles.stateButton, { backgroundColor: colors.primary }]}><Text style={styles.stateButtonText}>{actionLabel}</Text></Pressable>
    </View>
  );
}

function OrganizerModal({ visible, onClose, onContinue }: { visible: boolean; onClose: () => void; onContinue: () => void }) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.modalIcon, { backgroundColor: `${colors.primary}1F` }]}><Ionicons name="megaphone" size={28} color={colors.primary} /></View>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create the moment everyone talks about</Text>
          <Text style={[styles.modalText, { color: colors.mutedForeground }]}>Publish events, reach new audiences, manage bookings and follow your performance.</Text>
          <View style={styles.modalFeatures}>
            {["Create and promote events", "Manage tickets and attendees", "See audience insights"].map((item) => (
              <View key={item} style={styles.modalFeature}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={[styles.modalFeatureText, { color: colors.foreground }]}>{item}</Text></View>
            ))}
          </View>
          <Pressable onPress={onContinue} accessibilityRole="button" style={[styles.modalPrimary, { backgroundColor: colors.primary }]}><Text style={styles.modalPrimaryText}>Become an organizer</Text></Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.modalSecondary}><Text style={[styles.modalSecondaryText, { color: colors.mutedForeground }]}>Maybe later</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function eventTimestamp(date: string, time: string) {
  const value = new Date(`${date}T${time || "00:00"}:00`).getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 2 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 44, height: 44, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarLetter: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  welcomeCopy: { flex: 1, gap: 1 },
  greeting: { fontSize: 11, fontFamily: "Inter_500Medium" },
  userName: { fontSize: 20, letterSpacing: -0.4, fontFamily: "Inter_800ExtraBold" },
  notificationButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notificationDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, top: 9, right: 9, backgroundColor: "#FF4D67", borderWidth: 1.5, borderColor: "#FFFFFF" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 55, marginTop: -2, marginBottom: 10 },
  locationText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  searchBar: { minHeight: 50, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 8, gap: 9 },
  searchText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchFilter: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listContent: { flexGrow: 1 },
  storiesSection: { paddingTop: 30 },
  loadingWrap: { paddingTop: 18 },
  exploreSection: { paddingTop: 34 },
  categoryContent: { paddingHorizontal: 16, paddingBottom: 18 },
  feedHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14, gap: 12 },
  feedTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  feedCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  recommendationBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  recommendationText: { fontSize: 8, letterSpacing: 0.65, fontFamily: "Inter_700Bold" },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 11 },
  groupCopy: { flex: 1, minWidth: 0 },
  groupTitle: { fontSize: 22, lineHeight: 27, fontFamily: "Inter_800ExtraBold", letterSpacing: -0.45 },
  groupSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  groupCount: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  groupCountText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  footerText: { textAlign: "center", paddingTop: 8, paddingBottom: 26, fontSize: 12, fontFamily: "Inter_500Medium" },
  state: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 58, gap: 10 },
  stateCompact: { paddingVertical: 32 },
  stateIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stateTitle: { textAlign: "center", fontSize: 19, fontFamily: "Inter_700Bold" },
  stateText: { textAlign: "center", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  stateButton: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, marginTop: 6 },
  stateButtonText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 420, borderRadius: 28, borderWidth: 1, padding: 22 },
  modalIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  modalTitle: { fontSize: 25, lineHeight: 30, letterSpacing: -0.5, fontFamily: "Inter_800ExtraBold" },
  modalText: { fontSize: 13, lineHeight: 20, marginTop: 8, fontFamily: "Inter_400Regular" },
  modalFeatures: { gap: 10, marginVertical: 20 },
  modalFeature: { flexDirection: "row", alignItems: "center", gap: 9 },
  modalFeatureText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalPrimary: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalPrimaryText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  modalSecondary: { alignItems: "center", paddingVertical: 13 },
  modalSecondaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
