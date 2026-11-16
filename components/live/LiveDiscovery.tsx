import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { mainTabBarHeight } from "@/constants/tabLayout";
import type { LiveListing } from "@/services/liveDirectoryService";
import type { LivePerson, LiveRoom } from "@/services/liveState";

const palette = {
  background: "#101019", card: "#1A1A28", featured: "#1D1732",
  text: "#F5F3FB", muted: "#BAB6CC", red: "#EC2042", line: "#FFFFFF0B",
};
const avatarTones = [
  { background: "#B398FF", foreground: "#28154D" },
  { background: "#4ED2C1", foreground: "#103D3D" },
  { background: "#FFD06C", foreground: "#443108" },
  { background: "#FF97BC", foreground: "#4B1830" },
  { background: "#8FB5FF", foreground: "#142F5E" },
];
function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
}

function DiscoveryAvatar({ person, featured, tone }: {
  person: LivePerson; featured: boolean; tone: number;
}) {
  const [failed, setFailed] = useState(false);
  const color = avatarTones[tone % avatarTones.length];
  const size = featured ? 116 : 72;
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "E";
  return (
    <View style={[styles.avatarRing, featured && styles.featuredAvatar]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color.background }]}>
        <Text style={{ color: color.foreground, fontFamily: "Inter_700Bold", fontSize: featured ? 38 : 26 }}>{initials}</Text>
        {person.avatar && !failed ? <Image source={{ uri: person.avatar }} onError={() => setFailed(true)} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
    </View>
  );
}

function LiveTile({ title, host, featured = false, viewers, tone, disabled, label, onPress }: {
  title: string; host: LivePerson; featured?: boolean; viewers: number;
  tone: number; disabled?: boolean; label: string; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile, featured ? styles.featuredTile : styles.smallTile,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {featured ? <View style={styles.tileTop}>
        <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>Top live</Text></View>
        <View style={styles.viewPill}>
          <Ionicons name="eye-outline" size={13} color={palette.muted} />
          <Text style={styles.views}>{formatViewers(viewers)}</Text>
        </View>
      </View> : null}
      <DiscoveryAvatar key={`${host.id}:${host.avatar ?? ""}`} person={host} featured={featured} tone={tone} />
      <View style={styles.tileDetails}>
        <Text numberOfLines={1} style={[styles.hostName, featured && styles.featuredName]}>{host.name}</Text>
        <Text numberOfLines={1} style={[styles.tileTitle, featured && styles.featuredTitle]}>{title}</Text>
        {!featured ? <View style={styles.watching}>
          <Ionicons name="eye-outline" size={12} color={palette.muted} />
          <Text style={styles.views}>{formatViewers(viewers)} watching</Text>
        </View> : null}
      </View>
    </Pressable>
  );
}

