import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { GlassSurface } from "@/components/GlassSurface";
import { BookingRow } from "@/components/profile/ProfileActivity";
import { FilterChips, InlineError, ProfileCard, ProfileSection, SectionState } from "@/components/profile/ProfileSection";
import { ReviewSheet, StarRating } from "@/components/profile/ReviewSheet";
import { TicketCard } from "@/components/TicketCard";
import type { Event } from "@/constants/events";
import type { Booking } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";
import type { useMyReviews } from "@/hooks/useMyReviews";
import type { useSavedOrganisers } from "@/hooks/useSavedOrganisers";
import type { Review, SavedOrganiser } from "@/services/profileService";
import { eventsByOrganiser, groupBookings, type BookingGroup } from "@/utils/customerProfile";
import { localToday } from "@/utils/dates";

type SavedOrganisersState = ReturnType<typeof useSavedOrganisers>;
type ReviewsState = ReturnType<typeof useMyReviews>;

const today = () => localToday();

function useOpeners() {
  const router = useRouter();
  return {
    openBooking: (b: Booking) =>
      router.push({ pathname: "/booking/[id]", params: { id: b.eventId, bookingId: b.id } } as any),
    openTicket: (b: Booking) => router.push({ pathname: "/ticket/[id]", params: { id: b.id } } as any),
    openOrganiser: (o: Pick<SavedOrganiser, "id" | "name">) =>
      router.push({ pathname: "/organiser-profile/[id]", params: { id: o.id, name: o.name } } as any),
    discover: () => router.push("/search" as any),
  };
}

function formatShortDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// My Bookings
// ---------------------------------------------------------------------------

