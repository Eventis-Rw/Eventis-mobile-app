import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useFindLoveDemo, type LoveActivityType } from "@/context/FindLoveDemoContext";
import {
  apiListNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type ApiLoveNotification,
} from "@/services/findLoveApi";
import { USE_FINDLOVE_API } from "@/services/findLoveService";

/** How often the bell checks for new notifications while the app is open. */
const POLL_MS = 30_000;

/** One entry on the FindLove notifications page. */
export interface LoveNotification {
  id: string;
  type: LoveActivityType;
  title: string;
  description: string;
  /** ISO time (API), shown as "5m ago". */
  createdAt?: string;
  /** Ready-made time text (demo samples). */
  timeLabel?: string;
  read: boolean;
  /** The other member, for opening their chat. */
  profileId?: string;
  /** Which Inbox tab a request opens. */
  tab?: "received" | "sent";
}

interface FindLoveNotificationsValue {
  notifications: LoveNotification[];
  /** Unread count for the Home bell. Always 0 in the demo. */
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const FindLoveNotificationsContext = createContext<FindLoveNotificationsValue | null>(null);

export function FindLoveNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { activity } = useFindLoveDemo();
  const [items, setItems] = useState<LoveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(USE_FINDLOVE_API);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    if (!USE_FINDLOVE_API || !userId) return;
    try {
      const reply = await apiListNotifications();
      setItems(reply.items.map(fromApi));
      setUnreadCount(reply.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Notifications could not be loaded. Pull to refresh.");
    }
  }, [userId]);

  useEffect(() => {
    setItems([]);
    setUnreadCount(0);
    setError(null);
    if (!USE_FINDLOVE_API || !userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void refresh().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, POLL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId, refresh]);

  const markRead = useCallback((id: string) => {
    if (!USE_FINDLOVE_API) return;
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item || item.read) return;
    setItems((current) => current.map((entry) => (entry.id === id ? { ...entry, read: true } : entry)));
    setUnreadCount((count) => Math.max(0, count - 1));
    void apiMarkNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    if (!USE_FINDLOVE_API) return;
    setItems((current) => current.map((item) => (item.read ? item : { ...item, read: true })));
    setUnreadCount(0);
    void apiMarkAllNotificationsRead().catch(() => {});
  }, []);

  // The demo keeps its sample activity; it was never "unread".
  const demoItems = useMemo<LoveNotification[]>(
    () =>
      activity.map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        description: entry.description,
        timeLabel: entry.createdAt,
        read: true,
        tab: entry.tab,
      })),
    [activity],
  );

  const value = useMemo<FindLoveNotificationsValue>(
    () => ({
      notifications: USE_FINDLOVE_API ? items : demoItems,
      unreadCount: USE_FINDLOVE_API ? unreadCount : 0,
      isLoading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [items, demoItems, unreadCount, isLoading, error, refresh, markRead, markAllRead],
  );

  return <FindLoveNotificationsContext.Provider value={value}>{children}</FindLoveNotificationsContext.Provider>;
}

function fromApi(item: ApiLoveNotification): LoveNotification {
  return {
    id: item.id,
    type: item.kind === "request" ? "request" : "connection",
    title: item.title,
    description: item.body,
    createdAt: item.createdAt,
    read: !!item.readAt,
    ...(item.profileId ? { profileId: item.profileId } : {}),
    ...(item.tab ? { tab: item.tab } : {}),
  };
}

/** "Just now", "5m ago", "3h ago", "2d ago", then the date. */
export function notificationTimeLabel(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function useFindLoveNotifications() {
  const context = useContext(FindLoveNotificationsContext);
  if (!context) throw new Error("useFindLoveNotifications must be used within FindLoveNotificationsProvider");
  return context;
}
