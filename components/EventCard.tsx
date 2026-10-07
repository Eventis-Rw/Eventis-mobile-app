import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { getEventPalette, getEventTiming } from "@/constants/eventPresentation";
import { shareEvent } from "@/utils/shareEvent";
import { getEventImage, POSTER_RATIOS } from "@/constants/eventImages";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    await shareEvent(event);
  }, [event]);

  const handleShareToChat = useCallback(() => {
    setShowShareModal(false);
    router.push({
      pathname: "/chat",
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

  if (variant === "feed") {
    const priceLabel = !event.isPaid || event.price <= 0
      ? "Free entry"
      : `${event.currency} ${event.price.toLocaleString()}`;
    const palette = getEventPalette(event.category);
    const timing = getEventTiming(event);
    return (
      <Animated.View style={[styles.posterCard, animatedStyle]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={`View ${event.title}`}
        >
          <ImageBackground
            source={getEventImage(event.image)}
            style={[styles.posterMedia, { backgroundColor: palette.deep }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(3,5,14,0.02)", "rgba(3,5,14,0.22)", palette.deep]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.posterTopRow}>
              <View style={[styles.posterStatus, { backgroundColor: timing.kind === "live" ? "#E5484D" : "rgba(8,10,20,0.72)" }]}>
                {timing.kind === "live" ? <View style={styles.posterLiveDot} /> : null}
                <Text style={styles.posterStatusText}>{timing.label}</Text>
              </View>
              <View style={[styles.posterArrow, { backgroundColor: palette.accent }]}>
                <Ionicons name="arrow-up-outline" size={18} color="#FFFFFF" style={styles.posterArrowIcon} />
              </View>
            </View>
            <View style={styles.posterFooter}>
              <Text style={[styles.posterCategory, { color: palette.accentSoft }]}>{event.category}</Text>
              <Text style={styles.posterTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <View style={styles.posterLocationRow}>
                <Ionicons name="location" size={14} color={palette.accentSoft} />
                <Text style={styles.posterLocation} numberOfLines={1}>{event.location}</Text>
              </View>
              <View style={styles.posterMeta}>
                <Text style={styles.posterPrice}>{priceLabel}</Text>
                <View style={styles.posterCta}>
                  <Text style={styles.posterCtaText}>View details</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0A1022" />
                </View>
              </View>
            </View>
          </ImageBackground>
        </Pressable>
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Unsave event" : "Save event"}
          style={styles.posterHeart}
        >
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={22}
            color="#FFFFFF"
          />
        </Pressable>
      </Animated.View>
    );
  }

  // Instagram-style event post used outside the home feed
  return (
    <>
      <AnimatedPressable
        style={[
          styles.instaCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Post Header: Organizer info & Category */}
        <View style={styles.instaHeader}>
          <View style={styles.instaOrganizerInfo}>
            <View style={[styles.instaOrganizerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.instaOrganizerAvatarLetter}>
                {event.organizer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.instaOrganizerTextCol}>
              <View style={styles.instaOrganizerNameRow}>
                <Text style={[styles.instaOrganizerName, { color: colors.foreground }]} numberOfLines={1}>
                  {event.organizer}
                </Text>
                {event.isSponsored && (
                  <View style={[styles.instaSponsoredBadge, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.instaSponsoredText, { color: colors.primary }]}>Sponsored</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.instaLocationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {event.location}, {event.city}
              </Text>
            </View>
          </View>
          <View style={[styles.instaCategoryBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.instaCategoryText, { color: colors.primary }]}>
              {event.category}
            </Text>
          </View>
        </View>

        {/* Post Media: Full-width event image */}
        <View style={[styles.instaMediaWrap, POSTER_RATIOS[event.image] ? { aspectRatio: POSTER_RATIOS[event.image] } : null]}>
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.instaMediaImage}
            imageStyle={styles.instaMediaInnerImage}
          />
        </View>

        {/* Action Bar: ONLY Insight numbers, Share, and Saved for Later. NO RATING */}
        <View style={styles.instaActionBar}>
          {/* Left: Insight numbers */}
          <View style={styles.instaInsightsWrap}>
            <View style={styles.instaInsightItem}>
              <Ionicons name="eye-outline" size={17} color={colors.primary} />
              <Text style={[styles.instaInsightCount, { color: colors.foreground }]}>
                {formatCount(viewsCount)}
              </Text>
              <Text style={[styles.instaInsightLabel, { color: colors.mutedForeground }]}>
                views
              </Text>
            </View>
            <View style={styles.instaInsightItem}>
              <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.instaAttendeesCount, { color: colors.mutedForeground }]}>
                {event.attendees} attending
              </Text>
            </View>
          </View>

          {/* Right: Share icon and Saved for Later icon */}
          <View style={styles.instaRightActions}>
            <Pressable
              style={styles.instaActionBtn}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share event"
            >
              <Ionicons name="share-social-outline" size={21} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={styles.instaActionBtn}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save for later"
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={21}
                color={isSaved ? colors.primary : colors.foreground}
              />
            </Pressable>
          </View>
        </View>

        {/* Post Details & Caption */}
        <View style={styles.instaDetails}>
          <Text style={[styles.instaTitle, { color: colors.foreground }]} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.instaMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.instaMetaText, { color: colors.mutedForeground }]}>
              {formatDate(event.date)} · {event.time}
            </Text>
          </View>
          <Text style={[styles.instaCaption, { color: colors.mutedForeground }]} numberOfLines={2}>
            {event.description}
          </Text>
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
  featuredBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  instaCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 22,
    shadowColor: "#6E96FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  posterCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#11152A",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  posterMedia: {
    width: "100%",
    height: 360,
    justifyContent: "space-between",
  },
  posterTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  posterStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "75%",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  posterLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  posterStatusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  posterArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  posterArrowIcon: {
    transform: [{ rotate: "45deg" }],
  },
  posterHeart: {
    position: "absolute",
    top: 14,
    right: 62,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 20, 28, 0.35)",
  },
  posterFooter: {
    paddingHorizontal: 16,
    paddingBottom: 17,
    paddingTop: 34,
    gap: 7,
  },
  posterCategory: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.75,
    textTransform: "uppercase",
  },
  posterTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  posterMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 7,
  },
  posterLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  posterLocation: {
    flex: 1,
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  posterPrice: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  posterCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  posterCtaText: {
    color: "#0A1022",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  feedBleed: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginBottom: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
  instaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  instaOrganizerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  instaOrganizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  instaOrganizerAvatarLetter: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  instaOrganizerTextCol: {
    flex: 1,
    gap: 2,
  },
  instaOrganizerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instaOrganizerName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  instaSponsoredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instaSponsoredText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  instaLocationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  instaCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  instaCategoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  instaMediaWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#000000",
  },
  instaMediaImage: {
    width: "100%",
    height: "100%",
  },
  instaMediaInnerImage: {
    resizeMode: "cover",
  },
  instaActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  instaInsightsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  instaInsightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  instaInsightCount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  instaInsightLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  instaAttendeesCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  instaRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  instaActionBtn: {
    padding: 4,
  },
  instaDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  instaTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  instaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instaMetaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  instaCaption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
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
