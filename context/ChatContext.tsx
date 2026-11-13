import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform, Share } from "react-native";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/context/AuthContext";
import { createApiChatService } from "@/services/apiChatService";
import {
  chatMessagePreview,
  chatService,
  serializeChatService,
  type ChatContact,
  type ChatConversation,
  type ChatContactUpdate,
  type ChatMessage,
  type ChatService,
  type PhoneLookupResult,
  type SendMessageOptions,
} from "@/services/chatService";
import { API_BASE, getToken } from "@/utils/apiClient";

const PENDING_INVITE_KEY = "@eventis_pending_invite";
const REALTIME_SYNC_EVENTS = [
  "chat:message:updated",
  "chat:message:deleted",
  "chat:receipts:read",
  "chat:receipts:delivered",
] as const;

interface IncomingRealtimeMessage {
  conversationId?: string;
  senderId?: string;
  service?: string;
  type?: string;
  content?: string | null;
}

function realtimePreview(payload: IncomingRealtimeMessage) {
  const content = payload.content?.trim();
  if (content) return content;
  if (payload.type === "IMAGE") return "Photo";
  if (payload.type === "VOICE") return "Voice message";
  if (payload.type === "FILE") return "Attachment";
  return "New message";
}

interface ChatContextValue {
  contacts: ChatContact[];
  conversations: ChatConversation[];
  allMessages: ChatMessage[];
  messagesByConversation: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  refresh: () => Promise<void>;
  getContact: (contactId: string) => ChatContact | undefined;
  getConversation: (conversationId: string) => ChatConversation | undefined;
  loadMessages: (conversationId: string) => Promise<void>;
  startConversation: (contactId: string) => Promise<ChatConversation>;
  sendMessage: (
    conversationId: string,
    text: string,
    options?: SendMessageOptions,
  ) => Promise<void>;
  editMessage: (
    conversationId: string,
    messageId: string,
    text: string,
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  clearConversation: (
    conversationId: string,
    remove?: boolean,
  ) => Promise<void>;
  setMuted: (conversationId: string, muted: boolean) => Promise<void>;
  setBlocked: (contactId: string, blocked: boolean) => Promise<void>;
  reportContact: (
    contactId: string,
    reason: string,
    messageId?: string,
  ) => Promise<void>;
  simulateIncoming: (conversationId: string) => Promise<void>;
  typingConversationId: string | null;
  notification: { conversationId: string; text: string } | null;
  dismissNotification: () => void;
  setActiveConversation: (id: string | null) => void;
  inviteContact: (contactId: string) => Promise<void>;
  updateContactName: (contactId: string, name: string) => Promise<void>;
  updateContact: (
    contactId: string,
    update: ChatContactUpdate,
  ) => Promise<ChatContact>;
  lookupPhone: (phone: string) => Promise<PhoneLookupResult>;
  markConversationRead: (conversationId: string) => Promise<void>;
  syncDeviceContacts: () => Promise<number>;
  acceptInvitation: (token: string) => Promise<ChatConversation>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (first, second) =>
      Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
  );
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const isDemoMode = !user || Boolean(user.isDemo);
  const service = useMemo<ChatService>(() => {
    if (user && !user.isDemo) {
      return serializeChatService(createApiChatService(() => user.id));
    }
    return chatService;
  }, [user?.id, user?.isDemo]);
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingConversationId, setTypingConversationId] = useState<
    string | null
  >(null);
  const [notification, setNotification] = useState<{
    conversationId: string;
    text: string;
  } | null>(null);
  const activeConversation = useRef<string | null>(null);
  const conversationsRef = useRef<ChatConversation[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const setActiveConversation = useCallback((id: string | null) => {
    activeConversation.current = id;
  }, []);
  const dismissNotification = useCallback(() => setNotification(null), []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const snapshot = await serviceRef.current.load();
      setContacts(snapshot.contacts);
      setConversations(snapshot.conversations);
      setAllMessages(snapshot.messages);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your conversations could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setMessagesByConversation({});
    setAllMessages([]);
    void refresh();
  }, [service, refresh]);

  const getContact = useCallback(
    (contactId: string) => contacts.find((contact) => contact.id === contactId),
    [contacts],
  );

  const getConversation = useCallback(
    (conversationId: string) =>
      conversations.find((conversation) => conversation.id === conversationId),
    [conversations],
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const messages = await serviceRef.current.getMessages(conversationId);
      setError(null);
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: messages,
      }));
    } catch {
      setError("Messages could not be loaded.");
      throw new Error("Messages could not be loaded. Please try again.");
    }
  }, []);

  const startConversation = useCallback(async (contactId: string) => {
    const conversation = await serviceRef.current.startConversation(contactId);
    setConversations((current) =>
      current.some((item) => item.id === conversation.id)
        ? current
        : sortConversations([conversation, ...current]),
    );
    return conversation;
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text: string,
      options?: SendMessageOptions,
    ) => {
      const pendingMessage: ChatMessage = {
        id: `pending-${Date.now()}`,
        conversationId,
        text: text.trim(),
        sentAt: new Date().toISOString(),
        direction: "outgoing",
        status: "pending",
        ...options,
      };
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [...(current[conversationId] ?? []), pendingMessage],
      }));
      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessage: chatMessagePreview(pendingMessage),
                  lastMessageAt: pendingMessage.sentAt,
                  unreadCount: 0,
                }
              : conversation,
          ),
        ),
      );
      try {
        const message = await serviceRef.current.sendMessage(
          conversationId,
          text,
          options,
        );
        setAllMessages((current) => [...current, message]);
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((item) =>
            item.id === pendingMessage.id ? message : item,
          ),
        }));
      } catch (error) {
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).filter(
            (item) => item.id !== pendingMessage.id,
          ),
        }));
        await refresh();
        throw error;
      }
    },
    [refresh],
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, text: string) => {
      await serviceRef.current.editMessage(conversationId, messageId, text);
      await Promise.all([loadMessages(conversationId), refresh()]);
    },
    [loadMessages, refresh],
  );
  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      await serviceRef.current.deleteMessage(conversationId, messageId);
      await Promise.all([loadMessages(conversationId), refresh()]);
    },
    [loadMessages, refresh],
  );
  const clearConversation = useCallback(
    async (conversationId: string, remove = false) => {
      await serviceRef.current.clearConversation(conversationId, remove);
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [],
      }));
      await refresh();
    },
    [refresh],
  );
  const setMuted = useCallback(
    async (conversationId: string, muted: boolean) => {
      await serviceRef.current.setMuted(conversationId, muted);
      await refresh();
    },
    [refresh],
  );
  const setBlocked = useCallback(
    async (contactId: string, blocked: boolean) => {
      await serviceRef.current.setBlocked(contactId, blocked);
      await refresh();
    },
    [refresh],
  );
  const reportContact = useCallback(
    async (contactId: string, reason: string, messageId?: string) => {
      await serviceRef.current.reportContact(contactId, reason, messageId);
    },
    [],
  );
  const simulateIncoming = useCallback(
    async (conversationId: string) => {
      setTypingConversationId(conversationId);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const message = await serviceRef.current.simulateIncoming(conversationId);
        const snapshot = await serviceRef.current.load();
        if (activeConversation.current === conversationId) {
          await serviceRef.current.markConversationRead(conversationId);
        } else if (
          !snapshot.conversations.find((item) => item.id === conversationId)
            ?.muted
        ) {
          setNotification({ conversationId, text: message.text });
        }
        await Promise.all([loadMessages(conversationId), refresh()]);
      } finally {
        setTypingConversationId(null);
      }
    },
    [loadMessages, refresh],
  );

  const inviteContact = useCallback(async (contactId: string) => {
    const contact = await serviceRef.current.inviteContact(contactId);
    setContacts((current) =>
      current.map((item) => (item.id === contactId ? contact : item)),
    );
    if (contact.inviteUrl) {
      await Share.share({
        message: `Join me on Eventis so we can chat: ${contact.inviteUrl}`,
      }).catch(() => undefined);
    }
  }, []);

  const updateContactName = useCallback(
    async (contactId: string, name: string) => {
      const contact = await serviceRef.current.updateContactName(contactId, name);
      setContacts((current) =>
        current.map((item) => (item.id === contactId ? contact : item)),
      );
    },
    [],
  );

  const updateContact = useCallback(
    async (contactId: string, update: ChatContactUpdate) => {
      const contact = await serviceRef.current.updateContact(contactId, update);
      setContacts((current) =>
        current.map((item) => (item.id === contactId ? contact : item)),
      );
      return contact;
    },
    [],
  );

  const lookupPhone = useCallback(async (phone: string) => {
    const result = await serviceRef.current.lookupPhone(phone);
    if (result.kind !== "not_found") {
      const found = result.contact;
      setContacts((current) =>
        current.some((contact) => contact.id === found.id)
          ? current.map((contact) =>
              contact.id === found.id ? { ...contact, ...found } : contact,
            )
          : [found, ...current],
      );
    }
    return result;
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    await serviceRef.current.markConversationRead(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  }, []);

  const syncDeviceContacts = useCallback(async () => {
    if (Platform.OS === "web") {
      throw new Error(
        "Contact sync is available in the installed Android and iOS app.",
      );
    }
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error(
        "Allow Contacts access in your phone settings to find your friends.",
      );
    }
    const DEVICE_CONTACT_PAGE_SIZE = 500;
    const MAX_CONTACT_SYNC = 5000;
    const fields = [
      Contacts.ContactField.FULL_NAME,
      Contacts.ContactField.GIVEN_NAME,
      Contacts.ContactField.FAMILY_NAME,
      Contacts.ContactField.PHONES,
    ] as const;
    const seen = new Set<string>();
    const payload: Array<{ name?: string; phoneNumber: string }> = [];
    for (
      let offset = 0;
      offset < MAX_CONTACT_SYNC && payload.length < MAX_CONTACT_SYNC;
      offset += DEVICE_CONTACT_PAGE_SIZE
    ) {
      const records = await Contacts.Contact.getAllDetails(fields, {
        limit: DEVICE_CONTACT_PAGE_SIZE,
        offset,
      });
      for (const record of records) {
        const name =
          record.fullName?.trim() ||
          [record.givenName, record.familyName]
            .filter((part): part is string => Boolean(part?.trim()))
            .join(" ");
        for (const phone of record.phones ?? []) {
          const number = phone.number?.trim();
          if (!number) continue;
          const normalized = number.replace(/\D/g, "");
          if (normalized.length < 7 || seen.has(normalized)) continue;
          seen.add(normalized);
          payload.push({
            ...(name ? { name } : {}),
            phoneNumber: number,
          });
          if (payload.length >= MAX_CONTACT_SYNC) break;
        }
        if (payload.length >= MAX_CONTACT_SYNC) break;
      }
      if (records.length < DEVICE_CONTACT_PAGE_SIZE) break;
    }
    if (!payload.length) return 0;
    await serviceRef.current.syncContacts(payload);
    await refresh();
    return payload.length;
  }, [refresh]);

  const acceptInvitation = useCallback(
    async (token: string) => {
      const conversation = await serviceRef.current.acceptInvitation(token);
      await refresh();
      return conversation;
    },
    [refresh],
  );

  const realtimeActive = Boolean(user && !user.isDemo);
  useEffect(() => {
    if (!realtimeActive || !user) return;
    let cancelled = false;
    let socket: Socket | null = null;
    const sync = () => {
      void refresh();
      const active = activeConversation.current;
      if (active) void loadMessages(active);
    };
    const onNewMessage = (payload: IncomingRealtimeMessage) => {
      if (payload.service && payload.service !== "EVENTIS") return;
      const conversationId = payload.conversationId;
      const fromSelf = payload.senderId === user.id;
      const active = activeConversation.current;
      const muted = conversationId
        ? conversationsRef.current.find(
            (conversation) => conversation.id === conversationId,
          )?.muted
        : undefined;
      void refresh().then(() => {
        if (!conversationId || fromSelf) return;
        if (active === conversationId) {
          void markConversationRead(conversationId).catch(() => undefined);
        } else if (!muted) {
          setNotification({
            conversationId,
            text: realtimePreview(payload),
          });
        }
      });
      if (active) void loadMessages(active);
    };
    void getToken().then((token) => {
      if (cancelled || !token) return;
      const client = io(API_BASE, {
        path: "/socket.io",
        transports: ["websocket"],
        auth: { token },
      });
      socket = client;
      let authRetries = 0;
      client.on("connect", () => {
        authRetries = 0;
      });
      client.on("connect_error", () => {
        if (cancelled || authRetries >= 2) return;
        authRetries += 1;
        void getToken().then((next) => {
          if (cancelled || !next) return;
          client.auth = { token: next };
          client.connect();
        });
      });
      client.on("chat:message:new", onNewMessage);
      for (const event of REALTIME_SYNC_EVENTS) client.on(event, sync);
    });
    const poll = setInterval(() => {
      if (AppState.currentState === "active") sync();
    }, 20_000);
    return () => {
      cancelled = true;
      socket?.disconnect();
      clearInterval(poll);
    };
  }, [
    realtimeActive,
    user?.id,
    refresh,
    loadMessages,
    markConversationRead,
  ]);

  useEffect(() => {
    if (!realtimeActive) return;
    let cancelled = false;
    void AsyncStorage.getItem(PENDING_INVITE_KEY)
      .then(async (token) => {
        if (!token || cancelled) return;
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        const conversation = await serviceRef.current.acceptInvitation(token);
        await refresh();
        if (!cancelled) {
          router.push({
            pathname: "/chat/[id]",
            params: { id: conversation.id },
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [realtimeActive, user?.id, refresh, router]);

  const value = useMemo(
    () => ({
      contacts,
      conversations,
      allMessages,
      messagesByConversation,
      isLoading,
      error,
      isDemoMode,
      refresh,
      getContact,
      getConversation,
      loadMessages,
      startConversation,
      sendMessage,
      editMessage,
      deleteMessage,
      clearConversation,
      setMuted,
      setBlocked,
      reportContact,
      simulateIncoming,
      typingConversationId,
      notification,
      dismissNotification,
      setActiveConversation,
      inviteContact,
      updateContactName,
      updateContact,
      lookupPhone,
      markConversationRead,
      syncDeviceContacts,
      acceptInvitation,
    }),
    [
      contacts,
      conversations,
      allMessages,
      messagesByConversation,
      isLoading,
      error,
      isDemoMode,
      refresh,
      getContact,
      getConversation,
      loadMessages,
      startConversation,
      sendMessage,
      editMessage,
      deleteMessage,
      clearConversation,
      setMuted,
      setBlocked,
      reportContact,
      simulateIncoming,
      typingConversationId,
      notification,
      dismissNotification,
      setActiveConversation,
      inviteContact,
      updateContactName,
      updateContact,
      lookupPhone,
      markConversationRead,
      syncDeviceContacts,
      acceptInvitation,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
