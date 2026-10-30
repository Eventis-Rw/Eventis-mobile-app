import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
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
import { GlassSurface } from "@/components/GlassSurface";
import { getEventImage } from "@/constants/eventImages";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import type { LiveListing } from "@/services/liveDirectoryService";
import type { LivePerson, LiveRoom } from "@/services/liveState";
import { LiveAvatar } from "./LivePrimitives";

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n);
}

function LiveTile({
  title,
  host,
  cover,
  mode,
  badge,
  meta,
  disabled,
  label,
  onPress,
}: {
  title: string;
  host: LivePerson;
  cover: string;
  mode: "video" | "voice";
  badge: { text: string; live: boolean };
  meta: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Image
        source={getEventImage(cover)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["#0007", "#0000", "#0000", "#000D"]}
        locations={[0, 0.3, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tileTop}>
        <View style={[styles.badge, { backgroundColor: badge.live ? "#EF4444" : "#0F172ACC" }]}>
          {badge.live ? <View style={styles.dot} /> : null}
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons
            name={mode === "voice" ? "mic" : "eye"}
            size={11}
            color="#FFF"
          />
          <Text style={styles.pillText}>{meta}</Text>
        </View>
      </View>
      <View style={styles.tileBottom}>
        <Text numberOfLines={2} style={styles.tileTitle}>
          {title}
        </Text>
        <View style={styles.hostRow}>
          <LiveAvatar person={host} size={20} />
          <Text numberOfLines={1} style={styles.hostName}>
            {host.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, count }: { title: string; count: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.accent} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
        {count}
      </Text>
    </View>
  );
}

export function LiveDiscovery({
  rooms,
  busy,
  onHost,
  onRoom,
  liveRooms = [],
  liveLoading = false,
  liveError = "",
  onWatch,
  onRefresh,
  onWallet,
  onDemo,
  children,
}: {
  rooms: LiveRoom[];
  busy: boolean;
  onHost: () => void;
  liveRooms?: LiveListing[];
  liveLoading?: boolean;
  liveError?: string;
  onWatch?: (room: LiveListing) => void;
  onRefresh?: () => void;
  onRoom: (room: LiveRoom) => void;
  onWallet?: () => void;
  onDemo?: () => void;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GlassSurface
        style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Live
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: colors.mutedForeground }]}
            >
              Backstage moments, Q&As and community chats
            </Text>
          </View>
          {onWallet ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open coin wallet"
              onPress={onWallet}
              hitSlop={6}
              style={[styles.iconButton, { borderColor: colors.border }]}
            >
              <Ionicons name="wallet-outline" size={19} color={colors.foreground} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Live"
            onPress={onHost}
            style={({ pressed }) => [
              styles.goLive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="radio" size={15} color="#FFF" />
            <Text style={styles.goLiveText}>Go Live</Text>
          </Pressable>
        </View>
      </GlassSurface>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={liveLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={styles.content}
      >
        <SectionHeader title="Live now" count={`${liveRooms.length} live`} />
        {liveError ? (
          <GlassSurface style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={22} color={colors.mutedForeground} />
            <Text
              accessibilityRole="alert"
              style={[styles.stateText, { color: colors.foreground, flex: 1 }]}
            >
              {liveError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRefresh}
              style={[styles.retry, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </GlassSurface>
        ) : null}
        {liveLoading && !liveRooms.length ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : null}
        {!liveLoading && !liveError && !liveRooms.length ? (
          <GlassSurface style={styles.stateCard}>
            <Ionicons name="radio-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.stateTitle, { color: colors.foreground }]}>
                No one is live right now
              </Text>
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                Start a Live to share your event, or pull down to refresh.
              </Text>
            </View>
          </GlassSurface>
        ) : null}
        {liveRooms.length ? (
          <View style={styles.grid}>
            {liveRooms.map((room) => (
              <LiveTile
                key={room.id}
                label={`Watch ${room.host.name}: ${room.title}`}
                title={room.title}
                host={room.host}
                cover={room.event?.image ?? (room.mode === "voice" ? "tech" : "concert")}
                mode={room.mode}
                badge={{ text: "LIVE", live: true }}
                meta={formatViewers(room.viewers)}
                onPress={() => onWatch?.(room)}
              />
            ))}
          </View>
        ) : null}
        {children}
        {rooms.length ? (
          <>
            <SectionHeader title="Try a demo room" count={`${rooms.length} demos`} />
            <Text style={[styles.stateText, { color: colors.mutedForeground, marginTop: -6 }]}>
              Practice chatting and sending gifts. These are not real broadcasts.
            </Text>
            <View style={styles.grid}>
              {rooms.map((room) => (
                <LiveTile
                  key={room.id}
                  label={`Open demo room: ${room.title}`}
                  title={room.title}
                  host={room.host}
                  cover={room.cover ?? (room.mode === "voice" ? "tech" : "concert")}
                  mode={room.mode}
                  badge={{ text: "DEMO", live: false }}
                  meta={room.mode === "voice" ? "Voice" : "Video"}
                  disabled={busy}
                  onPress={() => onRoom(room)}
                />
              ))}
            </View>
          </>
        ) : null}
        {onDemo ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDemo}
            style={styles.footerButton}
          >
            <Ionicons name="flask-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Demo controls
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  goLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EF4444",
  },
  goLiveText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  accent: { width: 3, height: 16, borderRadius: 2, backgroundColor: "#EF4444" },
  sectionTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  tile: {
    width: "48.5%",
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    justifyContent: "space-between",
  },
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFF" },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFF",
    letterSpacing: 0.4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0008",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  tileBottom: { padding: 10, gap: 7 },
  tileTitle: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Inter_700Bold",
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hostName: {
    flex: 1,
    color: "#FFFFFFD9",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  stateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  stateTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stateText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  retry: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: "center" },
  retryText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    minHeight: 44,
  },
});
