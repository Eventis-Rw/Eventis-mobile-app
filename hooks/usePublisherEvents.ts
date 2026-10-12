import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";

import type { Event } from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { describeProfileError } from "@/services/profileService";
import { localToday } from "@/utils/dates";
import {
  deletePublisherEvent,
  fetchPublisherEvents,
  setPublisherEventStatus,
  type PublisherEvent,
  type PublisherEventStatus,
} from "@/services/publisherService";

export interface ManagedEvent {
  event: Event;
  /** `listed` = found in public listings by organiser name; we can't change it from the app. */
  status: PublisherEventStatus | "listed";
  /** Whether this account can edit, pause or delete it here. */
  manageable: boolean;
}

/**
 * A publisher's events: their own records from the publisher service, plus any
 * public listing that matches their name (until events carry an owner id).
 * Upcoming events come first (soonest first), then past ones (newest first).
 */
export function usePublisherEvents({
  active,
  listedEvents,
}: {
  active: boolean;
  /** Name-matched public events from `useProfileData`. */
  listedEvents: Event[];
}) {
  const { user } = useAuth();
  const { refreshEvents } = useEvents();
  const userId = user?.id;
  const enabled = active && !!userId;

  const [own, setOwn] = useState<PublisherEvent[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setOwn([]);
      setIsLoading(false);
      return;
    }
    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      setOwn(await fetchPublisherEvents(userId));
      hasLoaded.current = true;
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your events."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const items = useMemo<ManagedEvent[]>(() => {
    const ownIds = new Set(own.map((e) => e.id));
    const all: ManagedEvent[] = [
      ...own.map((event) => ({ event, status: event.status, manageable: true })),
      ...listedEvents
        .filter((e) => !ownIds.has(e.id))
        .map((event) => ({ event, status: "listed" as const, manageable: false })),
    ];
    const today = localToday();
    const upcoming = all.filter((m) => m.event.date >= today).sort((a, b) => a.event.date.localeCompare(b.event.date));
    const past = all.filter((m) => m.event.date < today).sort((a, b) => b.event.date.localeCompare(a.event.date));
    return [...upcoming, ...past];
  }, [own, listedEvents]);

  const withPending = useCallback(async (eventId: string, run: () => Promise<void>) => {
    setPendingIds((ids) => [...ids, eventId]);
    try {
      await run();
    } finally {
      setPendingIds((ids) => ids.filter((id) => id !== eventId));
    }
  }, []);

  /** Pause or resume. Optimistic; rolls back and resolves to the error message on failure. */
  const setStatus = useCallback(
    async (eventId: string, status: PublisherEventStatus): Promise<string | null> => {
      if (!userId) return "Sign in to manage events.";
      const previous = own;
      setOwn((list) => list.map((e) => (e.id === eventId ? { ...e, status } : e)));
      let message: string | null = null;
      await withPending(eventId, async () => {
        try {
          const updated = await setPublisherEventStatus(userId, eventId, status);
          setOwn((list) => list.map((e) => (e.id === eventId ? updated : e)));
          void refreshEvents();
        } catch (err) {
          setOwn(previous);
          message = describeProfileError(err, "We couldn't update this event.");
        }
      });
      return message;
    },
    [userId, own, withPending, refreshEvents],
  );

  /** Deletes for good. Not optimistic: the row stays until the server confirms. */
  const remove = useCallback(
    async (eventId: string): Promise<string | null> => {
      if (!userId) return "Sign in to manage events.";
      let message: string | null = null;
      await withPending(eventId, async () => {
        try {
          await deletePublisherEvent(userId, eventId);
          setOwn((list) => list.filter((e) => e.id !== eventId));
          void refreshEvents();
        } catch (err) {
          message = describeProfileError(err, "We couldn't delete this event.");
        }
      });
      return message;
    },
    [userId, withPending, refreshEvents],
  );

  return {
    items,
    isLoading,
    error,
    refresh,
    setStatus,
    remove,
    isPending: (eventId: string) => pendingIds.includes(eventId),
  };
}
