import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ProfileCard,
  ProfileNavRow,
  ProfileSection,
  ProfileStatGrid,
  SectionState,
} from "@/components/profile/ProfileSection";
import { getEventImage } from "@/constants/eventImages";
import type { Booking } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";
import type { ProfileTab } from "@/utils/accountCapabilities";

const STATUS_COLOR = {
  confirmed: "success",
  pending: "warning",
  cancelled: "destructive",
} as const;

function formatBookingDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function BookingRow({
  booking,
  showStatus,
  onPress,
}: {
  booking: Booking;
  showStatus?: boolean;
  /** Defaults to opening the event. */
  onPress?: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const statusColor = colors[STATUS_COLOR[booking.status]];

  return (
    <Pressable
      onPress={onPress ?? (() => router.push({ pathname: "/event/[id]", params: { id: booking.eventId } } as any))}
      style={({ pressed }) => [styles.bookingRow, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${booking.eventTitle}, ${formatBookingDate(booking.eventDate)}, ${booking.status}`}
    >
      <Image source={getEventImage(booking.eventImage)} style={styles.bookingImage} />
      <View style={styles.bookingCopy}>
        <Text style={[styles.bookingTitle, { color: colors.foreground }]} numberOfLines={1}>
          {booking.eventTitle}
        </Text>
        <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {formatBookingDate(booking.eventDate)} · {booking.eventTime} · {booking.quantity}{" "}
          {booking.quantity === 1 ? "ticket" : "tickets"}
        </Text>
      </View>
      {showStatus ? (
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{booking.status}</Text>
        </View>
      ) : (
        <Text style={[styles.ticketCode, { color: colors.primary }]}>{booking.ticketCode}</Text>
      )}
    </Pressable>
  );
}

interface CustomerOverviewProps {
  upcomingTickets: Booking[];
  pastBookings: Booking[];
  savedEventsCount: number;
  /** Shown instead of saved events when the Saved Organisers tab is available. */
  savedOrganisersCount?: number;
  /** Attended events still waiting for a review; 0 hides the prompt. */
  awaitingReviewCount?: number;
  isLoading: boolean;
  onSelectTab: (tab: ProfileTab) => void;
}

/** Customer overview: a summary that hands off to the dedicated tabs. */
export function CustomerOverview({
  upcomingTickets,
  pastBookings,
  savedEventsCount,
  savedOrganisersCount,
  awaitingReviewCount = 0,
  isLoading,
  onSelectTab,
}: CustomerOverviewProps) {
  const router = useRouter();

  return (
    <>
      <ProfileSection title="At a glance">
        <ProfileStatGrid
          stats={[
            {
              label: "Upcoming",
              value: upcomingTickets.length,
              icon: "ticket-outline",
              onPress: () => onSelectTab("tickets"),
            },
            {
              label: "Attended",
              value: pastBookings.filter((b) => b.status === "confirmed").length,
              icon: "checkmark-done-outline",
              onPress: () => onSelectTab("bookings"),
            },
            savedOrganisersCount === undefined
              ? { label: "Saved events", value: savedEventsCount, icon: "bookmark-outline" }
              : {
                  label: "Organisers",
                  value: savedOrganisersCount,
                  icon: "bookmark-outline",
                  onPress: () => onSelectTab("saved-organisers"),
                },
          ]}
        />
      </ProfileSection>

      <ProfileSection
        title="Next up"
        actionLabel={upcomingTickets.length > 1 ? "All tickets" : undefined}
        onAction={() => onSelectTab("tickets")}
      >
        {isLoading ? (
          <SectionState kind="loading" message="Loading your tickets…" />
        ) : upcomingTickets.length ? (
          <ProfileCard>
            <BookingRow
              booking={upcomingTickets[0]}
              onPress={() =>
                router.push({ pathname: "/ticket/[id]", params: { id: upcomingTickets[0].id } } as any)
              }
            />
          </ProfileCard>
        ) : (
          <SectionState
            kind="empty"
            icon="ticket-outline"
            title="No upcoming tickets"
            message="Tickets for events you book will show up here."
            actionLabel="Discover events"
            onAction={() => router.push("/search" as any)}
          />
        )}
      </ProfileSection>

      {awaitingReviewCount > 0 ? (
        <ProfileCard>
          <ProfileNavRow
            icon="star-outline"
            label="Rate your recent events"
            sublabel={`${awaitingReviewCount} ${awaitingReviewCount === 1 ? "event is" : "events are"} waiting for your review`}
            onPress={() => onSelectTab("reviews")}
          />
        </ProfileCard>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bookingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  bookingImage: { width: 48, height: 48, borderRadius: 10 },
  bookingCopy: { flex: 1, minWidth: 0, gap: 2 },
  bookingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bookingMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ticketCode: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
});
