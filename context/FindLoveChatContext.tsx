import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/context/AuthContext";
import {
  apiChatMessages,
  apiListChats,
  apiMarkChatRead,
  apiSendChatMessage,
  type ApiLoveChatMessage,
} from "@/services/findLoveApi";
import { loadLoveChats, saveLoveChats, type LoveChatThreads } from "@/services/findLoveChatService";
import { USE_FINDLOVE_API } from "@/services/findLoveService";
import { countUnread, type LoveChatContent, type LoveChatMessage } from "@/utils/findLoveChat";

/** How often the Inbox checks for new chats, and an open chat for new messages. */
const INBOX_POLL_MS = 20_000;
const OPEN_CHAT_POLL_MS = 5_000;

interface FindLoveChatContextValue {
  threads: LoveChatThreads;
  isLoading: boolean;
  /** Unread messages across every FindLove chat, for the Inbox badge. */
  totalUnread: number;
  /** Sends a message. Rejects with a readable error when it could not be sent. */
  sendMessage: (profileId: string, content: LoveChatContent) => Promise<void>;
  /**
   * Keeps the message another member sent with their request in the chat, at
   * the start, once. Safe to call again. (The server does this itself in API mode.)
   */
  keepRequestMessage: (profileId: string, text: string) => void;
  /** Called while a chat is open so its messages stop counting as unread. */
  markRead: (profileId: string) => void;
  /**
   * Loads a chat's messages and keeps checking for new ones until the returned
   * cleanup runs. Call it while the chat screen is open.
   */
  watchChat: (profileId: string) => () => void;
  /** Reloads the chat list now (for pull to refresh). */
  refreshChats: () => Promise<void>;
}

const FindLoveChatContext = createContext<FindLoveChatContextValue | null>(null);

