import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { LoveProfileCard } from "@/components/LoveProfileCard";
import { Skeleton } from "@/components/SkeletonLoader";
import { AgeRangeSheet } from "@/components/love/AgeRangePicker";
import { DiscoveryFilters } from "@/components/love/DiscoveryFilters";
import { useConnectionActions } from "@/components/love/ConnectionRequests";
import { useLoveConnect } from "@/components/love/UpgradePrompt";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useLoveAgeRangeMatches } from "@/hooks/useLoveAgeRangeMatches";
import { formatAgeRange } from "@/utils/findLoveAgeRange";
import {
  activeFilterCount,
  defaultFiltersFor,
  filterProfiles,
  type DiscoveryFilters as Filters,
} from "@/utils/findLoveDiscovery";
import { countryName } from "@/utils/findLoveProfile";

/** FindLove's Home tab: the people grid with like, filters and search. */
export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profiles, isLoading, error, refreshProfiles, getConnectionStatus } = useLoveProfiles();
  const { connect, upgradePrompt } = useLoveConnect();
  const { accept } = useConnectionActions();
  const { myProfile, accountType } = useMyLoveProfile();
  const country = myProfile?.country;
  const interestedIn = myProfile?.interestedIn;
  const savedAgeMin = myProfile?.ageRange?.min;
  const savedAgeMax = myProfile?.ageRange?.max;
  const savedAgeRange = useMemo(
    () => (savedAgeMin !== undefined && savedAgeMax !== undefined ? { min: savedAgeMin, max: savedAgeMax } : undefined),
    [savedAgeMin, savedAgeMax],
  );
  // The grid starts on the member's "Interested in" choice and saved age range.
  const defaultFilters = useMemo(() => defaultFiltersFor(interestedIn, savedAgeRange), [interestedIn, savedAgeRange]);
  const place = countryName(country);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [ageSheetOpen, setAgeSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const deferredQuery = useDeferredValue(query);
  const ageSearch = useLoveAgeRangeMatches(country, filters.ageRange);
  // Compact cards: two per row on phones, more as the screen widens.
  const columns = width >= 960 ? 4 : width >= 600 ? 3 : 2;
  const horizontalPadding = width < 360 ? 12 : 16;
  const gridWidth = Math.min(width - horizontalPadding * 2, MAX_GRID_WIDTH);
  const cellWidth = (gridWidth - GRID_GAP * (columns - 1)) / columns;

  const filteredProfiles = useMemo(() => {
    const shown = filterProfiles(profiles, { ...filters, query: deferredQuery });
    // Age is matched on the server; only the ids it returned are shown.
    if (!filters.ageRange) return shown;
    return ageSearch.ids ? shown.filter((profile) => ageSearch.ids!.has(profile.id)) : [];
  }, [profiles, filters, deferredQuery, ageSearch.ids]);
  const filtering = activeFilterCount(filters, defaultFilters) > 0 || !!query.trim();
  const ageSearching = !!filters.ageRange && ageSearch.loading;

  // The profile can load (or the choices change) after the screen mounts.
  useEffect(() => {
    setFilters((current) => ({ ...current, gender: defaultFilters.gender, ageRange: defaultFilters.ageRange }));
  }, [defaultFilters]);

  const refreshAll = () => {
    void refreshProfiles();
    ageSearch.retry();
  };

  const clearFilters = () => {
    setQuery("");
    setFilters(defaultFilters);
  };

  const toggleSearch = () => {
    if (searchOpen) setQuery("");
    setSearchOpen((open) => !open);
  };

  const openUpgrade = () => {
    router.push({ pathname: "/love/membership", params: { from: "upgrade" } } as any);
  };

  const openNotifications = () => {
    router.push("/love/notifications" as any);
  };

  const openProfile = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const openChat = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/chat/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const renderProfile = useCallback(({ item }: { item: LoveProfile }) => (
    <View style={[styles.cardCell, { width: cellWidth }]}>
      <LoveProfileCard
        profile={item}
        connectionStatus={getConnectionStatus(item.id)}
        onOpen={() => openProfile(item)}
        onConnect={() => void (getConnectionStatus(item.id) === "received" ? accept(item) : connect(item))}
        onMessage={() => openChat(item)}
      />
    </View>
  ), [accept, cellWidth, connect, getConnectionStatus, openChat, openProfile]);

  const topBar = (
    <HomeTopBar
      searchOpen={searchOpen}
      onSearch={toggleSearch}
      onNotifications={openNotifications}
      // Private members already have everything; only Public members see the upgrade.
      onUpgrade={accountType === "private" ? undefined : openUpgrade}
    />
  );

  if (isLoading && profiles.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {topBar}
        <View style={[styles.loadingContent, { paddingHorizontal: horizontalPadding }]}>
          <Skeleton height={38} borderRadius={19} />
          {[0, 1].map((row) => (
            <View key={row} style={[styles.columnRow, styles.loadingGap]}>
              <Skeleton width={cellWidth} height={cellWidth + 110} borderRadius={16} />
              <Skeleton width={cellWidth} height={cellWidth + 110} borderRadius={16} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {topBar}
      <FlatList
        key={`love-grid-${columns}`}
        data={filteredProfiles}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={renderProfile}
        columnWrapperStyle={styles.columnRow}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshAll} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {searchOpen ? (
              <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search username, area, interests..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoFocus
                  accessibilityLabel="Search Love profiles"
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <DiscoveryFilters filters={filters} onChange={setFilters} onOpenAgeRange={() => setAgeSheetOpen(true)} />

            {filters.ageRange && ageSearch.error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{ageSearch.error}</Text>
                <Pressable onPress={ageSearch.retry} hitSlop={8}>
                  <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
                <Pressable onPress={() => void refreshProfiles()} hitSlop={8}>
                  <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.resultsRow}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>{filtering ? "Results" : place ? `People in ${place}` : "People to discover"}</Text>
              {ageSearching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          // Don't say "no one" before the age search has answered.
          ageSearching && !ageSearch.ids ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="heart-dislike-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No profiles found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filtering
                ? "Try another username, interest, or filter."
                : filters.ageRange
                  ? `No one aged ${formatAgeRange(filters.ageRange)} here yet. Try a wider age range.`
                  : `No one${place ? ` in ${place}` : ""} is on FindLove yet. Check back soon.`}
            </Text>
            {filtering ? (
              <Pressable onPress={clearFilters}>
                <Text style={[styles.resetText, { color: colors.primary }]}>Clear filters</Text>
              </Pressable>
            ) : filters.ageRange ? (
              <Pressable onPress={() => setAgeSheetOpen(true)}>
                <Text style={[styles.resetText, { color: colors.primary }]}>Change age range</Text>
              </Pressable>
            ) : null}
          </View>
          )
        }
      />
      <AgeRangeSheet
        visible={ageSheetOpen}
        value={filters.ageRange}
        saved={savedAgeRange}
        onApply={(ageRange) => {
          setAgeSheetOpen(false);
          setFilters((current) => ({ ...current, ageRange }));
        }}
        onClose={() => setAgeSheetOpen(false)}
      />
      {upgradePrompt}
    </View>
  );
}

/** FindLove brand on the left; search, notifications and (for Public members) Upgrade to Private on the right. */
function HomeTopBar({
  searchOpen,
  onSearch,
  onNotifications,
  onUpgrade,
}: {
  searchOpen: boolean;
  onSearch: () => void;
  onNotifications: () => void;
  onUpgrade?: () => void;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 400;
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brand}>
        <Ionicons name="heart" size={22} color={colors.primary} />
        <Text style={[styles.brandText, { color: colors.foreground }]}>FindLove</Text>
      </View>
      <Pressable
        onPress={onSearch}
        hitSlop={6}
        style={[styles.topIcon, { backgroundColor: searchOpen ? colors.primary : colors.card, borderColor: searchOpen ? colors.primary : colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={searchOpen ? "Close search" : "Search"}
        accessibilityState={{ expanded: searchOpen }}
      >
        <Ionicons name={searchOpen ? "close" : "search-outline"} size={20} color={searchOpen ? "#FFFFFF" : colors.foreground} />
      </Pressable>
      <Pressable
        onPress={onNotifications}
        hitSlop={6}
        style={[styles.topIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
      </Pressable>
      {onUpgrade ? (
        <Pressable
          onPress={onUpgrade}
          hitSlop={6}
          style={({ pressed }) => [styles.upgrade, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Private"
        >
          <Ionicons name="diamond" size={14} color="#1A1300" />
          <Text style={styles.upgradeText} numberOfLines={1}>{compact ? "Private" : "Upgrade to Private"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const GRID_GAP = 12;
const MAX_GRID_WIDTH = 1080;

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 6 },
  brand: { flex: 1, flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  upgrade: { flexDirection: "row", alignItems: "center", gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#D4A017" },
  upgradeText: { fontSize: 12, color: "#1A1300", fontFamily: "Inter_700Bold" },
  brandText: { fontSize: 22, letterSpacing: -0.6, fontFamily: "Inter_700Bold" },
  topIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  listContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  loadingContent: { width: "100%", maxWidth: MAX_GRID_WIDTH, alignSelf: "center", paddingTop: 4 },
  loadingGap: { marginTop: 18 },
  header: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingBottom: 10 },
  searchBox: { minHeight: 52, marginTop: 6, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingHorizontal: 10, paddingVertical: 12 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultsRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4, marginBottom: 13 },
  resultsTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  columnRow: { flexDirection: "row", gap: GRID_GAP, maxWidth: MAX_GRID_WIDTH, width: "100%", alignSelf: "center" },
  cardCell: { alignSelf: "stretch" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 18 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 7, textAlign: "center" },
  resetText: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 18 },
});
