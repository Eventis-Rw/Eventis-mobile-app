import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { EventCard } from "@/components/EventCard";
import {
  ProfileCard,
  ProfileNavRow,
  ProfileSection,
  ProfileStatGrid,
  SectionState,
} from "@/components/profile/ProfileSection";
import type { Event } from "@/constants/events";
import { getEventImage } from "@/constants/eventImages";
import type { Booking } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";
import type { Organisation } from "@/services/organiserService";
import type { ProfileTab } from "@/utils/accountCapabilities";

const PREVIEW_COUNT = 3;

const STATUS_COLOR = {
  confirmed: "success",
  pending: "warning",
  cancelled: "destructive",
} as const;

const today = () => new Date().toISOString().split("T")[0];

function formatBookingDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function BookingRow({ booking, showStatus }: { booking: Booking; showStatus?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const statusColor = colors[STATUS_COLOR[booking.status]];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/event/[id]", params: { id: booking.eventId } } as any)}
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
  isLoading: boolean;
  onSelectTab: (tab: ProfileTab) => void;
}

/** Customer overview: a summary that hands off to the dedicated tabs. */
export function CustomerOverview({
  upcomingTickets,
  pastBookings,
  savedEventsCount,
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
              value: pastBookings.length,
              icon: "checkmark-done-outline",
              onPress: () => onSelectTab("bookings"),
            },
            { label: "Saved events", value: savedEventsCount, icon: "bookmark-outline" },
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
            <BookingRow booking={upcomingTickets[0]} />
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
    </>
  );
}

interface PublishedEventsListProps {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  canManage: boolean;
  /** The overview shows a short preview that links to the full tab. */
  limit?: number;
  onSeeAll?: () => void;
}

export function PublishedEventsList({
  events,
  isLoading,
  error,
  onRetry,
  canManage,
  limit,
  onSeeAll,
}: PublishedEventsListProps) {
  const router = useRouter();
  const shown = limit ? events.slice(0, limit) : events;

  return (
    <ProfileSection
      title="Published events"
      actionLabel={onSeeAll && limit && events.length > limit ? "See all" : undefined}
      onAction={onSeeAll}
    >
      {isLoading ? (
        <SectionState kind="loading" message="Loading your events…" />
      ) : error && !events.length ? (
        <SectionState kind="error" message={error} onRetry={onRetry} />
      ) : events.length ? (
        <View style={styles.eventList}>
          {shown.map((event) => (
            <EventCard key={event.id} event={event} variant="compact" inset={0} />
          ))}
        </View>
      ) : (
        <SectionState
          kind="empty"
          icon="calendar-outline"
          title="No published events"
          message={canManage ? "Events you publish will appear on your profile." : "You haven't published any events yet."}
          actionLabel={canManage ? "Create event" : undefined}
          onAction={canManage ? () => router.push("/business/create-event" as any) : undefined}
        />
      )}
    </ProfileSection>
  );
}

function publisherStats(events: Event[]) {
  const now = today();
  return [
    { label: "Published", value: events.length, icon: "calendar-outline" as const },
    { label: "Upcoming", value: events.filter((e) => e.date >= now).length, icon: "time-outline" as const },
    { label: "Attendees", value: events.reduce((sum, e) => sum + e.attendees, 0), icon: "people-outline" as const },
  ];
}

/** Event management entry points; only rendered when the account has organiser access. */
export function EventManagementActions({ includeOrganisation }: { includeOrganisation?: boolean }) {
  const router = useRouter();
  return (
    <ProfileSection title="Manage">
      <ProfileCard>
        <ProfileNavRow
          icon="briefcase-outline"
          label="Organiser portal"
          sublabel="Your events, posts and stories"
          onPress={() => router.push("/business/dashboard" as any)}
        />
        <ProfileNavRow
          icon="add-circle-outline"
          label="Create event"
          sublabel="List a new event with tickets"
          onPress={() => router.push("/business/create-event" as any)}
        />
        {includeOrganisation ? (
          <ProfileNavRow
            icon="business-outline"
            label="Edit organisation"
            sublabel="Name, logo, description and website"
            onPress={() => router.push("/business/edit-organisation" as any)}
          />
        ) : null}
      </ProfileCard>
    </ProfileSection>
  );
}

function OrganisationDetails({ organisation, canManage }: { organisation: Organisation; canManage: boolean }) {
  const colors = useColors();
  const router = useRouter();

  const details: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string; onPress?: () => void }[] = [];
  if (organisation.activities) details.push({ icon: "pricetags-outline", text: organisation.activities });
  if (organisation.location) details.push({ icon: "location-outline", text: organisation.location });
  const website = organisation.website;
  if (website) {
    details.push({
      icon: "globe-outline",
      text: website.replace(/^https?:\/\//, ""),
      onPress: () => {
        const url = /^https?:\/\//.test(website) ? website : `https://${website}`;
        void Linking.openURL(url).catch(() => {});
      },
    });
  }

  return (
    <ProfileSection
      title="Organisation"
      actionLabel={canManage ? "Manage" : undefined}
      onAction={() => router.push("/business/organisation" as any)}
    >
      <ProfileCard>
        <View style={styles.orgBody}>
          {organisation.description ? (
            <Text style={[styles.orgDescription, { color: colors.foreground }]}>{organisation.description}</Text>
          ) : null}
          {details.map((detail) => (
            <Pressable
              key={detail.icon}
              onPress={detail.onPress}
              disabled={!detail.onPress}
              style={styles.orgDetail}
              accessibilityRole={detail.onPress ? "link" : "text"}
            >
              <Ionicons name={detail.icon} size={15} color={colors.mutedForeground} />
              <Text
                style={[styles.orgDetailText, { color: detail.onPress ? colors.primary : colors.mutedForeground }]}
                numberOfLines={2}
              >
                {detail.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </ProfileCard>
    </ProfileSection>
  );
}

interface PublisherOverviewProps {
  organisation?: Organisation;
  publishedEvents: Event[];
  eventsLoading: boolean;
  eventsError: string | null;
  onRetryEvents: () => void;
  canManage: boolean;
  onSelectTab: (tab: ProfileTab) => void;
}

/** Individual posters and businesses: stats, organisation identity and a preview of published events. */
export function PublisherOverview({ organisation, onSelectTab, ...props }: PublisherOverviewProps) {
  return (
    <>
      <ProfileSection title="At a glance">
        <ProfileStatGrid stats={publisherStats(props.publishedEvents)} />
      </ProfileSection>
      {organisation ? <OrganisationDetails organisation={organisation} canManage={props.canManage} /> : null}
      <PublishedEventsList
        events={props.publishedEvents}
        isLoading={props.eventsLoading}
        error={props.eventsError}
        onRetry={props.onRetryEvents}
        canManage={props.canManage}
        limit={PREVIEW_COUNT}
        onSeeAll={() => onSelectTab("published")}
      />
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
  eventList: { gap: 10 },
  orgBody: { paddingVertical: 12, gap: 8 },
  orgDescription: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  orgDetail: { flexDirection: "row", alignItems: "center", gap: 8 },
  orgDetailText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1 },
});