export function FindLoveChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [threads, setThreads] = useState<LoveChatThreads>({});
  const [isLoading, setIsLoading] = useState(true);
  /** The chat the member has open; the Inbox poll leaves its full history alone. */
  const openChatId = useRef<string | null>(null);
  /** Chats behind a waiting request: shown under Received/Sent, so not counted in the badge. */
  const [pendingChatIds, setPendingChatIds] = useState<Set<string>>(() => new Set());
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  // ---- Loading ------------------------------------------------------------------

  const refreshChats = useCallback(async () => {
    if (!USE_FINDLOVE_API || !userId) return;
    const summaries = await apiListChats();
    // A waiting request holds at most one message from each side, so load those
    // in full: the Received/Sent cards show both the note and the reply.
    const pendingIds = summaries.filter((summary) => summary.connectionStatus !== "ACCEPTED").map((summary) => summary.profileId);
    const pendingMessages = new Map(
      await Promise.all(
        pendingIds.map(async (profileId) => [profileId, (await apiChatMessages(profileId, { limit: 10 })).items] as const),
      ),
    );
    setPendingChatIds(new Set(pendingIds));
    setThreads((current) => {
      const next: LoveChatThreads = {};
      for (const summary of summaries) {
        const existing = current[summary.profileId];
        if (summary.profileId === openChatId.current && existing) {
          next[summary.profileId] = existing;
          continue;
        }
        const full = pendingMessages.get(summary.profileId);
        next[summary.profileId] = full
          ? { messages: full.map(toChatMessage), readAt: summary.readAt ?? undefined }
          : {
              messages: summary.lastMessage ? [toChatMessage(summary.lastMessage)] : [],
              readAt: summary.readAt ?? undefined,
              unreadCount: summary.unreadCount,
            };
      }
      // A chat that is open but has no messages yet is not in the list; keep it.
      const open = openChatId.current;
      if (open && current[open] && !next[open]) next[open] = current[open];
      return next;
    });
  }, [userId]);

  useEffect(() => {
    setThreads({});
    setPendingChatIds(new Set());
    openChatId.current = null;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const load = USE_FINDLOVE_API
      ? refreshChats()
      : loadLoveChats(userId).then((loaded) => {
          if (!cancelled) setThreads(loaded);
        });
    load
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshChats]);

  // Keep the Inbox badge fresh while the app is in the foreground.
  useEffect(() => {
    if (!USE_FINDLOVE_API || !userId) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refreshChats().catch(() => {});
    }, INBOX_POLL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshChats().catch(() => {});
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId, refreshChats]);

  const loadChat = useCallback(async (profileId: string) => {
    const reply = await apiChatMessages(profileId);
    setThreads((current) => {
      const existing = current[profileId];
      const serverIds = new Set(reply.items.flatMap((message) => [message.id, message.clientMessageId ?? ""]));
      // Messages still on their way to the server stay at the end.
      const sending = (existing?.messages ?? []).filter(
        (message) => message.id.startsWith("local-") && !serverIds.has(message.id.slice("local-".length)),
      );
      return {
        ...current,
        [profileId]: { messages: [...reply.items.map(toChatMessage), ...sending], readAt: existing?.readAt },
      };
    });
  }, []);

  const watchChat = useCallback(
    (profileId: string) => {
      if (!USE_FINDLOVE_API || !userId) return () => {};
      openChatId.current = profileId;
      void loadChat(profileId).catch(() => {});
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void loadChat(profileId).catch(() => {});
      }, OPEN_CHAT_POLL_MS);
      return () => {
        clearInterval(timer);
        if (openChatId.current === profileId) openChatId.current = null;
        void refreshChats().catch(() => {});
      };
    },
    [userId, loadChat, refreshChats],
  );

  // ---- Changes ------------------------------------------------------------------

  /** Demo mode: change the threads and save them on the device. */
  const update = useCallback(
    (change: (current: LoveChatThreads) => LoveChatThreads) => {
      setThreads((current) => {
        const next = change(current);
        if (next !== current && userId && !USE_FINDLOVE_API) void saveLoveChats(userId, next).catch(() => {});
        return next;
      });
    },
    [userId],
  );

  const sendMessage = useCallback(
    async (profileId: string, content: LoveChatContent) => {
      const sentAt = new Date().toISOString();
      if (!USE_FINDLOVE_API) {
        const message = { ...content, id: `love-message-${Date.now()}`, sentAt, own: true } as LoveChatMessage;
        update((current) => ({
          ...current,
          // Replying means everything before it has been read.
          [profileId]: { messages: [...(current[profileId]?.messages ?? []), message], readAt: sentAt },
        }));
        return;
      }
      if (content.kind !== "text") {
        throw new Error("Voice notes and files can't be sent on FindLove yet. Send a text message instead.");
      }
      const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const localId = `local-${clientMessageId}`;
      const pending: LoveChatMessage = { kind: "text", text: content.text, id: localId, sentAt, own: true };
      setThreads((current) => ({
        ...current,
        [profileId]: {
          messages: [...(current[profileId]?.messages ?? []), pending],
          readAt: sentAt,
        },
      }));
      try {
        const saved = toChatMessage(await apiSendChatMessage(profileId, content.text, clientMessageId));
        setThreads((current) => {
          const thread = current[profileId];
          if (!thread) return current;
          const messages = thread.messages.some((message) => message.id === saved.id)
            ? thread.messages.filter((message) => message.id !== localId)
            : thread.messages.map((message) => (message.id === localId ? saved : message));
          return { ...current, [profileId]: { ...thread, messages } };
        });
      } catch (error) {
        setThreads((current) => {
          const thread = current[profileId];
          if (!thread) return current;
          return { ...current, [profileId]: { ...thread, messages: thread.messages.filter((message) => message.id !== localId) } };
        });
        throw error instanceof Error ? error : new Error("Your message wasn't sent. Please try again.");
      }
    },
    [update],
  );

  const keepRequestMessage = useCallback(
    (profileId: string, text: string) => {
      // The server puts the request note at the start of the chat itself.
      if (USE_FINDLOVE_API) return;
      const id = `love-request-${profileId}`;
      update((current) => {
        const messages = current[profileId]?.messages ?? [];
        if (messages.some((message) => message.id === id)) return current;
        // Dated just before anything already in the chat so it stays first.
        const first = messages[0] ? Date.parse(messages[0].sentAt) - 1000 : Date.now();
        const message: LoveChatMessage = { id, kind: "text", text, own: false, sentAt: new Date(first).toISOString() };
        // Reading it in Pending counts as read.
        return { ...current, [profileId]: { messages: [message, ...messages], readAt: current[profileId]?.readAt ?? new Date().toISOString() } };
      });
    },
    [update],
  );

  const markRead = useCallback(
    (profileId: string) => {
      const thread = threadsRef.current[profileId];
      if (!thread || countUnread(thread) === 0) return;
      const readAt = new Date().toISOString();
      update((current) => {
        const latest = current[profileId];
        if (!latest) return current;
        return {
          ...current,
          [profileId]: { ...latest, readAt, ...(latest.unreadCount !== undefined ? { unreadCount: 0 } : {}) },
        };
      });
      if (USE_FINDLOVE_API) void apiMarkChatRead(profileId).catch(() => {});
    },
    [update],
  );

  const totalUnread = useMemo(
    () =>
      Object.entries(threads).reduce(
        (sum, [profileId, thread]) => (pendingChatIds.has(profileId) ? sum : sum + countUnread(thread)),
        0,
      ),
    [threads, pendingChatIds],
  );

  const value = useMemo(
    () => ({ threads, isLoading, totalUnread, sendMessage, keepRequestMessage, markRead, watchChat, refreshChats }),
    [threads, isLoading, totalUnread, sendMessage, keepRequestMessage, markRead, watchChat, refreshChats],
  );

  return <FindLoveChatContext.Provider value={value}>{children}</FindLoveChatContext.Provider>;
}

function toChatMessage(message: ApiLoveChatMessage): LoveChatMessage {
  return { id: message.id, kind: "text", text: message.text, own: message.own, sentAt: message.sentAt };
}

export function useFindLoveChat() {
  const context = useContext(FindLoveChatContext);
  if (!context) throw new Error("useFindLoveChat must be used within FindLoveChatProvider");
  return context;
}
