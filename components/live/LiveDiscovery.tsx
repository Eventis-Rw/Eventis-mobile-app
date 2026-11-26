import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useTheme } from "@/context/ThemeContext";
import { mainTabBarHeight } from "@/constants/tabLayout";
import { CoinIcon } from "./LiveCoins";
import { BootstrapIcon } from "@/components/icons/BootstrapIcons";
import type { LiveListing } from "@/services/liveDirectoryService";
import type { LivePerson, LiveRoom } from "@/services/liveState";

export interface LiveStreamCardData {
  id: string;
  title: string;
  host: LivePerson;
  viewers: number;
  cover: string;
  eventName?: string;
  tag?: string;
  likes?: string;
  mode?: "video" | "voice";
  onPress: () => void;
  disabled?: boolean;
}

// Active live broadcast streams (Rwandan & Eventis creators currently broadcasting)
const ACTIVE_LIVE_STREAMS: Omit<LiveStreamCardData, "onPress">[] = [
  {
    id: "stream_toxxyk",
    title: "Soundcheck & Live DJ Set at BK Arena Mega Fest 🎧🔥",
    host: {
      id: "host_toxxyk",
      name: "DJ Toxxyk",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    },
    viewers: 2840,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000",
    eventName: "BK Arena Mega Fest 2026",
    tag: "#Afrohouse #LiveMix",
    likes: "14.2k",
    mode: "video",
  },
  {
    id: "stream_melodie",
    title: "Acoustic Rehearsal for Intore Arena Tour 🎸",
    host: {
      id: "host_melodie",
      name: "Bruce Melodie",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    },
    viewers: 1950,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900",
    eventName: "Intore Arena Tour",
    tag: "#Acoustic #KigaliVibes",
    likes: "9.8k",
    mode: "video",
  },
  {
    id: "stream_jazz",
    title: "Backstage VIP Lounge & Live Saxophone Jam 🎷✨",
    host: {
      id: "host_jazz",
      name: "Kigali Jazz Junction",
      avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
    },
    viewers: 1240,
    cover: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900",
    eventName: "Kigali Jazz Festival",
    tag: "#Jazz #Backstage",
    likes: "6.1k",
    mode: "video",
  },
  {
    id: "stream_patriots",
    title: "Courtside Warmups: Patriots BBC vs REG BBC 🏀🔥",
    host: {
      id: "host_patriots",
      name: "BK Arena Sports",
      avatar: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
    },
    viewers: 3120,
    cover: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900",
    eventName: "Rwanda Basketball League",
    tag: "#Patriots #BAL2026",
    likes: "18.5k",
    mode: "video",
  },
  {
    id: "stream_aline",
    title: "Friday Warmup: Deep Afrohouse & Amapiano Vibes 🎛️",
    host: {
      id: "host_aline",
      name: "Aline Umuhoza",
      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
    },
    viewers: 760,
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900",
    eventName: "Kigali Nightlife Live",
    tag: "#Amapiano #Party",
    likes: "4.3k",
    mode: "video",
  },
  {
    id: "stream_charly",
    title: "Exclusive Live Q&A & Tour Announcement 🎙️",
    host: {
      id: "host_charly",
      name: "Charly na Nina",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
    },
    viewers: 890,
    cover: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900",
    eventName: "Women in African Music",
    tag: "#LiveQnA #Kigali",
    likes: "5.7k",
    mode: "voice",
  },
  {
    id: "stream_fashion",
    title: "Runway Backstage: Imigongo Couture Showcase 👗✨",
    host: {
      id: "host_fashion",
      name: "Kigali Fashion Week",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    },
    viewers: 640,
    cover: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900",
    eventName: "Kigali Fashion Week 2026",
    tag: "#Runway #Imigongo",
    likes: "3.1k",
    mode: "video",
  },
];

