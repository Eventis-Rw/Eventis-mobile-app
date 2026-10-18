import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { fetchPublisherEvents, type PublisherEvent } from "@/services/publisherService";

/** Refresh the current publisher's events when a portal tab regains focus. */
export function useOrganiserEvents() {
  const { user } = useAuth();
  const ownerId = user?.id;
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;
  const request = useRef(0);
  const [state, setState] = useState<{ ownerId?: string; events: PublisherEvent[]; loading: boolean; hasLoaded: boolean; error: string | null }>({
    ownerId, events: [], loading: !!ownerId, hasLoaded: false, error: null,
  });

  const refresh = useCallback(async () => {
    const version = ++request.current;
    if (!ownerId) {
      setState({ ownerId, events: [], loading: false, hasLoaded: true, error: null });
      return;
    }
    setState((previous) => ({ ownerId, events: previous.ownerId === ownerId ? previous.events : [], hasLoaded: previous.ownerId === ownerId && previous.hasLoaded, loading: true, error: null }));
    try {
      const events = await fetchPublisherEvents(ownerId);
      if (version !== request.current || currentOwner.current !== ownerId) return;
      setState({ ownerId, events: events.filter((event) => event.ownerId === ownerId), loading: false, hasLoaded: true, error: null });
    } catch (error) {
      if (version !== request.current || currentOwner.current !== ownerId) return;
      setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : "Your events could not be loaded." }));
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]));

  return {
    events: state.ownerId === ownerId ? state.events : [],
    isLoading: state.ownerId === ownerId ? state.loading : !!ownerId,
    hasLoaded: state.ownerId === ownerId && state.hasLoaded,
    error: state.ownerId === ownerId ? state.error : null,
    refresh,
  };
}
