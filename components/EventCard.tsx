import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ImageBackground,
  Pressable,
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
import type { Event } from "@/constants/mockData";

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
  variant?: "featured" | "standard" | "compact";
}

export function EventCard({ event, variant = "standard" }: EventCardProps) {
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

  const priceLabel =
    event.price === 0
      ? "Free"
      : `${event.currency === "GBP" ? "£" : "$"}${event.price}`;

  if (variant === "featured") {
    return (
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
                  <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.attendeeText}>
                    {formatCount(event.attendees)} attending
                  </Text>
                </View>
                {event.viewCount != null && (
                  <View style={styles.attendeeRow}>
                    <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.attendeeText}>{formatCount(event.viewCount)}</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.pricePill,
                  {
                    backgroundColor:
                      event.price === 0 ? colors.success : colors.primary,
                  },
                ]}
              >
                <Text style={styles.priceText}>{priceLabel}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </AnimatedPressable>
    );
  }

  if (variant === "compact") {
    return (
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
            <Text
              style={[
                styles.compactPrice,
                { color: event.price === 0 ? colors.success : colors.accent },
              ]}
            >
              {priceLabel}
            </Text>
            {event.viewCount != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {formatCount(event.viewCount)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.standard, animatedStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <ImageBackground
        source={getEventImage(event.image)}
        style={styles.standardImage}
        imageStyle={styles.standardImageStyle}
      >
        <View style={[styles.overlay2, { backgroundColor: colors.overlay }]} />
        <Pressable
          style={[styles.saveBtn2, { backgroundColor: colors.surface }]}
          onPress={handleSave}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={16}
            color={isSaved ? colors.primary : colors.foreground}
          />
        </Pressable>
        <View
          style={[
            styles.pricePill2,
            { backgroundColor: event.price === 0 ? colors.success : colors.primary },
          ]}
        >
          <Text style={styles.priceText}>{priceLabel}</Text>
        </View>
      </ImageBackground>
      <View style={styles.standardContent}>
        <View style={styles.standardHeader}>
          <Text
            style={[styles.standardCategory, { color: colors.primary }]}
          >
            {event.category}
          </Text>
          <View style={styles.statsRow}>
            {event.viewCount != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="eye-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {formatCount(event.viewCount)}
                </Text>
              </View>
            )}
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
});
