import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SectionState } from "@/components/profile/ProfileSection";
import { TicketCodePattern } from "@/components/TicketCodePattern";
import { getEventImage } from "@/constants/eventImages";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { localToday } from "@/utils/dates";

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Digital ticket for one booking: the pass the customer shows at the door. */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { getBooking, isLoading } = useBookings();
  const { user } = useAuth();
  // Reviews live on the customer profile; publishers have no My Reviews tab.
  const canReview = getAccountType(user) === "customer";
  const [copied, setCopied] = useState(false);

  const booking = getBooking(id ?? "");

  if (!booking) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ProfileSubHeader title="Ticket" />
        <View style={styles.missing}>
          {isLoading ? (
            <SectionState kind="loading" message="Loading your ticket…" />
          ) : (
            <SectionState
              kind="empty"
              icon="ticket-outline"
              title="Ticket not found"
              message="This ticket may have been removed. Your current tickets are on your profile."
              actionLabel="My tickets"
              onAction={() => router.replace({ pathname: "/(tabs)/profile", params: { tab: "tickets" } } as any)}
            />
          )}
        </View>
      </View>
    );
  }

  const today = localToday();
  const isCancelled = booking.status === "cancelled";
  const isPending = booking.status === "pending";
  const isPast = booking.eventDate < today;
  const isValid = !isCancelled && !isPending && !isPast;

  const copyCode = async () => {
    await Clipboard.setStringAsync(booking.ticketCode);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const banner = isCancelled
    ? { icon: "close-circle" as const, color: colors.destructive, text: "This booking was cancelled. The ticket is no longer valid." }
    : isPending
      ? { icon: "time" as const, color: colors.warning, text: "Your booking is still being confirmed. The ticket becomes valid once it's confirmed." }
      : isPast
        ? { icon: "checkmark-done-circle" as const, color: colors.mutedForeground, text: "This event has ended." }
        : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="Your ticket" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {banner ? (
          <View style={[styles.banner, { backgroundColor: `${banner.color}1A`, borderColor: `${banner.color}55` }]}>
            <Ionicons name={banner.icon} size={18} color={banner.color} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>{banner.text}</Text>
          </View>
        ) : null}

        <GlassSurface style={styles.ticket}>
          <Image source={getEventImage(booking.eventImage)} style={styles.image} />
          <View style={styles.ticketBody}>
            <Text style={[styles.eventTitle, { color: colors.foreground }]}>{booking.eventTitle}</Text>
            <Detail icon="calendar-outline" label="Date" value={formatDate(booking.eventDate)} />
            <Detail icon="time-outline" label="Time" value={booking.eventTime} />
            <Detail icon="location-outline" label="Venue" value={booking.eventLocation} />
            <View style={styles.detailRow}>
              <Detail
                icon="people-outline"
                label="Admits"
                value={`${booking.quantity} ${booking.quantity === 1 ? "person" : "people"}`}
              />
              <Detail
                icon="card-outline"
                label="Paid"
                value={booking.totalPrice === 0 ? "Free" : `${booking.currency} ${booking.totalPrice.toLocaleString()}`}
              />
            </View>
          </View>

          <View style={[styles.tear, { borderColor: colors.border }]} />

          <View style={styles.passBlock}>
            <TicketCodePattern code={booking.ticketCode} size={168} cells={13} dimmed={!isValid} />
            <Pressable
              onPress={copyCode}
              style={({ pressed }) => [styles.codeRow, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Ticket code ${booking.ticketCode}. Copy`}
            >
              <Text style={[styles.code, { color: colors.foreground }]}>{booking.ticketCode}</Text>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={colors.primary} />
            </Pressable>
            <Text style={[styles.passHint, { color: colors.mutedForeground }]}>
              {isValid
                ? "Show this pass or read out the code at the entrance to check in."
                : "This pass can't be used for check-in."}
            </Text>
          </View>
        </GlassSurface>

        <View style={styles.actions}>
          <ActionButton
            icon="information-circle-outline"
            label="Booking details"
            onPress={() =>
              router.push({ pathname: "/booking/[id]", params: { id: booking.eventId, bookingId: booking.id } } as any)
            }
          />
          <ActionButton
            icon="calendar-outline"
            label="View event"
            onPress={() => router.push({ pathname: "/event/[id]", params: { id: booking.eventId } } as any)}
          />
          {isPast && !isCancelled && canReview ? (
            <ActionButton
              icon="star-outline"
              label="Rate this event"
              onPress={() => router.push({ pathname: "/(tabs)/profile", params: { tab: "reviews" } } as any)}
            />
          ) : null}
          <ActionButton
            icon="flag-outline"
            label="Report a problem"
            onPress={() =>
              router.push({
                pathname: "/report-problem",
                params: { reference: booking.ticketCode, category: "bookings" },
              } as any)
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.actionText, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  missing: { padding: 16 },
  content: { padding: 16, gap: 16 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  ticket: { padding: 0, overflow: "hidden" },
  image: { width: "100%", height: 140 },
  ticketBody: { padding: 16, gap: 12 },
  eventTitle: { fontSize: 20, lineHeight: 26, fontFamily: "Inter_700Bold" },
  detailRow: { flexDirection: "row", gap: 12 },
  detail: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  tear: { borderTopWidth: 1, borderStyle: "dashed", marginHorizontal: 16 },
  passBlock: { alignItems: "center", padding: 20, gap: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 8 },
  code: { fontSize: 18, letterSpacing: 2, fontFamily: "Inter_700Bold" },
  passHint: { fontSize: 13, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular" },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
