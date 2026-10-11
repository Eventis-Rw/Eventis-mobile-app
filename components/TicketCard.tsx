import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TicketCodePattern } from "@/components/TicketCodePattern";
import { useColors } from "@/hooks/useColors";
import type { Booking } from "@/context/BookingsContext";

interface TicketCardProps {
  booking: Booking;
  index: number;
  /** Opens the full digital ticket. */
  onPress?: () => void;
}

export function TicketCard({ booking, index, onPress }: TicketCardProps) {
  const colors = useColors();
  const isCancelled = booking.status === "cancelled";

  const statusColor =
    booking.status === "confirmed"
      ? colors.success
      : booking.status === "pending"
      ? colors.warning
      : colors.destructive;

  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeInDown.delay(index * 80).springify() : undefined}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: isCancelled ? 0.55 : 1 },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={onPress ? `Open ticket for ${booking.eventTitle}` : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
              {booking.eventTitle}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={[styles.priceBlock, { backgroundColor: colors.primary }]}>
            <Text style={styles.priceValue}>
              {booking.totalPrice === 0
                ? "Free"
                : `${booking.currency} ${booking.totalPrice.toLocaleString()}`}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
          <View style={styles.dashedLine}>
            {Array(20)
              .fill(null)
              .map((_, i) => (
                <View
                  key={i}
                  style={[styles.dash, { backgroundColor: colors.border }]}
                />
              ))}
          </View>
          <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <View>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Date</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  {formatDate(booking.eventDate)}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <View>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Time</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  {booking.eventTime}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.detailItem, { marginTop: 10 }]}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Location</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>
                {booking.eventLocation}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.qrSection, { backgroundColor: colors.muted }]}>
          <TicketCodePattern code={booking.ticketCode} size={54} dimmed={isCancelled} />
          <View style={styles.ticketInfo}>
            <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Ticket Code</Text>
            <Text style={[styles.ticketCode, { color: colors.foreground }]}>
              {booking.ticketCode}
            </Text>
            <Text style={[styles.quantityText, { color: colors.mutedForeground }]}>
              {booking.quantity} {booking.quantity === 1 ? "ticket" : "tickets"}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    padding: 18,
    gap: 12,
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  priceBlock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  priceValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  divider: {
    height: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 0,
    position: "relative",
  },
  notch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    zIndex: 2,
  },
  notchLeft: {
    left: -10,
  },
  notchRight: {
    right: -10,
  },
  dashedLine: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  dash: {
    width: 6,
    height: 1,
  },
  details: {
    padding: 18,
  },
  detailRow: {
    flexDirection: "row",
    gap: 20,
  },
  detailItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 20,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  ticketCode: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
