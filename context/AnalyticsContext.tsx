import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import type { Event } from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import { ANALYTICS_KEY, getAnalyticsRecords, recordAnalytics, subscribeAnalytics, type AnalyticsInput, type AnalyticsRecord, type AnalyticsSource, type AnalyticsType } from "@/services/analyticsService";

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
    void recordAnalytics({ ...input, viewerId: user?.id }).catch(() => setError("Activity couldn't be saved on this device."));
  }, [user?.id, foreground]);
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
