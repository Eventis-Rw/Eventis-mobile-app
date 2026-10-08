import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Image,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { CategoryPill } from "@/components/CategoryPill";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/SkeletonLoader";
import { StoriesBar } from "@/components/StoriesBar";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import { DEMO_POST_ORDER } from "@/constants/featuredDemoPosts";

const PAGE_PADDING = 20;
const FEED_PAGE_SIZE = 6;

type EventsView = "nearby" | "all";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events, categories, isLoading, error, refreshEvents } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const location = useLocationPermission();
  const measuredHeaderHeight = useSharedValue(0);
  const headerProgress = useSharedValue(1);
  const [headerHeight, setHeaderHeight] = useState(0);
  const lastScrollY = useRef(0);
  const scrollDirectionDistance = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);
  const headerHidden = useRef(false);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const measured = measuredHeaderHeight.value;
    return {
      transform: [
        { translateY: -(measured + 4) * (1 - headerProgress.value) },
      ],
    };
  });

  const setHeaderVisible = useCallback((visible: boolean) => {
    if (headerHidden.current === !visible) return;
    headerHidden.current = !visible;
    headerProgress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 240 : 210,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [headerProgress]);

  const handleFeedScroll = useCallback((event: any) => {
    const nextY = Math.max(event.nativeEvent.contentOffset.y, 0);
    const delta = nextY - lastScrollY.current;

    if (nextY <= 8) {
      scrollDirectionDistance.current = 0;
      scrollDirection.current = null;
      setHeaderVisible(true);
    } else if (Math.abs(delta) >= 1.5) {
      const nextDirection = delta > 0 ? "down" : "up";

      if (scrollDirection.current !== nextDirection) {
        scrollDirection.current = nextDirection;
        scrollDirectionDistance.current = 0;
      }

      scrollDirectionDistance.current += Math.abs(delta);

      if (
        nextDirection === "down" &&
        nextY > 56 &&
        scrollDirectionDistance.current >= 44
      ) {
        setHeaderVisible(false);
        scrollDirectionDistance.current = 0;
      } else if (
        nextDirection === "up" &&
        headerHidden.current &&
        scrollDirectionDistance.current >= 64
      ) {
        setHeaderVisible(true);
        scrollDirectionDistance.current = 0;
      }
    }

    lastScrollY.current = nextY;
  }, [setHeaderVisible]);

  // Pull-to-refresh shows its own spinner, so skeletons are for the first load only.
  const showSkeletons = isLoading && !refreshing;

  const filtered = useMemo(() => {
    const list =
      selectedCategory === "All"
        ? events
        : events.filter((e) => e.category === selectedCategory);
    return [...list].sort((a, b) => {
      const first = DEMO_POST_ORDER.indexOf(a.id);
      const second = DEMO_POST_ORDER.indexOf(b.id);
      if (first >= 0 || second >= 0) {
        return (first < 0 ? Infinity : first) - (second < 0 ? Infinity : second);
      }
      return location.status === "granted" ? a.distance - b.distance : 0;
    });
  }, [events, selectedCategory, location.status]);
  const onRefresh = useCallback(async () => {
    setVisibleCount(FEED_PAGE_SIZE);
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  const selectCategory = useCallback((category: string) => {
    setVisibleCount(FEED_PAGE_SIZE);
    setSelectedCategory(category);
  }, []);
  const visibleEvents = useMemo(
    () => showSkeletons ? [] : filtered.slice(0, visibleCount),
    [filtered, visibleCount, showSkeletons],
  );
  const loadMore = useCallback(() => {
    if (isLoading || refreshing) return;
    setVisibleCount((count) => Math.min(count + FEED_PAGE_SIZE, filtered.length));
  }, [isLoading, refreshing, filtered.length]);

  const openSearch = useCallback(() => {
    router.push("/search");
  }, [router]);

  const renderBody = () => {
    if (error && !events.length) {
      return (
        <StateMessage
          icon="cloud-offline-outline"
          title="Couldn't load events"
          text="Check your connection and try again."
          actionLabel="Try again"
          onAction={refreshEvents}
        />
      );
    }

    if (!showSkeletons && !events.length) {
      return (
        <StateMessage
          icon="calendar-clear-outline"
          title="No events yet"
          text="New events will show up here as soon as they're published."
          actionLabel="Refresh"
          onAction={refreshEvents}
        />
      );
    }

    return (
      <>
        {/* Instagram-style Stories Bar replacing Featured and Nearby */}
        <StoriesBar
          user={user}
          onOpenBecomeOrganizer={() => setShowOrganizerModal(true)}
        />

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.bleed, styles.categoryScroll]}
          contentContainerStyle={styles.bleedContent}
        >
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              category={cat}
              isSelected={selectedCategory === cat}
              onPress={selectCategory}
            />
          ))}
        </ScrollView>


        {/* Instagram-style Posts Feed */}
        {showSkeletons ? (
          <View style={styles.feedContainer}>
            <EventCardSkeleton inset={PAGE_PADDING} />
            <EventCardSkeleton inset={PAGE_PADDING} />
          </View>
        ) : !filtered.length ? (
          <StateMessage
            icon="search-outline"
            title={`No ${selectedCategory} events`}
            text="Try another category or browse everything."
            actionLabel="Show all events"
            onAction={() => selectCategory("All")}
            compact
          />
        ) : null}
      </>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          if (height > 0 && Math.abs(height - measuredHeaderHeight.value) > 1) {
            measuredHeaderHeight.value = height;
            setHeaderHeight(height);
          }
        }}
        style={[
          styles.header,
          animatedHeaderStyle,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as any)}
              style={[
                styles.avatarBtn,
                {
                  backgroundColor: user?.avatarUrl ? colors.card : colors.primary,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : user?.username ? (
                <Text style={styles.avatarText}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={20} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              onPress={() =>
                user?.isBusinessAccount
                  ? router.push("/business/register" as any)
                  : setShowOrganizerModal(true)
              }
              style={[
                styles.becomeOrganizerHeaderBtn,
                { backgroundColor: colors.primary, borderRadius: 999 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Become an organizer"
            >
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              <Text style={styles.becomeOrganizerHeaderBtnText}>
                {user?.isBusinessAccount ? "Dashboard" : "Become an organizer"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}
          onPress={openSearch}
          accessibilityRole="search"
          accessibilityLabel="Search events"
        >
          <Ionicons name="search-outline" size={17} color={colors.mutedForeground} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>Search events near you...</Text>
        </Pressable>
      </Animated.View>

      <FlatList
        key={selectedCategory}
        data={visibleEvents}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => (
          <EventCard event={item} variant="feed" inset={PAGE_PADDING} />
        )}
        ListHeaderComponent={renderBody()}
        ListFooterComponent={visibleEvents.length ? (
          <Text style={{ color: colors.mutedForeground, textAlign: "center", paddingVertical: 20 }}>
            {visibleCount < filtered.length ? "Scroll for more events" : "You're all caught up"}
          </Text>
        ) : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
        initialNumToRender={FEED_PAGE_SIZE}
        maxToRenderPerBatch={FEED_PAGE_SIZE}
        windowSize={5}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight || insets.top + 124,
            paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Organiser Modal */}
      <Modal
        visible={showOrganizerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrganizerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOrganizerModal(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary + "55",
                paddingBottom: Math.max(insets.bottom, 16) + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.primary + "80" }]} />
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: colors.primary, borderColor: colors.primary + "66" },
              ]}
            >
              <Ionicons name="megaphone" size={30} color="#fff" />
            </View>
            <Text style={[styles.modalEyebrow, { color: colors.primary }]}>CREATE ON EVENTIS</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Become an organizer</Text>
            <Text
              style={[styles.modalBody, { color: colors.mutedForeground }]}
            >
              Publish events, share live moments, and manage bookings from one focused workspace.
            </Text>
            <View style={styles.modalFeatures}>
              {["Publish and manage events", "Share live event stories", "Track reach and bookings"].map((f) => (
                <View
                  key={f}
                  style={[
                    styles.modalFeatureRow,
                    { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[styles.modalCheck, { backgroundColor: colors.primary + "24" }]}
                  >
                    <Ionicons name="checkmark" size={15} color={colors.primary} />
                  </View>
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
              accessibilityRole="button"
            >
              <Text style={styles.modalCtaText}>Get Started as Organizer</Text>
              <Ionicons name="arrow-forward" size={19} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => setShowOrganizerModal(false)}
              accessibilityRole="button"
              style={styles.modalDismissButton}
            >
              <Text style={[styles.modalDismiss, { color: colors.foreground }]}>Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: EventsView;
  onChange: (view: EventsView) => void;
}) {
  const colors = useColors();
  const options: {
    view: EventsView;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }[] = [
    { view: "nearby", label: "Nearby", icon: "navigate-outline" },
    { view: "all", label: "All Events", icon: "grid-outline" },
  ];
  return (
    <View
      style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = value === option.view;
        const tint = selected ? colors.primaryForeground : colors.mutedForeground;
        return (
          <Pressable
            key={option.view}
            style={[styles.toggleOption, selected && { backgroundColor: colors.primary }]}
            onPress={() => onChange(option.view)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Ionicons name={option.icon} size={14} color={tint} />
            <Text
              style={[
                styles.toggleText,
                { color: tint, fontFamily: selected ? "Inter_600SemiBold" : "Inter_500Medium" },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LocationPrompt({
  onAllow,
  onDismiss,
}: {
  onAllow: () => void;
  onDismiss: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.prompt, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.promptBody}>
        <Ionicons name="location-outline" size={20} color={colors.primary} />
        <View style={styles.promptCopy}>
          <Text style={[styles.promptTitle, { color: colors.foreground }]}>
            See events near you
          </Text>
          <Text style={[styles.promptText, { color: colors.mutedForeground }]}>
            Eventis uses your location to show events happening close to you.
          </Text>
        </View>
      </View>
      <View style={styles.promptActions}>
        <Pressable onPress={onDismiss} accessibilityRole="button" style={styles.promptBtn}>
          <Text style={[styles.promptBtnText, { color: colors.mutedForeground }]}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={onAllow}
          accessibilityRole="button"
          style={[styles.promptBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.promptBtnText, { color: colors.primaryForeground }]}>
            Allow location
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function StateMessage({
  icon,
  title,
  text,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <Ionicons name={icon} size={40} color={colors.border} />
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{text}</Text>
      <Pressable
        style={[styles.stateBtn, { backgroundColor: colors.primary }]}
        onPress={onAction}
        accessibilityRole="button"
      >
        <Text style={[styles.stateBtnText, { color: colors.primaryForeground }]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 8,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  becomeOrganizerHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  becomeOrganizerHeaderBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeading: {
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  browseHeader: {
    alignItems: "center",
  },
  toggle: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  toggleText: {
    fontSize: 13,
  },
  prompt: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  promptBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  promptCopy: {
    flex: 1,
    gap: 2,
  },
  promptTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  promptText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  promptActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  promptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  promptBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  bleed: {
    marginHorizontal: 0,
  },
  bleedContent: {
    paddingHorizontal: PAGE_PADDING,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  state: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  stateCompact: {
    paddingTop: 24,
    paddingBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  stateBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stateBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  feedContainer: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    alignItems: "center",
    gap: 10,
    elevation: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEyebrow: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
  },
  modalTitle: {
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.6,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
  },
  modalBody: {
    maxWidth: 430,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  modalFeatures: {
    alignSelf: "stretch",
    gap: 8,
    marginVertical: 6,
  },
  modalFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  modalCheck: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalFeatureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  modalCta: {
    alignSelf: "stretch",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  modalCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  modalDismissButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalDismiss: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
