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
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_EVENTS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
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
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const event = MOCK_EVENTS.find((e) => e.id === id);
  const isAlreadyBooked = hasBookedEvent(id ?? "");

  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.foreground }]}>Event not found</Text>
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
    const code = "EVT" + event.id.padStart(4, "0") + "-" + Date.now().toString().slice(-6).toUpperCase();
    await addBooking({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImage: event.image,
      userId: user.id,
      status: "confirmed",
      ticketCode: code,
      quantity,
      totalPrice: total,
      currency: event.currency,
      isPaid: event.isPaid,
    });
    setLoading(false);
    router.replace("/(tabs)/tickets" as any);
  }, [user, event, quantity, total, addBooking, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Event summary */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
          style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ImageBackground
            source={EVENT_IMAGES[event.image] ?? EVENT_IMAGES.concert}
            style={styles.eventImage}
            imageStyle={styles.eventImageStyle}
          />
          <View style={styles.eventInfo}>
            <Text style={[styles.eventCategory, { color: colors.primary }]}>
              {event.category}
            </Text>
            <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={styles.eventMeta}>
              <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>
                {formatDate(event.date)} · {event.time}
              </Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Ticket type */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ticket Type</Text>
          <View
            style={[
              styles.ticketType,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
          >
            <View style={styles.ticketTypeLeft}>
              <View style={[styles.ticketDot, { backgroundColor: colors.primary }]} />
              <View>
                <Text style={[styles.ticketTypeName, { color: colors.foreground }]}>
                  {event.isPaid ? "General Admission" : "Free Entry"}
                </Text>
                <Text style={[styles.ticketTypeDesc, { color: colors.mutedForeground }]}>
                  {event.isPaid
                    ? event.organizerWebsite
                      ? "Redirected to organizer website"
                      : "Standard access"
                    : "Free reservation, no card required"}
                </Text>
              </View>
            </View>
            <Text style={[styles.ticketTypePriceText, { color: colors.foreground }]}>
              {event.price === 0 ? "Free" : `${priceSymbol}${event.price}`}
            </Text>
          </View>
        </Animated.View>

        {/* Quantity */}
        {!event.isPaid || !event.organizerWebsite ? (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quantity</Text>
            <View style={[styles.quantityRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={[
                  styles.qtyBtn,
                  { backgroundColor: quantity > 1 ? colors.secondary : colors.border },
                ]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={18} color={quantity > 1 ? colors.foreground : colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.qtyValue, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                style={[styles.qtyBtn, { backgroundColor: colors.secondary }]}
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
            style={[styles.paymentNote, { backgroundColor: colors.glass, borderColor: colors.border }]}
          >
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <View style={styles.paymentNoteContent}>
              <Text style={[styles.paymentNoteTitle, { color: colors.foreground }]}>
                {event.organizerWebsite ? "External Payment" : "Payment Required"}
              </Text>
              <Text style={[styles.paymentNoteText, { color: colors.mutedForeground }]}>
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
          style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              {event.isPaid ? "General Admission" : "Free Reservation"} × {quantity}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {event.price === 0 ? "Free" : `${priceSymbol}${event.price * quantity}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Service fee
            </Text>
            <Text style={[styles.summaryValue, { color: colors.mutedForeground }]}>
              {event.price === 0 ? "—" : "Included"}
            </Text>
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: event.isPaid ? colors.foreground : colors.success }]}>
              {event.price === 0 ? "Free" : `${priceSymbol}${total}`}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <Animated.View
        entering={Platform.OS !== "web" ? FadeInUp.delay(400).springify() : undefined}
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
            styles.confirmBtn,
            {
              backgroundColor: isAlreadyBooked ? colors.success : colors.primary,
              opacity: loading || isAlreadyBooked ? 0.8 : 1,
            },
          ]}
          onPress={isAlreadyBooked ? undefined : handleConfirm}
          disabled={loading || isAlreadyBooked}
        >
          <Ionicons
            name={isAlreadyBooked ? "checkmark-circle" : event.isPaid && event.organizerWebsite ? "open-outline" : "ticket"}
            size={20}
            color="#fff"
          />
          <Text style={styles.confirmBtnText}>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  eventCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  eventImage: { width: 100, height: 110 },
  eventImageStyle: {},
  eventInfo: { flex: 1, padding: 12, gap: 4 },
  eventCategory: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  eventTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  eventMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  ticketType: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  ticketTypeLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  ticketDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  ticketTypeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ticketTypeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  ticketTypePriceText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 24,
    justifyContent: "center",
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { fontSize: 22, fontFamily: "Inter_700Bold", minWidth: 32, textAlign: "center" },
  paymentNote: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  paymentNoteContent: { flex: 1, gap: 4 },
  paymentNoteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  paymentNoteText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  summary: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  confirmBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
