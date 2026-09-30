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

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { addBooking, hasBookedEvent } = useBookings();
  const { getEventById } = useEvents();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const event = getEventById(id ?? "");
  const isAlreadyBooked = hasBookedEvent(id ?? "");

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <Text className="text-foreground dark:text-foreground-dark">Event not found</Text>
      </View>
    );
  }

  const total = event.price * quantity;
  const priceSymbol = event.currency === "GBP" ? "£" : "$";

  const handleConfirm = useCallback(async () => {
    if (!user) return;
    if (event.isPaid && event.organizerWebsite) {
      Linking.openURL(event.organizerWebsite);
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addBooking({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImage: event.image,
      userId: user.id,
      quantity,
      totalPrice: total,
      currency: event.currency,
      isPaid: event.isPaid,
    });
    setLoading(false);
    router.replace("/(tabs)/tickets" as any);
  }, [user, event, quantity, total, addBooking, router]);

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-3 dark:border-border-dark"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-foreground dark:text-foreground-dark">
          Booking
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event summary */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
          className="flex-row overflow-hidden rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark"
        >
          <ImageBackground
            source={EVENT_IMAGES[event.image] ?? EVENT_IMAGES.concert}
            className="h-[110px] w-[100px]"
          />
          <View className="flex-1 gap-1 p-3">
            <Text className="text-[11px] font-semibold text-primary">
              {event.category}
            </Text>
            <Text
              className="text-[15px] font-semibold leading-[22px] text-foreground dark:text-foreground-dark"
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <View className="flex-row items-center gap-[5px]">
              <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
              <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                {formatDate(event.date)} · {event.time}
              </Text>
            </View>
            <View className="flex-row items-center gap-[5px]">
              <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
              <Text
                className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark"
                numberOfLines={1}
              >
                {event.location}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Ticket type */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
        >
          <Text className="mb-3 text-base font-bold text-foreground dark:text-foreground-dark">
            Ticket Type
          </Text>
          <View className="flex-row items-center gap-3 rounded-2xl border-[1.5px] border-primary bg-card p-4 dark:bg-card-dark">
            <View className="flex-1 flex-row items-start gap-3">
              <View className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <View>
                <Text className="text-[15px] font-semibold text-foreground dark:text-foreground-dark">
                  {event.isPaid ? "General Admission" : "Free Entry"}
                </Text>
                <Text className="mt-0.5 text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                  {event.isPaid
                    ? event.organizerWebsite
                      ? "Redirected to organizer website"
                      : "Standard access"
                    : "Free reservation, no card required"}
                </Text>
              </View>
            </View>
            <Text className="text-base font-bold text-foreground dark:text-foreground-dark">
              {event.price === 0 ? "Free" : `${priceSymbol}${event.price}`}
            </Text>
          </View>
        </Animated.View>

        {/* Quantity */}
        {!event.isPaid || !event.organizerWebsite ? (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
          >
            <Text className="mb-3 text-base font-bold text-foreground dark:text-foreground-dark">
              Quantity
            </Text>
            <View className="flex-row items-center justify-center gap-6 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
              <Pressable
                className={`h-10 w-10 items-center justify-center rounded-xl ${
                  quantity > 1
                    ? "bg-secondary dark:bg-secondary-dark"
                    : "bg-border dark:bg-border-dark"
                }`}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={quantity > 1 ? colors.foreground : colors.mutedForeground}
                />
              </Pressable>
              <Text className="min-w-[32px] text-center text-[22px] font-bold text-foreground dark:text-foreground-dark">
                {quantity}
              </Text>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-xl bg-secondary dark:bg-secondary-dark"
                onPress={() => setQuantity((q) => Math.min(10, q + 1))}
              >
                <Ionicons name="add" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* Payment info */}
        {event.isPaid && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}
            className="flex-row items-start gap-3 rounded-2xl border border-border bg-glass p-4 dark:border-border-dark dark:bg-glass-dark"
          >
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                {event.organizerWebsite ? "External Payment" : "Payment Required"}
              </Text>
              <Text className="text-[13px] font-sans leading-5 text-muted-foreground dark:text-muted-foreground-dark">
                {event.organizerWebsite
                  ? "You'll be redirected to the organizer's website to complete payment securely."
                  : "Accepted: Credit/Debit Card, Mobile Money, Apple Pay, Google Pay, Wallet"}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Order summary */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(300).springify() : undefined}
          className="gap-3 rounded-2xl border border-border bg-card p-[18px] dark:border-border-dark dark:bg-card-dark"
        >
          <Text className="mb-3 text-base font-bold text-foreground dark:text-foreground-dark">
            Order Summary
          </Text>
          <View className="flex-row justify-between border-b border-border pb-3 dark:border-border-dark">
            <Text className="text-sm font-sans text-muted-foreground dark:text-muted-foreground-dark">
              {event.isPaid ? "General Admission" : "Free Reservation"} × {quantity}
            </Text>
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark">
              {event.price === 0 ? "Free" : `${priceSymbol}${event.price * quantity}`}
            </Text>
          </View>
          <View className="flex-row justify-between border-b border-border pb-3 dark:border-border-dark">
            <Text className="text-sm font-sans text-muted-foreground dark:text-muted-foreground-dark">
              Service fee
            </Text>
            <Text className="text-sm font-medium text-muted-foreground dark:text-muted-foreground-dark">
              {event.price === 0 ? "—" : "Included"}
            </Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-3 dark:border-border-dark">
            <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
              Total
            </Text>
            <Text
              className={`text-[22px] font-bold ${
                event.isPaid
                  ? "text-foreground dark:text-foreground-dark"
                  : "text-success"
              }`}
            >
              {event.price === 0 ? "Free" : `${priceSymbol}${total}`}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <Animated.View
        entering={Platform.OS !== "web" ? FadeInUp.delay(400).springify() : undefined}
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-5 pt-3.5 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          className={`flex-row items-center justify-center gap-2.5 rounded-2xl py-[18px] ${
            isAlreadyBooked ? "bg-success" : "bg-primary"
          } ${loading || isAlreadyBooked ? "opacity-80" : ""}`}
          onPress={isAlreadyBooked ? undefined : handleConfirm}
          disabled={loading || isAlreadyBooked}
        >
          <Ionicons
            name={isAlreadyBooked ? "checkmark-circle" : event.isPaid && event.organizerWebsite ? "open-outline" : "ticket"}
            size={20}
            color="#fff"
          />
          <Text className="text-[17px] font-bold text-primary-foreground">
            {isAlreadyBooked
              ? "Already Booked"
              : loading
              ? "Processing..."
              : event.isPaid && event.organizerWebsite
              ? "Continue to Payment"
              : event.isPaid
              ? "Confirm Booking"
              : "Reserve Spot"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
