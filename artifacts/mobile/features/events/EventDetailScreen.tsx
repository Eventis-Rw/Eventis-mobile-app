import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

const EVENT_IMAGES: Record<string, number> = {
  concert: require("../../assets/images/banner-concert.png"),
  tech: require("../../assets/images/banner-tech.png"),
  food: require("../../assets/images/banner-food.png"),
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, toggleSaveEvent, requestOTP } = useAuth();
  const { hasBookedEvent, addBooking } = useBookings();
  const { getEventById } = useEvents();
  const [bookingLoading, setBookingLoading] = useState(false);

  const event = getEventById(id ?? "");
  const isBooked = hasBookedEvent(id ?? "");
  const isSaved = user?.savedEvents.includes(id ?? "") ?? false;

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background dark:bg-background-dark">
        <Text className="font-semibold text-lg text-foreground dark:text-foreground-dark">
          Event not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text className="font-sans text-base text-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const priceLabel =
    event.price === 0
      ? "Free"
      : `${event.currency === "GBP" ? "£" : "$"}${event.price}`;

  const handleBook = useCallback(async () => {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [toggleSaveEvent, event.id]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: event.title,
        message: `Check out "${event.title}" on ${event.date} at ${event.location}${event.organizerWebsite ? " — " + event.organizerWebsite : ""}`,
      });
    } catch {}
  }, [event]);

  const ctaBgClass = isBooked
    ? "bg-success"
    : event.isPaid && event.organizerWebsite
    ? "bg-accent"
    : "bg-primary";

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={EVENT_IMAGES[event.image] ?? EVENT_IMAGES["concert"]}
          className="h-80 justify-between"
        >
          <View className="absolute inset-0 bg-overlay opacity-35 dark:bg-overlay-dark" />
          <View
            className="flex-row justify-between px-5"
            style={{ paddingTop: insets.top + 8 }}
          >
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
                onPress={handleSave}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={isSaved ? colors.primary : colors.foreground}
                />
              </Pressable>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View className="gap-2 p-5">
            <View className="self-start rounded-lg bg-primary px-2.5 py-1">
              <Text className="font-semibold text-xs text-primary-foreground">
                {event.category}
              </Text>
            </View>
            <Text className="font-bold text-[26px] leading-[34px] text-white">
              {event.title}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text className="font-medium text-[13px] text-white/85">
                {event.rating} ({event.reviewCount} reviews)
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Content */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          className="gap-3.5 bg-background p-5 dark:bg-background-dark"
        >
          {/* Info cards row */}
          <View className="flex-row gap-2.5">
            {[
              { icon: "calendar-outline", label: "Date", value: formatDate(event.date) },
              { icon: "time-outline", label: "Time", value: `${event.time} – ${event.endTime}` },
              { icon: "location-outline", label: "Distance", value: `${event.distance}km away` },
            ].map((item, i) => (
              <View
                key={i}
                className="flex-1 items-center gap-1 rounded-[14px] border border-border bg-card p-3 dark:border-border-dark dark:bg-card-dark"
              >
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <Text className="font-medium text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">
                  {item.label}
                </Text>
                <Text className="text-center font-semibold text-xs text-foreground dark:text-foreground-dark">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Location */}
          <View className="flex-row items-center gap-2.5 rounded-[14px] border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark">
            <View className="flex-1 flex-row items-center gap-2.5">
              <Ionicons name="location" size={18} color={colors.primary} />
              <View>
                <Text className="font-semibold text-sm text-foreground dark:text-foreground-dark">
                  {event.location}
                </Text>
                <Text className="mt-px font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
                  {event.city}
                </Text>
              </View>
            </View>
            <Pressable
              className="rounded-[10px] bg-primary px-4 py-2"
              onPress={() => {
                const q = encodeURIComponent(`${event.location}, ${event.city}`);
                Linking.openURL(`https://maps.google.com/?q=${q}`);
              }}
            >
              <Text className="font-semibold text-[13px] text-primary-foreground">Map</Text>
            </Pressable>
          </View>

          {/* Organizer */}
          <View className="flex-row items-center gap-3 rounded-[14px] border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
              <Ionicons name="business-outline" size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-sans text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
                Organizer
              </Text>
              <Text className="mt-px font-semibold text-[15px] text-foreground dark:text-foreground-dark">
                {event.organizer}
              </Text>
            </View>
            {event.organizerWebsite && (
              <Pressable
                className="flex-row items-center gap-1 rounded-[10px] bg-secondary px-3 py-2 dark:bg-secondary-dark"
                onPress={() => Linking.openURL(event.organizerWebsite!)}
              >
                <Text className="font-semibold text-[13px] text-primary">Visit</Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {/* Attendees */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2.5">
              <View className="relative h-6 w-14 flex-row">
                {[colors.primary, colors.accent, colors.secondary].map((c, i) => (
                  <View
                    key={i}
                    className="absolute h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-background dark:border-background-dark"
                    style={{ backgroundColor: c, left: i * 18 }}
                  >
                    <Ionicons name="person" size={10} color="#fff" />
                  </View>
                ))}
              </View>
              <Text className="font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark">
                <Text className="font-semibold text-foreground dark:text-foreground-dark">
                  {event.attendees.toLocaleString()}
                </Text>{" "}
                attending · {event.capacity - event.attendees} spots left
              </Text>
            </View>
            <View className="h-1 overflow-hidden rounded-sm bg-border dark:bg-border-dark">
              <View
                className="h-full rounded-sm bg-primary"
                style={{
                  width: `${Math.min((event.attendees / event.capacity) * 100, 100)}%`,
                }}
              />
            </View>
          </View>

          {/* Description */}
          <Text className="font-bold text-lg text-foreground dark:text-foreground-dark">
            About
          </Text>
          <Text className="font-sans text-[15px] leading-6 text-muted-foreground dark:text-muted-foreground-dark">
            {event.description}
          </Text>

          {/* Tags */}
          <View className="flex-row flex-wrap gap-2">
            {event.tags.map((tag) => (
              <View
                key={tag}
                className="rounded-lg border border-border bg-secondary px-3 py-1.5 dark:border-border-dark dark:bg-secondary-dark"
              >
                <Text className="font-sans text-[13px] text-secondary-foreground dark:text-secondary-foreground-dark">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Paid event note */}
          {event.isPaid && (
            <View className="flex-row items-start gap-2 rounded-xl border border-primary bg-glass p-3 dark:bg-glass-dark">
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text className="flex-1 font-sans text-[13px] leading-5 text-muted-foreground dark:text-muted-foreground-dark">
                {event.organizerWebsite
                  ? "Payment is processed securely on the organizer's website."
                  : "You will be directed to the organizer for payment."}
              </Text>
            </View>
          )}

          <View className="h-[110px]" />
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <Animated.View
        entering={Platform.OS !== "web" ? FadeInUp.delay(200).springify() : undefined}
        className="absolute bottom-0 left-0 right-0 flex-row items-center border-t border-border bg-background px-5 pt-3.5 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-1">
          <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
            {event.isPaid ? "Per ticket" : "Admission"}
          </Text>
          <Text
            className={`mt-0.5 font-bold text-[26px] ${
              event.isPaid
                ? "text-foreground dark:text-foreground-dark"
                : "text-success"
            }`}
          >
            {priceLabel}
          </Text>
        </View>
        <Pressable
          className={`flex-row items-center gap-2 rounded-2xl px-7 py-4 ${ctaBgClass}`}
          style={{ opacity: bookingLoading ? 0.7 : 1 }}
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
          <Text className="font-bold text-base text-white">
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