function formatViewers(n: number) {
  return n >= 1000
    ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`
    : String(n);
}

/** Animated pulsating red beacon */
function PulsingBeacon() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.45,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <View style={styles.beaconWrapper}>
      <Animated.View
        style={[
          styles.beaconPulse,
          {
            transform: [{ scale: anim }],
            opacity: anim.interpolate({
              inputRange: [1, 1.45],
              outputRange: [0.65, 0],
            }),
          },
        ]}
      />
      <View style={styles.beaconDot} />
    </View>
  );
}

/** Featured Hero Live Card */
function FeaturedLiveHero({ card }: { card: LiveStreamCardData }) {
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Featured Live: ${card.title} by ${card.host.name}`}
      onPress={card.onPress}
      style={({ pressed }) => [
        styles.heroCard,
        !isDark && {
          borderColor: "rgba(0, 0, 0, 0.08)",
          shadowColor: "#FF1358",
          shadowOpacity: 0.16,
          shadowRadius: 14,
        },
        { opacity: pressed ? 0.94 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <Image
        source={{
          uri:
            failed || !card.cover
              ? "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000"
              : card.cover,
        }}
        onError={() => setFailed(true)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "rgba(10, 8, 20, 0.45)",
          "rgba(10, 8, 20, 0.15)",
          "rgba(10, 8, 20, 0.92)",
          "#0A0814",
        ]}
        locations={[0, 0.35, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top badges */}
      <View style={styles.heroTopRow}>
        <View style={styles.heroLivePill}>
          <PulsingBeacon />
          <Text style={styles.heroLiveText}>LIVE</Text>
          <View style={styles.heroPillDivider} />
          <BootstrapIcon name="eye" size={13} color="#FFF" />
          <Text style={styles.heroViewerText}>{formatViewers(card.viewers)}</Text>
        </View>

        <View style={styles.heroRightBadges}>
          <View style={styles.heroEventPill}>
            <BootstrapIcon name="broadcast" size={12} color="#FFD700" />
            <Text numberOfLines={1} style={styles.heroEventText}>
              Streaming
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Host & Title details */}
      <View style={styles.heroBottomContent}>
        {/* Host row */}
        <View style={styles.heroHostRow}>
          <View style={styles.heroHostAvatarBorder}>
            <Image
              source={{
                uri:
                  card.host.avatar ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
              }}
              style={styles.heroHostAvatar}
            />
          </View>
          <View style={styles.heroHostMeta}>
            <View style={styles.heroHostNameRow}>
              <Text numberOfLines={1} style={styles.heroHostName}>
                {card.host.name}
              </Text>
              <BootstrapIcon name="check-circle-fill" size={14} color="#38BDF8" />
            </View>
            <Text style={styles.heroHostTag}>
              {card.eventName ?? "Live Broadcast"}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text numberOfLines={2} style={styles.heroTitle}>
          {card.title}
        </Text>

        {/* Watch Button + Likes */}
        <View style={styles.heroActionRow}>
          <View style={styles.heroWatchBtn}>
            <LinearGradient
              colors={["#FF1358", "#FF5722"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroWatchBtnGradient}
            >
              <BootstrapIcon name="play-fill" size={15} color="#FFF" />
              <Text style={styles.heroWatchBtnText}>Watch Live</Text>
            </LinearGradient>
          </View>

          {card.likes ? (
            <View style={styles.heroLikesPill}>
              <BootstrapIcon name="heart-fill" size={13} color="#FF2D55" />
              <Text style={styles.heroLikesText}>{card.likes} likes</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Grid Item for 2-Column Live Streams */
function LiveGridCard({ card }: { card: LiveStreamCardData }) {
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Watch ${card.host.name}: ${card.title}`}
      onPress={card.onPress}
      style={({ pressed }) => [
        styles.gridCard,
        !isDark && {
          backgroundColor: "#FFFFFF",
          borderColor: "rgba(0, 0, 0, 0.08)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        },
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Image
        source={{
          uri:
            failed || !card.cover
              ? "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"
              : card.cover,
        }}
        onError={() => setFailed(true)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "rgba(10, 8, 20, 0.4)",
          "rgba(10, 8, 20, 0.1)",
          "rgba(10, 8, 20, 0.88)",
          "#0D0C18",
        ]}
        locations={[0, 0.3, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top viewer badge */}
      <View style={styles.gridTopRow}>
        <View style={styles.gridLiveBadge}>
          <Text style={styles.gridLiveBadgeText}>LIVE</Text>
        </View>
        <View style={styles.gridViewerPill}>
          <BootstrapIcon name="eye" size={11} color="#FFF" />
          <Text style={styles.gridViewerText}>{formatViewers(card.viewers)}</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={styles.gridBottomInfo}>
        <View style={styles.gridHostRow}>
          <Image
            source={{
              uri:
                card.host.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            }}
            style={styles.gridHostAvatar}
          />
          <Text numberOfLines={1} style={styles.gridHostName}>
            {card.host.name}
          </Text>
          <BootstrapIcon name="check-circle-fill" size={12} color="#38BDF8" />
        </View>

        <Text numberOfLines={2} style={styles.gridTitle}>
          {card.title}
        </Text>

        <View style={styles.gridMetaRow}>
          <Text numberOfLines={1} style={styles.gridTag}>
            {card.tag ?? "#Eventis"}
          </Text>
          {card.likes ? (
            <View style={styles.gridLikes}>
              <BootstrapIcon name="heart-fill" size={11} color="#FF3B5C" />
              <Text style={styles.gridLikesText}>{card.likes}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
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
  coinBalance = 500,
  onWatch,
  onRefresh,
  onWallet,
  onDemo,
  children,
}: {
  rooms: LiveRoom[];
  busy: boolean;
  onHost: () => void;
  onRoom: (room: LiveRoom) => void;
  liveRooms?: LiveListing[];
  liveLoading?: boolean;
  liveError?: string;
  coinBalance?: number;
  onWatch?: (room: LiveListing) => void;
  onRefresh?: () => void;
  onWallet?: () => void;
  onDemo?: () => void;
  children?: React.ReactNode;
}) {
  const insets = useAppSafeAreaInsets();
  const focused = useIsFocused();
  const tabHeight = mainTabBarHeight(insets.bottom);
  const { scheme } = useTheme();
  const isDark = scheme === "dark";

  // Convert real live broadcast listings from backend
  const liveListingsCards: LiveStreamCardData[] = liveRooms.map((room) => ({
    id: `live:${room.id}`,
    title: room.title,
    host: room.host,
    viewers: room.viewers,
    cover:
      room.event?.image ||
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900",
    eventName: room.event?.title,
    mode: room.mode,
    disabled: !onWatch,
    onPress: () => onWatch?.(room),
  }));

  // Convert local interactive rooms
  const interactiveRoomCards: LiveStreamCardData[] = rooms.map((room, idx) => ({
    id: `room:${room.id}`,
    title: room.title,
    host: room.host,
    viewers: room.previewViewers ?? room.audience.length ?? 120 + idx * 85,
    cover:
      room.cover ||
      ACTIVE_LIVE_STREAMS[idx % ACTIVE_LIVE_STREAMS.length].cover,
    eventName:
      ACTIVE_LIVE_STREAMS[idx % ACTIVE_LIVE_STREAMS.length].eventName,
    tag: ACTIVE_LIVE_STREAMS[idx % ACTIVE_LIVE_STREAMS.length].tag,
    likes: ACTIVE_LIVE_STREAMS[idx % ACTIVE_LIVE_STREAMS.length].likes,
    mode: room.mode,
    disabled: busy,
    onPress: () => onRoom(room),
  }));

  // Active community live cards
  const fallbackCards: LiveStreamCardData[] = ACTIVE_LIVE_STREAMS.map(
    (stream, idx) => ({
      ...stream,
      disabled: busy,
      onPress: () => {
        if (rooms[idx]) {
          onRoom(rooms[idx]);
        } else if (onWatch && liveRooms[idx]) {
          onWatch(liveRooms[idx]);
        } else {
          onRoom({
            id: stream.id,
            host: stream.host,
            title: stream.title,
            mode: stream.mode ?? "video",
            cover: stream.cover,
            previewViewers: stream.viewers,
            startedAt: Date.now() - 15 * 60_000,
            endsAt: Date.now() + 45 * 60_000,
            guests: [],
            requests: [],
            invitations: [],
            audience: [],
            mutedIds: [],
            blockedIds: [],
            messages: [],
            chatEnabled: true,
            giftsEnabled: true,
            reactions: 142,
          });
        }
      },
    })
  );

  // Purely those who are LIVE right now
  const liveStreams: LiveStreamCardData[] = [
    ...liveListingsCards,
    ...interactiveRoomCards,
    ...(liveListingsCards.length === 0 && interactiveRoomCards.length === 0
      ? fallbackCards
      : fallbackCards.slice(interactiveRoomCards.length)),
  ];

  const featuredCard = liveStreams[0];
  const gridCards = liveStreams.slice(1);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B0A14" : "#F8FAFC" }]}>
      {focused ? <StatusBar style={isDark ? "light" : "dark"} /> : null}

      {/* Atmospheric ambient background */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["#160E2E", "#0B0A14", "#0D0C18", "#1A0A16"]
            : ["#F1F5F9", "#EDE9FE", "#FFF1F2", "#F8FAFC"]
        }
        locations={[0, 0.28, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={liveLoading}
              onRefresh={onRefresh}
              tintColor="#FF2D55"
              colors={["#FF2D55"]}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 110 + tabHeight,
          },
        ]}
      >
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text accessibilityRole="header" style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              Live
            </Text>
            <View
              style={[
                styles.liveNowPill,
                !isDark && {
                  backgroundColor: "rgba(255, 45, 85, 0.1)",
                  borderColor: "rgba(255, 45, 85, 0.25)",
                },
              ]}
            >
              <PulsingBeacon />
              <Text
                style={[
                  styles.liveNowText,
                  !isDark && { color: "#E11D48" },
                ]}
              >
                {liveStreams.length} LIVE NOW
              </Text>
            </View>
          </View>

          <View style={styles.headerRightGroup}>
            {/* Coins Wallet Pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Coin wallet: ${coinBalance} coins. Tap to recharge.`}
              onPress={onWallet}
              style={({ pressed }) => [
                styles.walletPill,
                !isDark && {
                  backgroundColor: "#FEF3C7",
                  borderColor: "#FDE68A",
                },
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <CoinIcon size={16} />
              <Text
                style={[
                  styles.walletBalanceText,
                  !isDark && { color: "#92400E" },
                ]}
              >
                {coinBalance.toLocaleString("en-US")}
              </Text>
              <View style={styles.walletAddCircle}>
                <Text style={{ color: "#1A1300", fontSize: 13, fontWeight: "800", lineHeight: 15 }}>+</Text>
              </View>
            </Pressable>

            {/* Refresh button */}
            {onRefresh ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh live streams"
                onPress={onRefresh}
                style={({ pressed }) => [
                  styles.iconButton,
                  !isDark && {
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                  },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <BootstrapIcon
                  name="arrow-repeat"
                  size={17}
                  color={isDark ? "#D2D0DF" : "#334155"}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Loading state indicator */}
        {liveLoading && !featuredCard ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#FF2D55" size="large" />
            <Text style={[styles.loadingText, { color: isDark ? "#AAA6C0" : "#64748B" }]}>
              Connecting to live broadcasts…
            </Text>
          </View>
        ) : null}

        {/* Top Live Broadcast Spotlight */}
        {featuredCard ? (
          <View style={styles.heroSection}>
            <FeaturedLiveHero card={featuredCard} />
          </View>
        ) : null}

        {/* Live Broadcasts Grid */}
        {gridCards.length > 0 ? (
          <View style={styles.gridSection}>
            <View style={styles.twoColumnGrid}>
              {gridCards.map((card) => (
                <LiveGridCard key={card.id} card={card} />
              ))}
            </View>
          </View>
        ) : null}

        {children}

        {/* Error notification if API failed */}
        {liveError ? (
          <View style={styles.errorBox}>
            <BootstrapIcon name="info-circle" size={18} color="#FF6B8B" />
            <Text style={styles.errorText}>{liveError}</Text>
            {onRefresh ? (
              <Pressable onPress={onRefresh} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Modern "Go Live" Button */}
      <View
        pointerEvents="box-none"
        style={[styles.floatingDock, { bottom: tabHeight + 14 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start your own live broadcast"
          onPress={onHost}
          style={({ pressed }) => [
            styles.floatingGoLive,
            {
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={["#FF1358", "#FF5722"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingGoLiveGradient}
          >
            <BootstrapIcon name="broadcast" size={20} color="#FFF" />
            <Text style={styles.floatingGoLiveText}>Go Live</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0A14",
  },
  content: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 16,
    gap: 18,
  },
  // Top Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    letterSpacing: -0.8,
    fontFamily: "Inter_800ExtraBold",
  },
  liveNowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 45, 85, 0.16)",
    borderColor: "rgba(255, 45, 85, 0.35)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  liveNowText: {
    color: "#FF3B5C",
    fontSize: 11,
    letterSpacing: 0.6,
    fontFamily: "Inter_700Bold",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 183, 0, 0.14)",
    borderColor: "rgba(245, 183, 0, 0.3)",
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
  },
  walletBalanceText: {
    color: "#FFD84D",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  walletAddCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F5B700",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Beacon
  beaconWrapper: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconPulse: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF2D55",
  },
  beaconDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF2D55",
  },

  // Hero Featured
  heroSection: {
    marginTop: 2,
  },
  heroCard: {
    width: "100%",
    height: 260,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#FF1358",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  heroLiveText: {
    color: "#FF3B5C",
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.6,
  },
  heroPillDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  heroViewerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  heroRightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroEventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 45, 85, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 45, 85, 0.4)",
  },
  heroEventText: {
    color: "#FF506C",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  heroBottomContent: {
    gap: 10,
  },
  heroHostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroHostAvatarBorder: {
    padding: 2,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  heroHostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  heroHostMeta: {
    gap: 2,
  },
  heroHostNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroHostName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  heroHostTag: {
    color: "#D0CEE0",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  heroWatchBtn: {
    borderRadius: 22,
    overflow: "hidden",
  },
  heroWatchBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  heroWatchBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  heroLikesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heroLikesText: {
    color: "#FF6B8B",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // 2-Column Grid
  gridSection: {
    marginTop: 2,
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  gridCard: {
    width: "48.2%",
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#161624",
  },
  gridTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridLiveBadge: {
    backgroundColor: "#FF1358",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  gridLiveBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
  gridViewerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gridViewerText: {
    color: "#FFF",
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
  },
  gridBottomInfo: {
    gap: 5,
  },
  gridHostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gridHostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  gridHostName: {
    color: "#EDEDF5",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  gridTitle: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontFamily: "Inter_700Bold",
    lineHeight: 16,
  },
  gridMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  gridTag: {
    color: "#9F9BAB",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  gridLikes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  gridLikesText: {
    color: "#FF5E7E",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },

  // State / Alerts
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 36,
  },
  loadingText: {
    color: "#AAA6C0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 45, 85, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 45, 85, 0.3)",
  },
  errorText: {
    flex: 1,
    color: "#FFA0B4",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FF2D55",
  },
  retryBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Floating "Go Live"
  floatingDock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  floatingGoLive: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#FF1358",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  floatingGoLiveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  floatingGoLiveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.2,
  },
});