const BOOKING_FILTERS: { key: BookingGroup; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const BOOKING_EMPTY: Record<BookingGroup, { title: string; message: string }> = {
  upcoming: { title: "No upcoming bookings", message: "Events you book or reserve will show up here." },
  past: { title: "No past bookings", message: "Events you've attended will show up here." },
  cancelled: { title: "No cancelled bookings", message: "Bookings you cancel will show up here." },
};

export function MyBookingsTab({ bookings, isLoading }: { bookings: Booking[]; isLoading: boolean }) {
  const { openBooking, discover } = useOpeners();
  const [filter, setFilter] = useState<BookingGroup>("upcoming");
  const groups = useMemo(() => groupBookings(bookings, today()), [bookings]);
  const shown = groups[filter];

  return (
    <ProfileSection title="My bookings">
      <FilterChips
        options={BOOKING_FILTERS.map((f) => ({ ...f, count: groups[f.key].length }))}
        active={filter}
        onChange={setFilter}
      />
      {isLoading ? (
        <SectionState kind="loading" message="Loading your bookings…" />
      ) : shown.length ? (
        <ProfileCard>
          {shown.map((booking) => (
            <BookingRow key={booking.id} booking={booking} showStatus onPress={() => openBooking(booking)} />
          ))}
        </ProfileCard>
      ) : (
        <SectionState
          kind="empty"
          icon="receipt-outline"
          title={BOOKING_EMPTY[filter].title}
          message={BOOKING_EMPTY[filter].message}
          actionLabel={filter === "upcoming" ? "Discover events" : undefined}
          onAction={filter === "upcoming" ? discover : undefined}
        />
      )}
    </ProfileSection>
  );
}

// ---------------------------------------------------------------------------
// My Tickets
// ---------------------------------------------------------------------------

export function MyTicketsTab({
  upcomingTickets,
  pastBookings,
  isLoading,
}: {
  upcomingTickets: Booking[];
  pastBookings: Booking[];
  isLoading: boolean;
}) {
  const { openTicket, discover } = useOpeners();
  const pastTickets = pastBookings.filter((b) => b.status === "confirmed");

  if (isLoading) return <SectionState kind="loading" message="Loading your tickets…" />;

  return (
    <>
      <ProfileSection title="Upcoming tickets">
        {upcomingTickets.length ? (
          <View>
            {upcomingTickets.map((booking, index) => (
              <TicketCard key={booking.id} booking={booking} index={index} onPress={() => openTicket(booking)} />
            ))}
          </View>
        ) : (
          <SectionState
            kind="empty"
            icon="ticket-outline"
            title="No upcoming tickets"
            message="Your digital tickets appear here as soon as a booking is confirmed."
            actionLabel="Discover events"
            onAction={discover}
          />
        )}
      </ProfileSection>

      {pastTickets.length ? (
        <ProfileSection title="Past tickets">
          <ProfileCard>
            {pastTickets.map((booking) => (
              <BookingRow key={booking.id} booking={booking} onPress={() => openTicket(booking)} />
            ))}
          </ProfileCard>
        </ProfileSection>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Saved Organisers
// ---------------------------------------------------------------------------

export function SavedOrganisersTab({ saved, events }: { saved: SavedOrganisersState; events: Event[] }) {
  const colors = useColors();
  const { openOrganiser, discover } = useOpeners();
  const [removing, setRemoving] = useState<SavedOrganiser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const now = today();

  const confirmRemove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    setActionError(await saved.toggle(target));
  };

  let body: React.ReactNode;
  if (saved.isLoading) {
    body = <SectionState kind="loading" message="Loading saved organisers…" />;
  } else if (saved.error && !saved.organisers.length) {
    body = <SectionState kind="error" message={saved.error} onRetry={() => void saved.refresh()} />;
  } else if (!saved.organisers.length) {
    body = (
      <SectionState
        kind="empty"
        icon="bookmark-outline"
        title="No saved organisers yet"
        message="Tap Save organiser on an event page to keep the hosts you like in one place."
        actionLabel="Discover events"
        onAction={discover}
      />
    );
  } else {
    body = (
      <ProfileCard>
        {saved.organisers.map((organiser) => {
          const upcoming = eventsByOrganiser(events, organiser.id).filter((e) => e.date >= now).length;
          const meta = [
            organiser.type === "business" ? "Business" : organiser.type === "individual" ? "Individual host" : null,
            organiser.location,
            upcoming ? `${upcoming} upcoming ${upcoming === 1 ? "event" : "events"}` : "No upcoming events",
          ].filter(Boolean);
          return (
            <View key={organiser.id} style={styles.orgRow}>
              <Pressable
                onPress={() => openOrganiser(organiser)}
                style={({ pressed }) => [styles.orgMain, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`${organiser.name}. ${meta.join(", ")}`}
              >
                <OrganiserAvatar name={organiser.name} />
                <View style={styles.orgCopy}>
                  <Text style={[styles.orgName, { color: colors.foreground }]} numberOfLines={1}>
                    {organiser.name}
                  </Text>
                  <Text style={[styles.orgMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {meta.join(" · ")}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setRemoving(organiser)}
                disabled={saved.isPending(organiser.id)}
                hitSlop={8}
                style={styles.iconAction}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${organiser.name} from saved organisers`}
              >
                {saved.isPending(organiser.id) ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="bookmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            </View>
          );
        })}
      </ProfileCard>
    );
  }

  return (
    <ProfileSection title="Saved organisers">
      {actionError ? <InlineError message={actionError} /> : null}
      {body}
      <ChatConfirmDialog
        visible={!!removing}
        title="Remove saved organiser?"
        description={removing ? `${removing.name} will be removed from your saved organisers.` : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoving(null)}
      />
    </ProfileSection>
  );
}

export function OrganiserAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${colors.primary}1F` },
      ]}
    >
      <Text style={[styles.avatarLetter, { color: colors.primary, fontSize: size * 0.4 }]}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// My Reviews
// ---------------------------------------------------------------------------

interface ReviewTarget {
  eventId: string;
  eventTitle: string;
  rating?: number;
  comment?: string;
}

export function MyReviewsTab({
  reviews,
  awaitingReview,
  bookingsLoading,
}: {
  reviews: ReviewsState;
  /** Attended events without a review yet (see `reviewableBookings`). */
  awaitingReview: Booking[];
  bookingsLoading: boolean;
}) {
  const colors = useColors();
  const { discover } = useOpeners();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await reviews.remove(deleting.id);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "We couldn't delete this review.");
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  };

  if (reviews.isLoading || bookingsLoading) return <SectionState kind="loading" message="Loading your reviews…" />;

  return (
    <>
      {awaitingReview.length ? (
        <ProfileSection title="Waiting for your review">
          <ProfileCard>
            {awaitingReview.map((booking) => (
              <View key={booking.eventId} style={styles.awaitRow}>
                <View style={styles.orgCopy}>
                  <Text style={[styles.orgName, { color: colors.foreground }]} numberOfLines={1}>
                    {booking.eventTitle}
                  </Text>
                  <Text style={[styles.orgMeta, { color: colors.mutedForeground }]}>
                    Attended {formatShortDate(booking.eventDate)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setTarget({ eventId: booking.eventId, eventTitle: booking.eventTitle })}
                  style={({ pressed }) => [styles.rateBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${booking.eventTitle}`}
                >
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.rateBtnText}>Rate</Text>
                </Pressable>
              </View>
            ))}
          </ProfileCard>
        </ProfileSection>
      ) : null}

      <ProfileSection title="Your reviews">
        {actionError ? <InlineError message={actionError} /> : null}
        {reviews.error && !reviews.reviews.length ? (
          <SectionState kind="error" message={reviews.error} onRetry={() => void reviews.refresh()} />
        ) : reviews.reviews.length ? (
          <View style={styles.reviewList}>
            {reviews.reviews.map((review) => (
              <GlassSurface key={review.id} style={styles.reviewCard}>
                <Text style={[styles.orgName, { color: colors.foreground }]} numberOfLines={2}>
                  {review.eventTitle}
                </Text>
                <View style={styles.reviewMetaRow}>
                  <StarRating rating={review.rating} size={15} />
                  <Text style={[styles.orgMeta, { color: colors.mutedForeground }]}>
                    {formatShortDate(review.createdAt)}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.foreground }]}>{review.comment}</Text>
                ) : null}
                <View style={styles.reviewActions}>
                  <TextAction
                    icon="create-outline"
                    label="Edit"
                    onPress={() =>
                      setTarget({
                        eventId: review.eventId,
                        eventTitle: review.eventTitle,
                        rating: review.rating,
                        comment: review.comment,
                      })
                    }
                  />
                  <TextAction icon="trash-outline" label="Delete" destructive onPress={() => setDeleting(review)} />
                </View>
              </GlassSurface>
            ))}
          </View>
        ) : (
          <SectionState
            kind="empty"
            icon="star-outline"
            title="No reviews yet"
            message={
              awaitingReview.length
                ? "Rate an event you attended to help others choose."
                : "After you attend an event, you can rate it here."
            }
            actionLabel={awaitingReview.length ? undefined : "Discover events"}
            onAction={awaitingReview.length ? undefined : discover}
          />
        )}
      </ProfileSection>

      <ReviewSheet
        visible={!!target}
        eventTitle={target?.eventTitle ?? ""}
        initialRating={target?.rating}
        initialComment={target?.comment}
        onClose={() => setTarget(null)}
        onSubmit={async (rating, comment) => {
          if (!target) return;
          await reviews.submit({ eventId: target.eventId, eventTitle: target.eventTitle, rating, comment });
        }}
      />
      <ChatConfirmDialog
        visible={!!deleting}
        title="Delete review?"
        description="Your rating and comment for this event will be removed."
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function TextAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  const color = destructive ? colors.destructive : colors.primary;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.textAction} accessibilityRole="button">
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.textActionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orgRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orgMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  orgCopy: { flex: 1, minWidth: 0, gap: 2 },
  orgName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  orgMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontFamily: "Inter_700Bold" },
  awaitRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 999,
  },
  rateBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewList: { gap: 10 },
  reviewCard: { padding: 14, gap: 6 },
  reviewMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewComment: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  reviewActions: { flexDirection: "row", gap: 18, marginTop: 4 },
  textAction: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  textActionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
