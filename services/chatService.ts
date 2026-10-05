import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string;
  headline: string;
  isEventisUser: boolean;
  isOnline?: boolean;
  invited?: boolean;
  blocked?: boolean;
  firstName?: string;
  lastName?: string;
  isInAddressBook?: boolean;
  deviceContactId?: string;
}

export interface ChatContactUpdate {
  firstName: string;
  lastName: string;
  phone: string;
  isInAddressBook?: boolean;
  deviceContactId?: string;
}

export interface ChatConversation {
  id: string;
  contactId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  muted?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  sentAt: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "sent" | "delivered" | "read";
  replyTo?: { id: string; text: string; direction: "incoming" | "outgoing" };
  editedAt?: string;
  forwarded?: boolean;
  imageUri?: string;
}

export interface SendMessageOptions {
  replyTo?: ChatMessage["replyTo"];
  forwarded?: boolean;
  imageUri?: string;
}

export interface ChatReport {
  id: string;
  contactId: string;
  messageId?: string;
  reason: string;
  createdAt: string;
  status: "saved_locally";
}

export interface ChatSnapshot {
  contacts: ChatContact[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
}

export type PhoneLookupResult =
  | { kind: "eventis"; contact: ChatContact }
  | { kind: "invite"; contact: ChatContact }
  | { kind: "not_found"; phone: string };

export interface ChatService {
  load(): Promise<ChatSnapshot>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  startConversation(contactId: string): Promise<ChatConversation>;
  sendMessage(
    conversationId: string,
    text: string,
    options?: SendMessageOptions,
  ): Promise<ChatMessage>;
  editMessage(
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<void>;
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
  clearConversation(conversationId: string, remove?: boolean): Promise<void>;
  setMuted(conversationId: string, muted: boolean): Promise<void>;
  setBlocked(contactId: string, blocked: boolean): Promise<void>;
  reportContact(
    contactId: string,
    reason: string,
    messageId?: string,
  ): Promise<ChatReport>;
  simulateIncoming(conversationId: string): Promise<ChatMessage>;
  inviteContact(contactId: string): Promise<ChatContact>;
  updateContactName(contactId: string, name: string): Promise<ChatContact>;
  updateContact(
    contactId: string,
    update: ChatContactUpdate,
  ): Promise<ChatContact>;
  lookupPhone(phone: string): Promise<PhoneLookupResult>;
  markConversationRead(conversationId: string): Promise<void>;
}

interface StoredChatState extends ChatSnapshot {
  reports?: ChatReport[];
}

const CHAT_STATE_KEY = "@eventis_chat_demo_v1";
let idSequence = 0;
function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idSequence}`;
}

// Synthetic demo contacts. These are not real people or phone numbers.
const DEMO_CONTACTS: ChatContact[] = [
  {
    id: "contact-aline",
    name: "Aline Mutesi",
    phone: "+250 700 100 001",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80",
    headline: "Creative director · Kigali",
    isEventisUser: true,
    isOnline: true,
    isInAddressBook: true,
  },
  {
    id: "contact-kevin",
    name: "Kevin Ishimwe",
    phone: "+250 700 100 002",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
    headline: "Product designer · Kigali",
    isEventisUser: true,
    isInAddressBook: true,
  },
  {
    id: "contact-diane",
    name: "Diane Uwase",
    phone: "+250 700 100 003",
    avatarUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&auto=format&fit=crop&q=80",
    headline: "Event host · Musanze",
    isEventisUser: true,
    isOnline: true,
    isInAddressBook: false,
  },
  {
    id: "contact-patrick",
    name: "Patrick Niyonzima",
    phone: "+250 700 100 004",
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80",
    headline: "Photographer · Rubavu",
    isEventisUser: true,
    isInAddressBook: false,
  },
  {
    id: "contact-claudine",
    name: "Claudine Mukamana",
    phone: "+250 700 100 005",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
    headline: "Saved in your contacts",
    isEventisUser: false,
    isInAddressBook: true,
  },
  {
    id: "contact-eric",
    name: "Eric Habimana",
    phone: "+250 700 100 006",
    avatarUrl:
      "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=240&auto=format&fit=crop&q=80",
    headline: "Saved in your contacts",
    isEventisUser: false,
    isInAddressBook: true,
  },
];

const DEMO_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conversation-aline",
    contactId: "contact-aline",
    lastMessage: "The rooftop event was such a good time!",
    lastMessageAt: "2026-10-02T08:41:00.000Z",
    unreadCount: 2,
  },
  {
    id: "conversation-kevin",
    contactId: "contact-kevin",
    lastMessage: "I will send you the event link.",
    lastMessageAt: "2026-10-01T17:12:00.000Z",
    unreadCount: 0,
  },
  {
    id: "conversation-diane",
    contactId: "contact-diane",
    lastMessage: "See you there 👋",
    lastMessageAt: "2026-09-30T13:05:00.000Z",
    unreadCount: 0,
  },
];

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "message-a1",
    conversationId: "conversation-aline",
    text: "Hey! It was lovely meeting you at Kigali Creatives.",
    sentAt: "2026-10-02T08:28:00.000Z",
    direction: "incoming",
    status: "read",
  },
  {
    id: "message-a2",
    conversationId: "conversation-aline",
    text: "You too! Did you stay for the last set?",
    sentAt: "2026-10-02T08:34:00.000Z",
    direction: "outgoing",
    status: "read",
  },
  {
    id: "message-a3",
    conversationId: "conversation-aline",
    text: "Yes, and it was amazing.",
    sentAt: "2026-10-02T08:39:00.000Z",
    direction: "incoming",
    status: "read",
  },
  {
    id: "message-a4",
    conversationId: "conversation-aline",
    text: "The rooftop event was such a good time!",
    sentAt: "2026-10-02T08:41:00.000Z",
    direction: "incoming",
    status: "read",
  },
  {
    id: "message-k1",
    conversationId: "conversation-kevin",
    text: "Any good events this weekend?",
    sentAt: "2026-10-01T17:04:00.000Z",
    direction: "outgoing",
    status: "read",
  },
  {
    id: "message-k2",
    conversationId: "conversation-kevin",
    text: "I will send you the event link.",
    sentAt: "2026-10-01T17:12:00.000Z",
    direction: "incoming",
    status: "read",
  },
  {
    id: "message-d1",
    conversationId: "conversation-diane",
    text: "I booked my ticket for Saturday.",
    sentAt: "2026-09-30T13:02:00.000Z",
    direction: "outgoing",
    status: "read",
  },
  {
    id: "message-d2",
    conversationId: "conversation-diane",
    text: "See you there 👋",
    sentAt: "2026-09-30T13:05:00.000Z",
    direction: "incoming",
    status: "read",
  },
];

function createInitialState(): StoredChatState {
  return {
    contacts: DEMO_CONTACTS.map((contact) => ({ ...contact })),
    conversations: DEMO_CONVERSATIONS.map((conversation) => ({
      ...conversation,
    })),
    messages: DEMO_MESSAGES.map((message) => ({ ...message })),
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function hydrateContact(contact: ChatContact): ChatContact {
  const parts = contact.name.trim().split(/\s+/);
  return {
    ...contact,
    firstName: contact.firstName ?? parts[0] ?? "",
    lastName: contact.lastName ?? parts.slice(1).join(" "),
    isInAddressBook:
      contact.isInAddressBook ??
      !["contact-diane", "contact-patrick"].includes(contact.id),
  };
}

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (first, second) =>
      Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
  );
}

export class MockChatService implements ChatService {
  private state: StoredChatState | null = null;
  private writes: Promise<void> = Promise.resolve();

  private async getState() {
    if (this.state) return this.state;
    const stored = await AsyncStorage.getItem(CHAT_STATE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredChatState;
        this.state =
          parsed &&
          Array.isArray(parsed.contacts) &&
          Array.isArray(parsed.conversations) &&
          Array.isArray(parsed.messages)
            ? { ...parsed, contacts: parsed.contacts.map(hydrateContact) }
            : createInitialState();
      } catch {
        this.state = createInitialState();
      }
    } else {
      this.state = createInitialState();
    }
    return this.state;
  }

  private async persist(state: StoredChatState) {
    const serialized = JSON.stringify(state);
    if (serialized.length > 1500000)
      throw new Error(
        "Local demo storage is full. Clear old conversations before adding more photos.",
      );
    const write = this.writes
      .catch(() => {})
      .then(() => AsyncStorage.setItem(CHAT_STATE_KEY, serialized));
    this.writes = write;
    await write;
    this.state = state;
  }

  async load(): Promise<ChatSnapshot> {
    const state = await this.getState();
    return {
      contacts: state.contacts.map(hydrateContact),
      conversations: sortConversations(state.conversations).map(
        (conversation) => ({ ...conversation }),
      ),
      messages: state.messages.map((message) => ({ ...message })),
    };
  }

  async getMessages(conversationId: string) {
    const state = await this.getState();
    return state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort(
        (first, second) => Date.parse(first.sentAt) - Date.parse(second.sentAt),
      )
      .map((message) => ({ ...message }));
  }

  async startConversation(contactId: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact?.isEventisUser)
      throw new Error("Only Eventis users can receive messages.");

    const existing = state.conversations.find(
      (item) => item.contactId === contactId,
    );
    if (existing) return { ...existing };

    const conversation: ChatConversation = {
      id: localId(`conversation-${contactId}`),
      contactId,
      lastMessage: "Start a conversation",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    const nextState = {
      ...state,
      conversations: [conversation, ...state.conversations],
    };
    await this.persist(nextState);
    return { ...conversation };
  }

  async sendMessage(
    conversationId: string,
    text: string,
    options?: SendMessageOptions,
  ) {
    const state = await this.getState();
    const conversation = state.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) throw new Error("Conversation not found.");
    if (
      state.contacts.find((item) => item.id === conversation.contactId)?.blocked
    )
      throw new Error("Unblock this contact to send a message.");
    if (!text.trim() && !options?.imageUri) throw new Error("Enter a message.");

    const message: ChatMessage = {
      id: localId("message"),
      conversationId,
      text: text.trim(),
      sentAt: new Date().toISOString(),
      direction: "outgoing",
      status: "sent",
      ...options,
    };
    const conversations = state.conversations.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            lastMessage: message.text || "Photo",
            lastMessageAt: message.sentAt,
            unreadCount: 0,
          }
        : item,
    );
    await this.persist({
      ...state,
      messages: [...state.messages, message],
      conversations,
    });
    return { ...message };
  }

  private updatePreview(
    state: StoredChatState,
    conversationId: string,
  ): StoredChatState {
    const last = state.messages
      .filter((item) => item.conversationId === conversationId)
      .at(-1);
    return {
      ...state,
      conversations: state.conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              lastMessage: last ? last.text || "Photo" : "Start a conversation",
              lastMessageAt: last?.sentAt ?? item.lastMessageAt,
            }
          : item,
      ),
    };
  }

  async editMessage(conversationId: string, messageId: string, text: string) {
    const state = await this.getState();
    const message = state.messages.find(
      (item) => item.id === messageId && item.conversationId === conversationId,
    );
    if (!message || message.direction !== "outgoing")
      throw new Error("Only your own messages can be edited.");
    if (!text.trim()) throw new Error("Enter a message.");
    const messages = state.messages.map((item) =>
      item.id === messageId
        ? { ...item, text: text.trim(), editedAt: new Date().toISOString() }
        : item,
    );
    await this.persist(
      this.updatePreview({ ...state, messages }, conversationId),
    );
  }

  async deleteMessage(conversationId: string, messageId: string) {
    const state = await this.getState();
    const messages = state.messages.filter(
      (item) =>
        !(item.id === messageId && item.conversationId === conversationId),
    );
    await this.persist(
      this.updatePreview({ ...state, messages }, conversationId),
    );
  }

  async clearConversation(conversationId: string, remove = false) {
    const state = await this.getState();
    const messages = state.messages.filter(
      (item) => item.conversationId !== conversationId,
    );
    const conversations = remove
      ? state.conversations.filter((item) => item.id !== conversationId)
      : state.conversations;
    await this.persist(
      this.updatePreview({ ...state, messages, conversations }, conversationId),
    );
  }

  async setMuted(conversationId: string, muted: boolean) {
    const state = await this.getState();
    await this.persist({
      ...state,
      conversations: state.conversations.map((item) =>
        item.id === conversationId ? { ...item, muted } : item,
      ),
    });
  }

  async setBlocked(contactId: string, blocked: boolean) {
    const state = await this.getState();
    await this.persist({
      ...state,
      contacts: state.contacts.map((item) =>
        item.id === contactId ? { ...item, blocked } : item,
      ),
    });
  }

  async reportContact(
    contactId: string,
    reason: string,
    messageId?: string,
  ): Promise<ChatReport> {
    const state = await this.getState();
    const report: ChatReport = {
      id: localId("report"),
      contactId,
      messageId,
      reason,
      createdAt: new Date().toISOString(),
      status: "saved_locally",
    };
    await this.persist({
      ...state,
      reports: [...(state.reports ?? []), report],
    });
    return report;
  }

  // Explicit demo control; a real implementation will use server message events.
  async simulateIncoming(conversationId: string) {
    const state = await this.getState();
    const conversation = state.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) throw new Error("Conversation not found.");
    if (
      state.contacts.find((item) => item.id === conversation.contactId)?.blocked
    )
      throw new Error("This contact is blocked.");
    const message: ChatMessage = {
      id: localId("incoming"),
      conversationId,
      text: "That sounds great! Which Eventis event should we check out next?",
      sentAt: new Date().toISOString(),
      direction: "incoming",
      status: "read",
    };
    const messages = state.messages.map((item) =>
      item.conversationId === conversationId && item.direction === "outgoing"
        ? { ...item, status: "read" as const }
        : item,
    );
    const conversations = state.conversations.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            lastMessage: message.text,
            lastMessageAt: message.sentAt,
            unreadCount: item.unreadCount + 1,
          }
        : item,
    );
    await this.persist({
      ...state,
      messages: [...messages, message],
      conversations,
    });
    return message;
  }

  async inviteContact(contactId: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) throw new Error("Contact not found.");
    const updated = { ...contact, invited: true };
    const contacts = state.contacts.map((item) =>
      item.id === contactId ? updated : item,
    );
    await this.persist({ ...state, contacts });
    return { ...updated };
  }

  async updateContactName(contactId: string, name: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) throw new Error("Contact not found.");
    const [firstName = "", ...rest] = name.trim().split(/\s+/);
    const updated = {
      ...contact,
      name: name.trim(),
      firstName,
      lastName: rest.join(" "),
    };
    const contacts = state.contacts.map((item) =>
      item.id === contactId ? updated : item,
    );
    await this.persist({ ...state, contacts });
    return { ...updated };
  }

  async updateContact(contactId: string, update: ChatContactUpdate) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) throw new Error("Contact not found.");
    const firstName = update.firstName.trim();
    const lastName = update.lastName.trim();
    const phone = update.phone.trim();
    if (!firstName) throw new Error("Enter a first name.");
    if (!phone) throw new Error("Enter a phone number.");
    const updated: ChatContact = {
      ...contact,
      ...update,
      firstName,
      lastName,
      phone,
      name: [firstName, lastName].filter(Boolean).join(" "),
    };
    await this.persist({
      ...state,
      contacts: state.contacts.map((item) =>
        item.id === contactId ? updated : item,
      ),
    });
    return { ...updated };
  }

  async lookupPhone(phone: string): Promise<PhoneLookupResult> {
    const state = await this.getState();
    const normalized = normalizePhone(phone);
    const contact = state.contacts.find(
      (item) => normalizePhone(item.phone) === normalized,
    );
    if (!contact) return { kind: "not_found", phone };
    return contact.isEventisUser
      ? { kind: "eventis", contact: { ...contact } }
      : { kind: "invite", contact: { ...contact } };
  }

  async markConversationRead(conversationId: string) {
    const state = await this.getState();
    const conversations = state.conversations.map((item) =>
      item.id === conversationId ? { ...item, unreadCount: 0 } : item,
    );
    await this.persist({ ...state, conversations });
  }
}

// Serialize local operations so concurrent actions cannot overwrite each other's snapshots.
// A real service keeps this same interface and supplies server transactions/events instead.
export function serializeChatService(service: ChatService): ChatService {
  let queue: Promise<unknown> = Promise.resolve();
  return new Proxy(service, {
    get(target, property) {
      const method = Reflect.get(target, property);
      if (typeof method !== "function") return method;
      return (...args: unknown[]) => {
        const task = queue.then(() => method.apply(target, args));
        queue = task.catch(() => {});
        return task;
      };
    },
  });
}

export const chatService: ChatService = serializeChatService(
  new MockChatService(),
);
