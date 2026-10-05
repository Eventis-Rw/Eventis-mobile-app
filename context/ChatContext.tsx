import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  chatService,
  type ChatContact,
  type ChatConversation,
  type ChatContactUpdate,
  type ChatMessage,
  type PhoneLookupResult,
  type SendMessageOptions,
} from "@/services/chatService";

interface ChatContextValue {
  contacts: ChatContact[];
  conversations: ChatConversation[];
  allMessages: ChatMessage[];
  messagesByConversation: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;
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
}

const ChatContext = createContext<ChatContextValue | null>(null);

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (first, second) =>
      Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
  );
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
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
  const setActiveConversation = useCallback((id: string | null) => {
    activeConversation.current = id;
  }, []);
  const dismissNotification = useCallback(() => setNotification(null), []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const snapshot = await chatService.load();
      setContacts(snapshot.contacts);
      setConversations(snapshot.conversations);
      setAllMessages(snapshot.messages);
    } catch {
      setError("Your demo conversations could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      const messages = await chatService.getMessages(conversationId);
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
    const conversation = await chatService.startConversation(contactId);
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
                  lastMessage: pendingMessage.text || "Photo",
                  lastMessageAt: pendingMessage.sentAt,
                  unreadCount: 0,
                }
              : conversation,
          ),
        ),
      );
      try {
        const message = await chatService.sendMessage(
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
      await chatService.editMessage(conversationId, messageId, text);
      await Promise.all([loadMessages(conversationId), refresh()]);
    },
    [loadMessages, refresh],
  );
  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      await chatService.deleteMessage(conversationId, messageId);
      await Promise.all([loadMessages(conversationId), refresh()]);
    },
    [loadMessages, refresh],
  );
  const clearConversation = useCallback(
    async (conversationId: string, remove = false) => {
      await chatService.clearConversation(conversationId, remove);
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
      await chatService.setMuted(conversationId, muted);
      await refresh();
    },
    [refresh],
  );
  const setBlocked = useCallback(
    async (contactId: string, blocked: boolean) => {
      await chatService.setBlocked(contactId, blocked);
      await refresh();
    },
    [refresh],
  );
  const reportContact = useCallback(
    async (contactId: string, reason: string, messageId?: string) => {
      await chatService.reportContact(contactId, reason, messageId);
    },
    [],
  );
  const simulateIncoming = useCallback(
    async (conversationId: string) => {
      setTypingConversationId(conversationId);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const message = await chatService.simulateIncoming(conversationId);
        const snapshot = await chatService.load();
        if (activeConversation.current === conversationId) {
          await chatService.markConversationRead(conversationId);
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
    const contact = await chatService.inviteContact(contactId);
    setContacts((current) =>
      current.map((item) => (item.id === contactId ? contact : item)),
    );
  }, []);

  const updateContactName = useCallback(
    async (contactId: string, name: string) => {
      const contact = await chatService.updateContactName(contactId, name);
      setContacts((current) =>
        current.map((item) => (item.id === contactId ? contact : item)),
      );
    },
    [],
  );

  const updateContact = useCallback(
    async (contactId: string, update: ChatContactUpdate) => {
      const contact = await chatService.updateContact(contactId, update);
      setContacts((current) =>
        current.map((item) => (item.id === contactId ? contact : item)),
      );
      return contact;
    },
    [],
  );

  const lookupPhone = useCallback(
    (phone: string) => chatService.lookupPhone(phone),
    [],
  );

  const markConversationRead = useCallback(async (conversationId: string) => {
    await chatService.markConversationRead(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      contacts,
      conversations,
      allMessages,
      messagesByConversation,
      isLoading,
      error,
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
    }),
    [
      contacts,
      conversations,
      allMessages,
      messagesByConversation,
      isLoading,
      error,
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
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
