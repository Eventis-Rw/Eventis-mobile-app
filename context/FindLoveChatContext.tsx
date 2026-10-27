import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { loadLoveChats, saveLoveChats, type LoveChatThreads } from "@/services/findLoveChatService";
import { countUnread, type LoveChatContent, type LoveChatMessage } from "@/utils/findLoveChat";

interface FindLoveChatContextValue {
  threads: LoveChatThreads;
  isLoading: boolean;
  /** Unread messages across every FindLove chat, for the Inbox badge. */
  totalUnread: number;
  sendMessage: (profileId: string, content: LoveChatContent) => void;
  /** Called while a chat is open so its messages stop counting as unread. */
  markRead: (profileId: string) => void;
}

const FindLoveChatContext = createContext<FindLoveChatContextValue | null>(null);

export function FindLoveChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [threads, setThreads] = useState<LoveChatThreads>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setThreads({});
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    loadLoveChats(userId)
      .then((loaded) => {
        if (!cancelled) setThreads(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const update = useCallback(
    (change: (current: LoveChatThreads) => LoveChatThreads) => {
      setThreads((current) => {
        const next = change(current);
        if (next !== current && userId) void saveLoveChats(userId, next).catch(() => {});
        return next;
      });
    },
    [userId],
  );

  const sendMessage = useCallback(
    (profileId: string, content: LoveChatContent) => {
      const sentAt = new Date().toISOString();
      const message = { ...content, id: `love-message-${Date.now()}`, sentAt, own: true } as LoveChatMessage;
      update((current) => ({
        ...current,
        // Replying means everything before it has been read.
        [profileId]: { messages: [...(current[profileId]?.messages ?? []), message], readAt: sentAt },
      }));
    },
    [update],
  );

  const markRead = useCallback(
    (profileId: string) => {
      update((current) => {
        const thread = current[profileId];
        if (!thread || countUnread(thread) === 0) return current;
        return { ...current, [profileId]: { ...thread, readAt: new Date().toISOString() } };
      });
    },
    [update],
  );

  const totalUnread = useMemo(
    () => Object.values(threads).reduce((sum, thread) => sum + countUnread(thread), 0),
    [threads],
  );

  const value = useMemo(
    () => ({ threads, isLoading, totalUnread, sendMessage, markRead }),
    [threads, isLoading, totalUnread, sendMessage, markRead],
  );

  return <FindLoveChatContext.Provider value={value}>{children}</FindLoveChatContext.Provider>;
}

export function useFindLoveChat() {
  const context = useContext(FindLoveChatContext);
  if (!context) throw new Error("useFindLoveChat must be used within FindLoveChatProvider");
  return context;
}