export function LiveDiscovery({ rooms, busy, onHost, onRoom, liveRooms = [], liveLoading = false, liveError = "", onWatch, onRefresh, onWallet, onDemo, children }: {
  rooms: LiveRoom[]; busy: boolean; onHost: () => void; onRoom: (room: LiveRoom) => void;
  liveRooms?: LiveListing[]; liveLoading?: boolean; liveError?: string;
  onWatch?: (room: LiveListing) => void; onRefresh?: () => void;
  onWallet?: () => void; onDemo?: () => void; children?: React.ReactNode;
}) {
  const insets = useAppSafeAreaInsets();
  const focused = useIsFocused();
  const tabHeight = mainTabBarHeight(insets.bottom);
  // Real broadcasts take priority; local interactive previews fill the remaining cards.
  // Preview counts are display fixtures and never enter the broadcast directory or analytics.
  const cards = [
    ...liveRooms.map(room => ({
      id: `live:${room.id}`, title: room.title, host: room.host, viewers: room.viewers,
      label: `Watch ${room.host.name}: ${room.title}`, disabled: !onWatch,
      onPress: () => onWatch?.(room),
    })),
    ...rooms.map(room => ({
      id: `demo:${room.id}`, title: room.title, host: room.host,
      viewers: room.previewViewers ?? room.audience.length,
      label: `Open Live: ${room.title}`, disabled: busy,
      onPress: () => onRoom(room),
    })),
  ].slice(0, 5);
  const [featured, ...otherCards] = cards;
  return (
    <View style={styles.root}>
      {focused ? <StatusBar style="light" /> : null}
      <LinearGradient pointerEvents="none" colors={["#2B2050", "#13111F", palette.background, "#29121E"]} locations={[0, 0.24, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={liveLoading} onRefresh={onRefresh} tintColor={palette.red} colors={[palette.red]} /> : undefined}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 29, paddingBottom: 124 + tabHeight }]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Live Now</Text>
          <View accessibilityLabel={`${cards.length} live rooms`} style={styles.countBadge}>
            <View style={styles.liveDot} /><Text style={styles.countText}>{cards.length} live</Text>
          </View>
        </View>
        {liveLoading && !featured ? <View style={styles.loading}><ActivityIndicator color={palette.red} /><Text style={styles.stateText}>Finding live broadcasts…</Text></View> : null}
        {featured ? <LiveTile {...featured} featured tone={0} /> : null}
        {otherCards.length ? <View style={styles.grid}>{otherCards.map((card, index) => (
          <LiveTile key={card.id} {...card} tone={index + 1} />
        ))}</View> : null}
        {!liveLoading && !featured ? <View style={styles.stateCard}>
          <Ionicons name="radio-outline" size={23} color="#FF718B" />
          <View style={styles.flex}><Text style={styles.stateTitle}>Be the first to go live</Text><Text style={styles.stateText}>Share a moment from your event.</Text></View>
        </View> : null}
        {children}
        {liveError ? <View style={styles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={22} color={palette.muted} />
          <Text accessibilityRole="alert" style={[styles.stateText, styles.flex]}>{liveError}</Text>
          {onRefresh ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading live broadcasts" onPress={onRefresh} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable> : null}
        </View> : null}
        {onWallet || onDemo ? <View style={styles.footerTools}>
          {onWallet ? <Pressable accessibilityRole="button" accessibilityLabel="Open coin wallet" onPress={onWallet} style={styles.footerButton}><Ionicons name="wallet-outline" size={16} color={palette.muted} /><Text style={styles.stateText}>Wallet</Text></Pressable> : null}
          {onDemo ? <Pressable accessibilityRole="button" onPress={onDemo} style={styles.footerButton}><Ionicons name="flask-outline" size={16} color={palette.muted} /><Text style={styles.stateText}>Test controls</Text></Pressable> : null}
        </View> : null}
      </ScrollView>
      <View pointerEvents="box-none" style={[styles.hostDock, { bottom: tabHeight }]}>
        <LinearGradient pointerEvents="none" colors={["#10101900", "#101019E8", palette.background]} style={StyleSheet.absoluteFill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Go Live" onPress={onHost} style={({ pressed }) => [styles.goLive, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <Ionicons name="radio" size={21} color="#FFF" /><Text style={styles.goLiveText}>Go Live</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  content: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 },
  title: { color: palette.text, fontSize: 32, letterSpacing: -1.1, fontFamily: "Inter_700Bold", flexShrink: 1 },
  countBadge: { flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#242435", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF506C" },
  countText: { color: palette.text, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  tile: { alignItems: "center", borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 2 },
  featuredTile: { width: "100%", borderRadius: 28, minHeight: 250, padding: 16, paddingBottom: 20, backgroundColor: palette.featured, borderColor: "#514268", gap: 14 },
  smallTile: { width: "48%", minHeight: 166, borderRadius: 24, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8, gap: 4 },
  tileTop: { position: "absolute", top: 15, left: 15, right: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredBadge: { backgroundColor: "#3C305A", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  featuredBadgeText: { color: "#DED3F7", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  viewPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#110F20", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 },
  avatarRing: { borderColor: "#FF506C", borderWidth: 3, borderRadius: 100, padding: 3, marginBottom: 3 },
  featuredAvatar: { marginTop: 22 },
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  liveBadge: { backgroundColor: palette.red, position: "absolute", alignSelf: "center", bottom: -5, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  liveBadgeText: { color: "#FFF", fontSize: 10, fontFamily: "Inter_800ExtraBold" },
  tileDetails: { alignItems: "center", width: "100%", gap: 3 },
  hostName: { color: palette.text, fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: -0.4, maxWidth: "100%" },
  featuredName: { fontSize: 21, letterSpacing: -0.6 },
  tileTitle: { color: palette.muted, fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: "100%" },
  featuredTitle: { fontSize: 14 },
  watching: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  views: { color: "#DFDCEB", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stateCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, backgroundColor: "#1B1929", borderWidth: 1, borderColor: palette.line },
  flex: { flex: 1, gap: 3 },
  stateTitle: { color: palette.text, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stateText: { color: palette.muted, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  loading: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 36 },
  retry: { minHeight: 40, paddingHorizontal: 14, backgroundColor: palette.red, borderRadius: 20, justifyContent: "center" },
  retryText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  footerTools: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20, marginTop: 60 },
  footerButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 },
  hostDock: { position: "absolute", left: 0, right: 0, paddingTop: 34, paddingBottom: 12, alignItems: "center" },
  goLive: { minWidth: 148, minHeight: 56, paddingHorizontal: 28, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 32, backgroundColor: palette.red, shadowColor: palette.red, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, shadowOpacity: 0.5, elevation: 10 },
  goLiveText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
