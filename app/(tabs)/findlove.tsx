import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { FindLoveQuickActions } from "@/components/FindLoveQuickActions";
import { LoveProfileCard } from "@/components/LoveProfileCard";
import { Skeleton } from "@/components/SkeletonLoader";
import type { LoveGender, LoveProfile } from "@/constants/loveProfiles";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useColors } from "@/hooks/useColors";

type GenderFilter = "All" | LoveGender;
const FILTERS: GenderFilter[] = ["All", "She", "He", "They"];

export default function FindLoveScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profiles, isLoading, error, refreshProfiles, getConnectionStatus, sendConnectionRequest } = useLoveProfiles();
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("All");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const columns = width >= 960 ? 3 : width >= 620 ? 2 : 1;
  const horizontalPadding = width < 360 ? 16 : 20;
  const headerTop = Platform.OS === "web" ? 68 : insets.top;

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesGender = genderFilter === "All" || profile.gender === genderFilter;
      if (!matchesGender) return false;
      if (!deferredQuery) return true;
      const searchable = [
        profile.name,
        profile.gender,
        profile.city,
        profile.occupation,
        profile.bio,
        ...profile.interests,
      ].join(" ").toLowerCase();
      return searchable.includes(deferredQuery);
    });
  }, [profiles, genderFilter, deferredQuery]);

  const openProfile = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const connect = useCallback((profile: LoveProfile) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendConnectionRequest(profile.id);
  }, [sendConnectionRequest]);

  const renderProfile = useCallback(({ item }: { item: LoveProfile }) => (
    <View style={styles.cardCell}>
      <LoveProfileCard
        profile={item}
        connectionStatus={getConnectionStatus(item.id)}
        onOpen={() => openProfile(item)}
        onConnect={() => connect(item)}
      />
    </View>
  ), [connect, getConnectionStatus, openProfile]);

  if (isLoading && profiles.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: headerTop + 12 }]}>
        <View style={[styles.loadingContent, { paddingHorizontal: horizontalPadding }]}>
          <Skeleton width={160} height={32} />
          <Skeleton height={50} borderRadius={16} style={styles.loadingGap} />
          <Skeleton height={400} borderRadius={24} style={styles.loadingGap} />
          <Skeleton height={400} borderRadius={24} style={styles.loadingGap} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        key={`love-grid-${columns}`}
        data={filteredProfiles}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={renderProfile}
        columnWrapperStyle={columns > 1 ? styles.columnRow : undefined}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerTop + 12, paddingHorizontal: horizontalPadding, paddingBottom: Platform.OS === "web" ? 110 : insets.bottom + 108 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refreshProfiles()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>FIND YOUR PERSON</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Find Love</Text>
              </View>
              <View style={[styles.heartMark, { backgroundColor: colors.glass }]}>
                <Ionicons name="heart" size={24} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Meet people who enjoy the same events, places, and moments as you.</Text>

            <FindLoveQuickActions />

            <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, city, interests..."
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((filter) => {
                const selected = genderFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setGenderFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.filterChip,
                      { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border },
                    ]}
                  >
                    <Text style={[styles.filterText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{filter}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

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
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>People to discover</Text>
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try another name, interest, or filter.</Text>
            <Pressable onPress={() => { setQuery(""); setGenderFilter("All"); }}>
              <Text style={[styles.resetText, { color: colors.primary }]}>Clear filters</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { flexGrow: 1 },
  loadingContent: { width: "100%", maxWidth: 720, alignSelf: "center" },
  loadingGap: { marginTop: 18 },
  header: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 11, letterSpacing: 1.7, fontFamily: "Inter_700Bold" },
  title: { marginTop: 3, fontSize: 34, letterSpacing: -1.2, fontFamily: "Inter_700Bold" },
  heartMark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  subtitle: { maxWidth: 560, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: 7 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginTop: 20 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingHorizontal: 10, paddingVertical: 12 },
  filters: { gap: 9, paddingVertical: 14 },
  filterChip: { minWidth: 66, height: 38, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
