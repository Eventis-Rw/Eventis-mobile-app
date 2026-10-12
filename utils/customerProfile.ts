import type { Event } from "@/constants/events";
import type { Booking } from "@/context/BookingsContext";
import { organiserIdFromName, type Review } from "@/services/profileService";

export type BookingGroup = "upcoming" | "past" | "cancelled";

/** Splits bookings for the My Bookings tab: upcoming soonest first, past and cancelled newest first. */
export function groupBookings(bookings: Booking[], today: string): Record<BookingGroup, Booking[]> {
  const ascending = (a: Booking, b: Booking) => a.eventDate.localeCompare(b.eventDate);
  const descending = (a: Booking, b: Booking) => b.eventDate.localeCompare(a.eventDate);
  return {
    upcoming: bookings.filter((b) => b.status !== "cancelled" && b.eventDate >= today).sort(ascending),
    past: bookings.filter((b) => b.status !== "cancelled" && b.eventDate < today).sort(descending),
    cancelled: bookings.filter((b) => b.status === "cancelled").sort(descending),
  };
}

/**
 * Attended events the customer hasn't reviewed yet: confirmed, already happened,
 * one entry per event (several bookings of the same event need one review).
 */
export function reviewableBookings(bookings: Booking[], reviews: Review[], today: string): Booking[] {
  const reviewed = new Set(reviews.map((r) => r.eventId));
  const seen = new Set<string>();
  return bookings
    .filter((b) => b.status === "confirmed" && b.eventDate < today)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    .filter((b) => {
      if (reviewed.has(b.eventId) || seen.has(b.eventId)) return false;
      seen.add(b.eventId);
      return true;
    });
}

/** Events hosted by an organiser, matched by display name until events carry an owner id. */
export function eventsByOrganiser(events: Event[], organiserId: string): Event[] {
  return events.filter((e) => organiserIdFromName(e.organizer) === organiserId);
}

/**
 * Deterministic square pattern derived from a ticket code, so the same ticket
 * always renders the same pass. It is a visual stand-in, not a scannable QR:
 * door check-in matches the ticket code until the API issues a QR payload.
 */
export function ticketPattern(code: string, size: number): boolean[][] {
  // FNV-1a seed, then a xorshift stream for the cells.
  let seed = 2166136261;
  for (let i = 0; i < code.length; i++) {
    seed ^= code.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };

  const finder = (r: number, c: number) => {
    const corners: [number, number][] = [
      [0, 0],
      [0, size - 3],
      [size - 3, 0],
    ];
    return corners.some(([cr, cc]) => r >= cr && r < cr + 3 && c >= cc && c < cc + 3);
  };

  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (finder(r, c) ? true : next() % 100 < 50)),
  );
}
