import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
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
import { FindLoveIntro } from "@/components/love/FindLoveIntro";
import { SectionState } from "@/components/profile/ProfileSection";
import { Skeleton } from "@/components/SkeletonLoader";
import { DiscoveryFilters } from "@/components/love/DiscoveryFilters";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { useLoveConnect } from "@/components/love/UpgradePrompt";
import { PeopleStrip } from "@/components/love/PeopleStrip";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useColors } from "@/hooks/useColors";
import { FIND_LOVE_ENABLED } from "@/services/findLoveService";
import { describeAgeVerification, isAgeVerified } from "@/utils/findLoveAgeVerification";
import {
  activeFilterCount,
  DEFAULT_DISCOVERY_FILTERS,
  filterProfiles,
  presenceOf,
  type DiscoveryFilters as Filters,
} from "@/utils/findLoveDiscovery";

// The tab stays reachable by link, so it needs its own guard.
export default function FindLoveTab() {
  if (!FIND_LOVE_ENABLED) return <Redirect href="/(tabs)" />;
  return <FindLoveGate />;
}

// Members see the intro until they have a FindLove profile of their own, then
// the ID age check until the server says they're verified.
function FindLoveGate() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { user } = useAuth();
  const { myProfile, status, error, reload, verification } = useMyLoveProfile();
  if (myProfile && isAgeVerified(verification)) return <FindLoveScreen />;
  if (myProfile) return <AgeCheckGate />;
  // Signed-out visitors also get the intro; "Get started" asks them to sign in.
  if (status === "ready" || !user) return <FindLoveIntro />;
  return (
    <View style={[styles.root, styles.gateState, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 68 : insets.top) + 24 }]}>
      {status === "error" ? (
        <SectionState kind="error" message={error ?? "We couldn't load FindLove."} onRetry={() => void reload()} />
      ) : (
        <SectionState kind="loading" message="Opening FindLove…" />
      )}
    </View>
  );
}

/** Shown instead of discovery until the member's ID age check is approved. */
function AgeCheckGate() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { verification } = useMyLoveProfile();
  const copy = describeAgeVerification(verification);
  const rejected = verification.status === "rejected";
  return (
    <View style={[styles.root, styles.gateState, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 68 : insets.top) + 24 }]}>
      <SectionState
        kind="empty"
        icon={rejected ? "hand-left-outline" : "shield-checkmark-outline"}
        title={copy.title}
        message={copy.message}
        actionLabel={
          rejected ? undefined : verification.status === "not_started" || verification.status === "failed" ? copy.action ?? undefined : "View status"
        }
        onAction={rejected ? undefined : () => router.push("/love/verify" as any)}
      />
    </View>
  );
}

function FindLoveScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profiles, isLoading, error, refreshProfiles, getConnectionStatus } = useLoveProfiles();
  const { myProfile, accountType } = useMyLoveProfile();
  const { connect, upgradePrompt } = useLoveConnect();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_DISCOVERY_FILTERS);
  const deferredQuery = useDeferredValue(query);
  const columns = width >= 960 ? 3 : width >= 620 ? 2 : 1;
  const horizontalPadding = width < 360 ? 16 : 20;
  const headerTop = Platform.OS === "web" ? 68 : insets.top;
  const myNeighborhood = myProfile?.neighborhood;

  const filteredProfiles = useMemo(
    () => filterProfiles(profiles, { ...filters, query: deferredQuery }),
    [profiles, filters, deferredQuery],
  );
  const onlineProfiles = useMemo(() => profiles.filter((profile) => presenceOf(profile) === "online"), [profiles]);
  const nearbyProfiles = useMemo(
    () => (myNeighborhood ? filterProfiles(profiles, { ...DEFAULT_DISCOVERY_FILTERS, neighborhood: myNeighborhood }) : []),
    [profiles, myNeighborhood],
  );
  const filtering = activeFilterCount(filters) > 0 || !!query.trim();
  const clearFilters = () => {
    setQuery("");
    setFilters(DEFAULT_DISCOVERY_FILTERS);
  };

  const openProfile = useCallback((profile: LoveProfile) => {
    router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any);
  }, [router]);

  const renderProfile = useCallback(({ item }: { item: LoveProfile }) => (
    <View style={styles.cardCell}>
      <LoveProfileCard
        profile={item}
        connectionStatus={getConnectionStatus(item.id)}
        onOpen={() => openProfile(item)}
        onConnect={() => void connect(item)}
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
              <Pressable
                onPress={() => router.push("/love/edit" as any)}
                style={[styles.heartMark, { backgroundColor: colors.glass }]}
                accessibilityRole="button"
                accessibilityLabel="My FindLove profile"
              >
                <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Meet people who enjoy the same events, places, and moments as you.</Text>

            <Pressable
              onPress={() => router.push(accountType === "private" ? ("/love/edit" as any) : { pathname: "/love/membership", params: { from: "upgrade" } } as any)}
              style={[styles.myAccount, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={accountType === "private" ? "Your account is Private" : "Your account is Public. Upgrade to Private"}
            >
              <Text style={[styles.myAccountText, { color: colors.mutedForeground }]} numberOfLines={1}>
                @{myProfile?.username}
              </Text>
              <MembershipBadge type={accountType} size="sm" />
              <View style={styles.flexSpacer} />
              {accountType === "public" ? (
                <Text style={[styles.myAccountAction, { color: colors.primary }]}>Upgrade</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>

            <FindLoveQuickActions />

            {/* The strips are shortcuts; hide them while the member is searching or filtering. */}
            {!filtering ? (
              <>
                <PeopleStrip
                  title="Online now"
                  subtitle={onlineProfiles.length ? `${onlineProfiles.length} online` : undefined}
                  profiles={onlineProfiles}
                  onOpen={openProfile}
                />
                <PeopleStrip
                  title={myNeighborhood ? `Near you in ${myNeighborhood}` : "People near you"}
                  profiles={nearbyProfiles}
                  onOpen={openProfile}
                  empty={
                    <Pressable
                      onPress={() => router.push("/love/edit" as any)}
                      style={[styles.nearbyEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="location-outline" size={20} color={colors.primary} />
                      <Text style={[styles.nearbyEmptyText, { color: colors.mutedForeground }]}>
                        {myNeighborhood
                          ? `Nobody else in ${myNeighborhood} yet. Check back soon.`
                          : "Add your neighbourhood to your profile to see people near you."}
                      </Text>
                      {!myNeighborhood ? <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /> : null}
                    </Pressable>
                  }
                />
              </>
            ) : null}

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
  gateState: { paddingHorizontal: 16 },
  nearbyEmpty: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, padding: 14 },
  nearbyEmptyText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  listContent: { flexGrow: 1 },
  loadingContent: { width: "100%", maxWidth: 720, alignSelf: "center" },
  loadingGap: { marginTop: 18 },
  header: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 11, letterSpacing: 1.7, fontFamily: "Inter_700Bold" },
  title: { marginTop: 3, fontSize: 34, letterSpacing: -1.2, fontFamily: "Inter_700Bold" },
  heartMark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  myAccount: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 44, marginTop: 14 },
  myAccountText: { flexShrink: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  myAccountAction: { fontSize: 13, fontFamily: "Inter_700Bold" },
  flexSpacer: { flex: 1 },
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
