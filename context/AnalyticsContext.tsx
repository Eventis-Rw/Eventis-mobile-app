import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import type { Event } from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import { ANALYTICS_KEY, getAnalyticsRecords, recordAnalytics, subscribeAnalytics, type AnalyticsInput, type AnalyticsRecord, type AnalyticsSource, type AnalyticsType } from "@/services/analyticsService";
import { api } from "@/utils/apiClient";

const SERVER_ANALYTICS_TYPES: Partial<Record<AnalyticsType, "IMPRESSION" | "VIEW" | "CLICK" | "SAVE" | "SHARE" | "WEBSITE_CLICK">> = {
  feed_view: "IMPRESSION",
  detail_view: "VIEW",
  save: "SAVE",
  share: "SHARE",
  link_copy: "CLICK",
  directions_click: "CLICK",
  website_click: "WEBSITE_CLICK",
  story_event_click: "CLICK",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnalyticsState = {
  records: AnalyticsRecord[]; loading: boolean; error: string | null; foreground: boolean;
  refresh: () => Promise<void>;
  track: (input: Omit<AnalyticsInput, "viewerId">) => void;
  trackEvent: (event: Event, type: AnalyticsType, source: AnalyticsSource) => void;
};
const AnalyticsContext = createContext<AnalyticsState | null>(null);
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<AnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === "active" || AppState.currentState == null);
  const refresh = useCallback(async () => {
    try { setRecords(await getAnalyticsRecords()); setError(null); }
    catch { setError("Device activity couldn't be loaded. Try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeAnalytics((next) => { setRecords(next); setError(null); });
    const app = AppState.addEventListener("change", (state) => {
      setForeground(state === "active"); if (state === "active") void refresh();
    });
    const browser = Platform.OS === "web" && typeof document !== "undefined" && typeof window.addEventListener === "function";
    const visibility = () => setForeground(document.visibilityState === "visible");
    const storage = (event: StorageEvent) => { if (event.key === ANALYTICS_KEY) void refresh(); };
    if (browser) { visibility(); document.addEventListener("visibilitychange", visibility); window.addEventListener("storage", storage); }
    return () => { unsubscribe(); app.remove(); if (browser) { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("storage", storage); } };
  }, [refresh]);
  const track = useCallback((input: Omit<AnalyticsInput, "viewerId">) => {
    if (!foreground) return;
    const serverType = input.entityType === "event" ? SERVER_ANALYTICS_TYPES[input.type] : undefined;
    void recordAnalytics({ ...input, viewerId: user?.id }).then((recorded) => {
      if (!recorded || !serverType || !UUID.test(input.entityId) || user?.isDemo) return;
      return api.post(`/api/v1/events/${input.entityId}/analytics`, {
        type: serverType,
        source: input.source,
      }).catch(() => undefined);
    }).catch(() => setError("Activity couldn't be saved on this device."));
  }, [user?.id, user?.isDemo, foreground]);
  const trackEvent = useCallback((event: Event, type: AnalyticsType, source: AnalyticsSource) => {
    const ownName = user?.organisation?.name ?? user?.businessName;
    if ((event.ownerId && event.ownerId === user?.id) || (ownName && ownName.trim().toLowerCase() === event.organizer.trim().toLowerCase())) return;
    track({ type, entityType: "event", entityId: event.id, ownerId: event.ownerId, organisationId: event.organisationId, source });
  }, [track, user?.id, user?.organisation?.name, user?.businessName]);
  const value = useMemo(() => ({ records, loading, error, foreground, refresh, track, trackEvent }), [records, loading, error, foreground, refresh, track, trackEvent]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
export function useAnalytics() {
  const state = useContext(AnalyticsContext);
  if (!state) throw new Error("useAnalytics must be used inside AnalyticsProvider");
  return state;
}
