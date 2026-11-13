import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { USE_PROFILE_API } from "@/services/profileService";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/services/notificationService";

export type PopupNotification = {
  id: string;
  title: string;
  body: string;
  category?: string;
  data?: Record<string, unknown> | null;
};

type NotificationsContextValue = {
  notifications: ApiNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  popup: PopupNotification | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissPopup: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 20000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated && !!user && !user.isDemo && USE_PROFILE_API;

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupNotification | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissPopup = useCallback(() => setPopup(null), []);

  const showPopup = useCallback((n: ApiNotification) => {
    setPopup({ id: n.id, title: n.title, body: n.body, category: n.category, data: n.data ?? null });
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPopup(null), 4500);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      initializedRef.current = false;
      knownIdsRef.current = new Set();
      return;
    }
    try {
      setError(null);
      const [list, unread] = await Promise.all([
        fetchNotifications({ page: 1, limit: 50 }),
        fetchNotifications({ page: 1, limit: 1, unreadOnly: true }),
      ]);
      const items = list.items ?? [];
      setNotifications(items);
      setUnreadCount(unread.total ?? 0);

      const known = knownIdsRef.current;
      if (!initializedRef.current) {
        items.forEach((n) => known.add(n.id));
        initializedRef.current = true;
      } else {
        const fresh = items.find((n) => !known.has(n.id) && !n.readAt);
        items.forEach((n) => known.add(n.id));
        if (fresh) showPopup(fresh);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, showPopup]);

  useEffect(() => {
    setIsLoading(!!enabled);
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, refresh]);

  useEffect(() => () => { if (popupTimerRef.current) clearTimeout(popupTimerRef.current); }, []);

  const markRead = useCallback(async (id: string) => {
    if (!enabled) return;
    const wasUnread = notifications.find((n) => n.id === id && !n.readAt);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch {
      void refresh();
    }
  }, [enabled, notifications, refresh]);

  const markAllRead = useCallback(async () => {
    if (!enabled) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void refresh();
    }
  }, [enabled, refresh]);

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    popup,
    refresh,
    markRead,
    markAllRead,
    dismissPopup,
  }), [notifications, unreadCount, isLoading, error, popup, refresh, markRead, markAllRead, dismissPopup]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
