import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/constants/events";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EVENT_IMAGES: Record<string, number> = {
  concert: require("../assets/images/banner-concert.png"),
  tech: require("../assets/images/banner-tech.png"),
  food: require("../assets/images/banner-food.png"),
};

// Mock events use bundled image keys; API events are expected to send a URL.
function getEventImage(image: string) {
  if (/^https?:\/\//.test(image)) return { uri: image };
  return EVENT_IMAGES[image] ?? EVENT_IMAGES["concert"];
}

interface EventCardProps {
  event: Event;
  variant?: "featured" | "standard" | "compact" | "feed";
  // Feed posts span the screen; the details line up with the page padding.
  inset?: number;
}

export function EventCard({ event, variant = "standard", inset = 20 }: EventCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { user, toggleSaveEvent } = useAuth();
  const scale = useSharedValue(1);
  const isSaved = user?.savedEvents.includes(event.id) ?? false;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    router.push(`/event/${event.id}`);
  }, [router, event.id]);

  const handleSave = useCallback(
    (e: any) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleSaveEvent(event.id);
    },
    [toggleSaveEvent, event.id]
  );

  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = useCallback((e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowShareModal(true);
  }, []);

  const handleNativeShare = useCallback(async () => {
    setShowShareModal(false);
    try {
      await Share.share({
        title: event.title,
        message: `Check out ${event.title} in ${event.city} on Eventis! https://eventis.app/events/${event.id}`,
      });
    } catch {}
  }, [event]);

  const handleShareToChat = useCallback(() => {
    setShowShareModal(false);
    router.push({
      pathname: "/(tabs)/chat",
      params: { eventId: event.id, eventTitle: event.title },
    } as any);
  }, [router, event]);

  const viewsCount = event.viewCount ?? (event.attendees * 4 + 180);

  const shareModal = (
    <Modal
      visible={showShareModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowShareModal(false)}
    >
      <Pressable
        style={styles.shareOverlay}
        onPress={() => setShowShareModal(false)}
      >
        <Pressable
          style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.shareHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.shareTitle, { color: colors.foreground }]}>Share Event</Text>
          <Text style={[styles.shareSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {event.title}
          </Text>

          <View style={styles.shareOptions}>
            <Pressable
              style={[styles.shareOption, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleShareToChat}
            >
              <View style={[styles.shareIconWrap, { backgroundColor: colors.primary }]}>
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.shareOptionInfo}>
                <Text style={[styles.shareOptionTitle, { color: colors.foreground }]}>
                  Share in Eventis Chat
                </Text>
                <Text style={[styles.shareOptionDesc, { color: colors.mutedForeground }]}>
                  Send to attendees and event organizers
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              style={[styles.shareOption, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleNativeShare}
            >
              <View style={[styles.shareIconWrap, { backgroundColor: colors.accent }]}>
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.shareOptionInfo}>
                <Text style={[styles.shareOptionTitle, { color: colors.foreground }]}>
                  Share via Other Apps
                </Text>
                <Text style={[styles.shareOptionDesc, { color: colors.mutedForeground }]}>
                  Copy link or send via WhatsApp, Messages
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.shareCancelBtn, { backgroundColor: colors.input }]}
            onPress={() => setShowShareModal(false)}
          >
            <Text style={[styles.shareCancelText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (variant === "featured") {
    return (
      <>
        <AnimatedPressable
          style={[styles.featured, animatedStyle]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.featuredImage}
            imageStyle={styles.featuredImageStyle}
          >
            <View
              style={[
                styles.featuredOverlay,
                { backgroundColor: colors.overlay },
              ]}
            />
            {event.isSponsored && (
              <View
                style={[styles.sponsoredBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.sponsoredText, { color: colors.accentForeground }]}>
                  Sponsored
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.surface }]}
              onPress={handleSave}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isSaved ? colors.primary : colors.foreground}
              />
            </Pressable>
            <View style={styles.featuredContent}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.glass }]}>
                <Text style={[styles.categoryText, { color: "#fff" }]}>
                  {event.category}
                </Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <View style={styles.featuredMeta}>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, styles.flexText]} numberOfLines={1}>
                    {formatDate(event.date)} · {event.time}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, styles.flexText]} numberOfLines={1}>
                    {event.location}, {event.city}
                  </Text>
                </View>
              </View>
              <View style={styles.featuredBottom}>
                <View style={styles.featuredStats}>
                  <View style={styles.attendeeRow}>
                    <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.attendeeText}>
                      {formatCount(event.attendees)} attending
                    </Text>
                  </View>
                  <View style={styles.attendeeRow}>
                    <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.attendeeText}>{formatCount(viewsCount)} views</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.sharePill, { backgroundColor: colors.surface }]}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share event"
                >
                  <Ionicons name="share-social-outline" size={14} color={colors.foreground} />
                  <Text style={[styles.sharePillText, { color: colors.foreground }]}>Share</Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        </AnimatedPressable>
        {shareModal}
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <AnimatedPressable
          style={[styles.compact, animatedStyle, { backgroundColor: colors.card }]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.compactImage}
            imageStyle={styles.compactImageStyle}
          />
          <View style={styles.compactContent}>
            <Text style={[styles.compactCategory, { color: colors.primary }]}>
              {event.category}
            </Text>
            <Text
              style={[styles.compactTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <Text
              style={[styles.compactDate, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {formatDate(event.date)} · {event.time}
            </Text>
            <Text
              style={[styles.compactMeta, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {event.location}, {event.city}
            </Text>
            <View style={styles.compactFooter}>
              <View style={styles.ratingRow}>
                <Ionicons name="eye-outline" size={12} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {formatCount(viewsCount)} views
                </Text>
              </View>
              <Pressable
                style={styles.compactShareBtn}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share event"
              >
                <Ionicons name="share-social-outline" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </AnimatedPressable>
        {shareModal}
      </>
    );
  }

  // "feed" shares the standard content but drops the card chrome.
  const isFeed = variant === "feed";

  return (
    <>
      <AnimatedPressable
        style={[
          isFeed
            ? styles.feed
            : [styles.standard, { backgroundColor: colors.card, borderColor: colors.border }],
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <ImageBackground
          source={getEventImage(event.image)}
          style={isFeed ? styles.feedImage : styles.standardImage}
          imageStyle={isFeed ? undefined : styles.standardImageStyle}
        >
          <View style={[styles.overlay2, { backgroundColor: colors.overlay }]} />
          <View style={[styles.topActionsRow, isFeed && { top: 12, right: inset }]}>
            <Pressable
              style={[styles.actionBtnCircle, { backgroundColor: colors.surface }]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share event"
            >
              <Ionicons name="share-social-outline" size={15} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={[styles.actionBtnCircle, { backgroundColor: colors.surface }]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Bookmark event"
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? colors.primary : colors.foreground}
              />
            </Pressable>
          </View>
          <View
            style={[
              styles.viewsInsightBadge,
              isFeed && { bottom: 12, left: inset },
              { backgroundColor: "rgba(12,12,26,0.65)" },
            ]}
          >
            <Ionicons name="eye-outline" size={12} color="#FFFFFF" />
            <Text style={styles.viewsInsightBadgeText}>{formatCount(viewsCount)} views</Text>
          </View>
        </ImageBackground>
        <View
          style={[
            styles.standardContent,
            isFeed && { paddingHorizontal: inset, paddingBottom: 0 },
          ]}
        >
          <View style={styles.standardHeader}>
            <Text
              style={[styles.standardCategory, { color: colors.primary }]}
            >
              {event.category}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.ratingRow}>
                <Ionicons name="eye-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {formatCount(viewsCount)}
                </Text>
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {event.rating}
                </Text>
              </View>
            </View>
          </View>
          <Text
            style={[styles.standardTitle, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <View style={styles.metaRow2}>
            <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.standardMeta, { color: colors.mutedForeground }]}>
              {formatDate(event.date)} · {event.time}
            </Text>
          </View>
          <View style={styles.metaRow2}>
            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
            <Text
              style={[styles.standardMeta, styles.flexText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {event.location}, {event.city}
            </Text>
            <Text style={[styles.standardMeta, { color: colors.mutedForeground }]}>
              {event.distance}km
            </Text>
          </View>
        </View>
      </AnimatedPressable>
      {shareModal}
    </>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const styles = StyleSheet.create({
  // Width comes from the container (BannerCarousel sizes each slide).
  featured: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
  },
  flexText: {
    flexShrink: 1,
  },
  featuredStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  featuredImageStyle: {
    borderRadius: 20,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.4,
  },
  sponsoredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sponsoredText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn2: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredContent: {
    padding: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  featuredTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
    lineHeight: 22,
  },
  featuredMeta: {
    gap: 4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
  },
  featuredBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendeeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priceText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  compact: {
    width: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
  },
  compactImage: {
    width: "100%",
    height: 110,
  },
  compactImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactContent: {
    padding: 10,
    gap: 2,
  },
  compactCategory: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  compactTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  compactDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  compactMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  compactPrice: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  standard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
  },
  feed: {
    marginBottom: 28,
  },
  // Height follows the screen width so the banner never distorts or crops oddly.
  feedImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  standardImage: {
    height: 150,
    justifyContent: "flex-end",
  },
  standardImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlay2: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  pricePill2: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  standardContent: {
    padding: 14,
    gap: 4,
  },
  standardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  standardCategory: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  standardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  metaRow2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  standardMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  topActionsRow: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  viewsInsightBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  viewsInsightBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sharePillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  compactShareBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  shareCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 12,
  },
  shareHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  shareTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  shareSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  shareOptions: {
    gap: 10,
    marginTop: 6,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  shareIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionInfo: {
    flex: 1,
    gap: 2,
  },
  shareOptionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  shareOptionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  shareCancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  shareCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
