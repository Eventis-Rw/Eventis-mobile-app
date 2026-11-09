import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { fetchEventAnalytics, type EventAnalyticsOverview } from "@/services/eventAnalyticsService";

export function useEventAnalytics(days = 30) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;
  const request = useRef(0);
  const [state, setState] = useState<{
    ownerId?: string;
    overview: EventAnalyticsOverview | null;
    loading: boolean;
    error: string | null;
  }>({ ownerId, overview: null, loading: !!ownerId, error: null });

  const refresh = useCallback(async () => {
    const version = ++request.current;
    if (!ownerId) {
      setState({ ownerId, overview: null, loading: false, error: null });
      return;
    }
    setState((previous) => ({
      ownerId,
      overview: previous.ownerId === ownerId ? previous.overview : null,
      loading: true,
      error: null,
    }));
    try {
      const overview = await fetchEventAnalytics(days);
      if (version !== request.current || currentOwner.current !== ownerId) return;
      setState({ ownerId, overview, loading: false, error: null });
    } catch (error) {
      if (version !== request.current || currentOwner.current !== ownerId) return;
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : "Analytics could not be loaded.",
      }));
    }
  }, [ownerId, days]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]));

  const stats = new Map(
    (state.ownerId === ownerId ? state.overview?.events ?? [] : []).map((event) => [event.eventId, event] as const),
  );

  return {
    overview: state.ownerId === ownerId ? state.overview : null,
    stats,
    isLoading: state.ownerId === ownerId ? state.loading : !!ownerId,
    error: state.ownerId === ownerId ? state.error : null,
    refresh,
  };
}
