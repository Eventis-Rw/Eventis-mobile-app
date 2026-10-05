import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";
import { shareEvent } from "@/utils/shareEvent";

const EVENT_IMAGES: Record<string, number> = {
  concert: require("../../assets/images/banner-concert.png"),
  tech: require("../../assets/images/banner-tech.png"),
  food: require("../../assets/images/banner-food.png"),
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, toggleSaveEvent, requestOTP } = useAuth();
  const { hasBookedEvent, addBooking } = useBookings();
  const { getEventById, isLoading } = useEvents();
  const [bookingLoading, setBookingLoading] = useState(false);

  const event = getEventById(id ?? "");
  const isBooked = hasBookedEvent(id ?? "");
  const isSaved = user?.savedEvents.includes(id ?? "") ?? false;

  const handleBook = useCallback(async () => {
    if (!event) return;
    if (!user) {
      router.push("/auth/register" as any);
      return;
    }
    if (event.isPaid && !user.isPhoneVerified) {
      requestOTP("payment", event.id);
      router.push({ pathname: "/auth/otp", params: { purpose: "payment", eventId: event.id } } as any);
      return;
    }
    if (event.isPaid && event.organizerWebsite) {
      Linking.openURL(event.organizerWebsite);
      return;
    }
    setBookingLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addBooking({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImage: event.image,
      userId: user.id,
      quantity: 1,
      totalPrice: event.price,
      currency: event.currency,
      isPaid: event.isPaid,
    });
    setBookingLoading(false);
    router.push("/(tabs)/tickets" as any);
  }, [user, event, router, requestOTP, addBooking]);

  const handleSave = useCallback(() => {
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [toggleSaveEvent, event]);

  const handleShare = useCallback(() => {
    if (event) shareEvent(event);
  }, [event]);

  // Hooks above must run on every render, so the early returns come after them.
  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={[styles.notFoundText, { color: colors.foreground }]}>
              Event not found
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const instructions = (event.instructions ?? []).map((item) => item.trim()).filter(Boolean);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={EVENT_IMAGES[event.image] ?? EVENT_IMAGES["concert"]}
          style={styles.hero}
        >
          <View style={[styles.heroOverlay, { backgroundColor: colors.overlay }]} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Pressable
              style={[styles.navBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable
                style={[styles.navBtn, { backgroundColor: colors.surface }]}
                onPress={handleSave}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={isSaved ? colors.primary : colors.foreground}
                />
              </Pressable>
              <Pressable
                style={[styles.navBtn, { backgroundColor: colors.surface }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share event"
              >
                <Ionicons name="share-outline" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={[styles.catBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.catBadgeText}>{event.category}</Text>
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
          </View>
        </ImageBackground>

        {/* Content */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          style={[styles.content, { backgroundColor: colors.background }]}
        >
          {/* Info cards row */}
          <View style={styles.infoRow}>
            {[
              { icon: "calendar-outline", label: "Date", value: formatDate(event.date) },
              { icon: "time-outline", label: "Time", value: `${event.time} – ${event.endTime}` },
              { icon: "location-outline", label: "Distance", value: `${event.distance}km away` },
            ].map((item, i) => (
              <View
                key={i}
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                  {item.label}
                </Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Location */}
          <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.locationLeft}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.locationName, { color: colors.foreground }]}>
                  {event.location}
                </Text>
                <Text style={[styles.locationCity, { color: colors.mutedForeground }]}>
                  {event.city}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.mapBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                const q = encodeURIComponent(`${event.location}, ${event.city}`);
                Linking.openURL(`https://maps.google.com/?q=${q}`);
              }}
            >
              <Text style={styles.mapBtnText}>Map</Text>
            </Pressable>
          </View>

          {/* Organizer */}
          <View
            style={[styles.organizerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.organizerAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="business-outline" size={20} color="#fff" />
            </View>
            <View style={styles.organizerInfo}>
              <Text style={[styles.organizerLabel, { color: colors.mutedForeground }]}>
                Organizer
              </Text>
              <Text style={[styles.organizerName, { color: colors.foreground }]}>
                {event.organizer}
              </Text>
            </View>
            {event.organizerWebsite && (
              <Pressable
                style={[styles.visitBtn, { backgroundColor: colors.secondary }]}
                onPress={() => Linking.openURL(event.organizerWebsite!)}
              >
                <Text style={[styles.visitBtnText, { color: colors.primary }]}>
                  Visit
                </Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {/* Attendees */}
          <View style={styles.attendeeSection}>
            <View style={styles.attendeeLeft}>
              <View style={styles.avatarStack}>
                {[colors.primary, colors.accent, colors.secondary].map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.miniAvatar,
                      { backgroundColor: c, left: i * 18, borderColor: colors.background },
                    ]}
                  >
                    <Ionicons name="person" size={10} color="#fff" />
                  </View>
                ))}
              </View>
              <Text style={[styles.attendeeText, { color: colors.mutedForeground }]}>
                <Text style={[styles.attendeeCount, { color: colors.foreground }]}>
                  {event.attendees.toLocaleString()}
                </Text>{" "}
                attending · {event.capacity - event.attendees} spots left
              </Text>
            </View>
            <View
              style={[
                styles.capacityBar,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.capacityFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(
                      (event.attendees / event.capacity) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            About
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {event.description}
          </Text>

          {/* Organizer instructions, only when the organizer provided some */}
          {instructions.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Instructions
              </Text>
              <View
                style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {instructions.map((item, index) => (
                  <View key={index} style={styles.instructionRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.instructionsText, { color: colors.mutedForeground }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Tags */}
          <View style={styles.tagRow}>
            {event.tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <Animated.View
        entering={Platform.OS !== "web" ? FadeInUp.delay(200).springify() : undefined}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          style={[
            styles.ctaBtn,
            {
              backgroundColor: isBooked
                ? colors.success
                : event.isPaid && event.organizerWebsite
                ? colors.accent
                : colors.primary,
              opacity: bookingLoading ? 0.7 : 1,
            },
          ]}
          onPress={isBooked ? undefined : handleBook}
          disabled={bookingLoading}
        >
          <Ionicons
            name={
              isBooked
                ? "checkmark-circle-outline"
                : event.isPaid
                ? "open-outline"
                : "ticket-outline"
            }
            size={20}
            color="#fff"
          />
          <Text style={styles.ctaBtnText}>
            {isBooked
              ? "Booked"
              : event.isPaid && event.organizerWebsite
              ? "Get Tickets"
              : event.isPaid
              ? "Book Now"
              : "Reserve Free Spot"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  hero: { height: 320, justifyContent: "space-between" },
  heroOverlay: { ...StyleSheet.absoluteFill, opacity: 0.35 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroActions: { flexDirection: "row", gap: 8 },
  heroBottom: { padding: 20, gap: 8 },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 34,
  },
  content: { padding: 20, gap: 14 },
  infoRow: { flexDirection: "row", gap: 10 },
  infoCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  infoLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  locationLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  locationName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  locationCity: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  mapBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  organizerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  organizerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  visitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  visitBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  attendeeSection: { gap: 8 },
  attendeeLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarStack: { flexDirection: "row", width: 56, height: 24, position: "relative" },
  miniAvatar: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  attendeeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attendeeCount: { fontFamily: "Inter_600SemiBold" },
  capacityBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  capacityFill: { height: "100%", borderRadius: 2 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  instructionsCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  instructionsText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
