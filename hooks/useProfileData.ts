import { useCallback, useMemo } from "react";

import type { Event } from "@/constants/events";
import { getAccountType, useAuth, type AccountType } from "@/context/AuthContext";
import { useBookings, type Booking } from "@/context/BookingsContext";
import { useEvents } from "@/context/EventsContext";

/**
 * Everything the profile screen renders, derived from the existing contexts.
 * Permissions (tabs, management, verification) live in `useAccountCapabilities`.
 *
 * BACKEND GAP:
 * Events carry only an `organizer` display name, no owner id, so published
 * events are matched by name. Replace with an owner filter once the API has one.
 */
export function useProfileData() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { bookings, isLoading: bookingsLoading, refreshBookings } = useBookings();
  const { events, isLoading: eventsLoading, error: eventsError, refreshEvents } = useEvents();

  const accountType: AccountType = getAccountType(user);
  const organisation = accountType === "business" ? user?.organisation : undefined;
  const isPublisher = accountType !== "customer";

  const today = new Date().toISOString().split("T")[0];

  const { upcomingTickets, pastBookings, recentBookings } = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    const byDate = (a: Booking, b: Booking) => a.eventDate.localeCompare(b.eventDate);
    return {
      upcomingTickets: active.filter((b) => b.status === "confirmed" && b.eventDate >= today).sort(byDate),
      pastBookings: active.filter((b) => b.eventDate < today),
      recentBookings: [...bookings].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
    };
  }, [bookings, today]);

  const savedEvents = useMemo(
    () => events.filter((e) => user?.savedEvents.includes(e.id)),
    [events, user?.savedEvents],
  );

  const publisherName = organisation?.name ?? (accountType === "individual" ? user?.username : undefined);
  const publishedEvents = useMemo<Event[]>(() => {
    if (!isPublisher || !publisherName) return [];
    const name = publisherName.trim().toLowerCase();
    return events.filter((e) => e.organizer.trim().toLowerCase() === name);
  }, [events, isPublisher, publisherName]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshBookings(), refreshEvents()]);
  }, [refreshBookings, refreshEvents]);

  return {
    user,
    isAuthenticated,
    accountType,
    organisation,
    location: user?.location ?? organisation?.location,
    upcomingTickets,
    pastBookings,
    recentBookings,
    savedEvents,
    publishedEvents,
    isLoading: authLoading,
    bookingsLoading: bookingsLoading && bookings.length === 0,
    eventsLoading: eventsLoading && events.length === 0,
    eventsError,
    refresh,
    refreshEvents,
  };
}
