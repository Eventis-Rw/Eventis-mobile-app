import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  chatService,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
  type PhoneLookupResult,
} from "@/services/chatService";

interface ChatContextValue {
  contacts: ChatContact[];
  conversations: ChatConversation[];
  messagesByConversation: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getContact: (contactId: string) => ChatContact | undefined;
  getConversation: (conversationId: string) => ChatConversation | undefined;
  loadMessages: (conversationId: string) => Promise<void>;
  startConversation: (contactId: string) => Promise<ChatConversation>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  inviteContact: (contactId: string) => Promise<void>;
  updateContactName: (contactId: string, name: string) => Promise<void>;
  lookupPhone: (phone: string) => Promise<PhoneLookupResult>;
  markConversationRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (first, second) => Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
  );
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const snapshot = await chatService.load();
      setContacts(snapshot.contacts);
      setConversations(snapshot.conversations);
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
    (conversationId: string) => conversations.find((conversation) => conversation.id === conversationId),
    [conversations],
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const messages = await chatService.getMessages(conversationId);
      setMessagesByConversation((current) => ({ ...current, [conversationId]: messages }));
    } catch {
      setError("Messages could not be loaded.");
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

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    const pendingMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      conversationId,
      text: text.trim(),
      sentAt: new Date().toISOString(),
      direction: "outgoing",
      status: "pending",
    };
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), pendingMessage],
    }));
    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, lastMessage: pendingMessage.text, lastMessageAt: pendingMessage.sentAt, unreadCount: 0 }
            : conversation,
        ),
      ),
    );
    const message = await chatService.sendMessage(conversationId, text);
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).map((item) =>
        item.id === pendingMessage.id ? message : item,
      ),
    }));
  }, []);

  const inviteContact = useCallback(async (contactId: string) => {
    const contact = await chatService.inviteContact(contactId);
    setContacts((current) => current.map((item) => (item.id === contactId ? contact : item)));
  }, []);

  const updateContactName = useCallback(async (contactId: string, name: string) => {
    const contact = await chatService.updateContactName(contactId, name);
    setContacts((current) => current.map((item) => (item.id === contactId ? contact : item)));
  }, []);

  const lookupPhone = useCallback((phone: string) => chatService.lookupPhone(phone), []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    await chatService.markConversationRead(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      contacts,
      conversations,
      messagesByConversation,
      isLoading,
      error,
      refresh,
      getContact,
      getConversation,
      loadMessages,
      startConversation,
      sendMessage,
      inviteContact,
      updateContactName,
      lookupPhone,
      markConversationRead,
    }),
    [contacts, conversations, messagesByConversation, isLoading, error, refresh, getContact, getConversation, loadMessages, startConversation, sendMessage, inviteContact, updateContactName, lookupPhone, markConversationRead],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
