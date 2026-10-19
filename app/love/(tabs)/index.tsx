import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
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
import { DiscoveryFilters } from "@/components/love/DiscoveryFilters";
import { LoveHeader } from "@/components/love/LoveHeader";
import { useLoveConnect } from "@/components/love/UpgradePrompt";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useColors } from "@/hooks/useColors";
import {
  activeFilterCount,
  DEFAULT_DISCOVERY_FILTERS,
  filterProfiles,
  type DiscoveryFilters as Filters,
} from "@/utils/findLoveDiscovery";

/** FindLove's landing tab: search, filters and the people grid. */
export default function DiscoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profiles, isLoading, error, refreshProfiles, getConnectionStatus } = useLoveProfiles();
  const { connect, upgradePrompt } = useLoveConnect();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_DISCOVERY_FILTERS);
  const deferredQuery = useDeferredValue(query);
  const columns = width >= 960 ? 3 : width >= 620 ? 2 : 1;
  const horizontalPadding = width < 360 ? 16 : 20;

  const filteredProfiles = useMemo(
    () => filterProfiles(profiles, { ...filters, query: deferredQuery }),
    [profiles, filters, deferredQuery],
  );
  const filtering = activeFilterCount(filters) > 0 || !!query.trim();

  const clearFilters = () => {
    setQuery("");
    setFilters(DEFAULT_DISCOVERY_FILTERS);
  };

  const openProfile = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const openChat = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/chat/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const renderProfile = useCallback(({ item }: { item: LoveProfile }) => (
    <View style={styles.cardCell}>
      <LoveProfileCard
        profile={item}
        connectionStatus={getConnectionStatus(item.id)}
        onOpen={() => openProfile(item)}
        onConnect={() => void connect(item)}
        onMessage={() => openChat(item)}
      />
    </View>
  ), [connect, getConnectionStatus, openChat, openProfile]);

  if (isLoading && profiles.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LoveHeader title="Discover" />
        <View style={[styles.loadingContent, { paddingHorizontal: horizontalPadding }]}>
          <Skeleton height={50} borderRadius={16} />
          <Skeleton height={400} borderRadius={24} style={styles.loadingGap} />
          <Skeleton height={400} borderRadius={24} style={styles.loadingGap} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="Discover" />
      <FlatList
        key={`love-grid-${columns}`}
        data={filteredProfiles}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={renderProfile}
        columnWrapperStyle={columns > 1 ? styles.columnRow : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refreshProfiles()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
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
                accessibilityLabel="Search Love profiles"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            <DiscoveryFilters filters={filters} onChange={setFilters} />

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
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>{filtering ? "Results" : "People to discover"}</Text>
              <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>{filteredProfiles.length} profiles</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="heart-dislike-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No profiles found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try another username, interest, or filter.</Text>
            <Pressable onPress={clearFilters}>
              <Text style={[styles.resetText, { color: colors.primary }]}>Clear filters</Text>
            </Pressable>
          </View>
        }
      />
      {upgradePrompt}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  loadingContent: { width: "100%", maxWidth: 720, alignSelf: "center", paddingTop: 4 },
  loadingGap: { marginTop: 18 },
  header: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingBottom: 10 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingHorizontal: 10, paddingVertical: 12 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultsRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4, marginBottom: 13 },
  resultsTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  resultsCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  columnRow: { gap: 14, maxWidth: 1080, width: "100%", alignSelf: "center" },
  cardCell: { flex: 1, minWidth: 0, maxWidth: 500, alignSelf: "stretch" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 18 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 7, textAlign: "center" },
  resetText: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 18 },
});
