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
}

export interface ChatConversation {
  id: string;
  contactId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  sentAt: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "sent" | "read";
}

export interface ChatSnapshot {
  contacts: ChatContact[];
  conversations: ChatConversation[];
}

export type PhoneLookupResult =
  | { kind: "eventis"; contact: ChatContact }
  | { kind: "invite"; contact: ChatContact }
  | { kind: "not_found"; phone: string };

export interface ChatService {
  load(): Promise<ChatSnapshot>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  startConversation(contactId: string): Promise<ChatConversation>;
  sendMessage(conversationId: string, text: string): Promise<ChatMessage>;
  inviteContact(contactId: string): Promise<ChatContact>;
  updateContactName(contactId: string, name: string): Promise<ChatContact>;
  lookupPhone(phone: string): Promise<PhoneLookupResult>;
  markConversationRead(conversationId: string): Promise<void>;
}

interface StoredChatState extends ChatSnapshot {
  messages: ChatMessage[];
}

const CHAT_STATE_KEY = "@eventis_chat_demo_v1";

// Synthetic demo contacts. These are not real people or phone numbers.
const DEMO_CONTACTS: ChatContact[] = [
  {
    id: "contact-aline",
    name: "Aline Mutesi",
    phone: "+250 700 100 001",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80",
    headline: "Creative director · Kigali",
    isEventisUser: true,
    isOnline: true,
  },
  {
    id: "contact-kevin",
    name: "Kevin Ishimwe",
    phone: "+250 700 100 002",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
    headline: "Product designer · Kigali",
    isEventisUser: true,
  },
  {
    id: "contact-diane",
    name: "Diane Uwase",
    phone: "+250 700 100 003",
    avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&auto=format&fit=crop&q=80",
    headline: "Event host · Musanze",
    isEventisUser: true,
    isOnline: true,
  },
  {
    id: "contact-patrick",
    name: "Patrick Niyonzima",
    phone: "+250 700 100 004",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80",
    headline: "Photographer · Rubavu",
    isEventisUser: true,
  },
  {
    id: "contact-claudine",
    name: "Claudine Mukamana",
    phone: "+250 700 100 005",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
    headline: "Saved in your contacts",
    isEventisUser: false,
  },
  {
    id: "contact-eric",
    name: "Eric Habimana",
    phone: "+250 700 100 006",
    avatarUrl: "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=240&auto=format&fit=crop&q=80",
    headline: "Saved in your contacts",
    isEventisUser: false,
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
  { id: "message-a1", conversationId: "conversation-aline", text: "Hey! It was lovely meeting you at Kigali Creatives.", sentAt: "2026-10-02T08:28:00.000Z", direction: "incoming", status: "read" },
  { id: "message-a2", conversationId: "conversation-aline", text: "You too! Did you stay for the last set?", sentAt: "2026-10-02T08:34:00.000Z", direction: "outgoing", status: "read" },
  { id: "message-a3", conversationId: "conversation-aline", text: "Yes, and it was amazing.", sentAt: "2026-10-02T08:39:00.000Z", direction: "incoming", status: "read" },
  { id: "message-a4", conversationId: "conversation-aline", text: "The rooftop event was such a good time!", sentAt: "2026-10-02T08:41:00.000Z", direction: "incoming", status: "read" },
  { id: "message-k1", conversationId: "conversation-kevin", text: "Any good events this weekend?", sentAt: "2026-10-01T17:04:00.000Z", direction: "outgoing", status: "read" },
  { id: "message-k2", conversationId: "conversation-kevin", text: "I will send you the event link.", sentAt: "2026-10-01T17:12:00.000Z", direction: "incoming", status: "read" },
  { id: "message-d1", conversationId: "conversation-diane", text: "I booked my ticket for Saturday.", sentAt: "2026-09-30T13:02:00.000Z", direction: "outgoing", status: "read" },
  { id: "message-d2", conversationId: "conversation-diane", text: "See you there 👋", sentAt: "2026-09-30T13:05:00.000Z", direction: "incoming", status: "read" },
];

function createInitialState(): StoredChatState {
  return {
    contacts: DEMO_CONTACTS.map((contact) => ({ ...contact })),
    conversations: DEMO_CONVERSATIONS.map((conversation) => ({ ...conversation })),
    messages: DEMO_MESSAGES.map((message) => ({ ...message })),
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (first, second) => Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
  );
}

export class MockChatService implements ChatService {
  private state: StoredChatState | null = null;

  private async getState() {
    if (this.state) return this.state;
    const stored = await AsyncStorage.getItem(CHAT_STATE_KEY);
    if (stored) {
      try {
        this.state = JSON.parse(stored) as StoredChatState;
      } catch {
        this.state = createInitialState();
      }
    } else {
      this.state = createInitialState();
    }
    return this.state;
  }

  private async persist(state: StoredChatState) {
    this.state = state;
    await AsyncStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state));
  }

  async load(): Promise<ChatSnapshot> {
    const state = await this.getState();
    return {
      contacts: state.contacts.map((contact) => ({ ...contact })),
      conversations: sortConversations(state.conversations).map((conversation) => ({ ...conversation })),
    };
  }

  async getMessages(conversationId: string) {
    const state = await this.getState();
    return state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((first, second) => Date.parse(first.sentAt) - Date.parse(second.sentAt))
      .map((message) => ({ ...message }));
  }

  async startConversation(contactId: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact?.isEventisUser) throw new Error("Only Eventis users can receive messages.");

    const existing = state.conversations.find((item) => item.contactId === contactId);
    if (existing) return { ...existing };

    const conversation: ChatConversation = {
      id: `conversation-${contactId}-${Date.now()}`,
      contactId,
      lastMessage: "Start a conversation",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    const nextState = { ...state, conversations: [conversation, ...state.conversations] };
    await this.persist(nextState);
    return { ...conversation };
  }

  async sendMessage(conversationId: string, text: string) {
    const state = await this.getState();
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) throw new Error("Conversation not found.");

    const message: ChatMessage = {
      id: `message-${Date.now()}`,
      conversationId,
      text: text.trim(),
      sentAt: new Date().toISOString(),
      direction: "outgoing",
      status: "sent",
    };
    const conversations = state.conversations.map((item) =>
      item.id === conversationId
        ? { ...item, lastMessage: message.text, lastMessageAt: message.sentAt, unreadCount: 0 }
        : item,
    );
    await this.persist({ ...state, messages: [...state.messages, message], conversations });
    return { ...message };
  }

  async inviteContact(contactId: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) throw new Error("Contact not found.");
    const updated = { ...contact, invited: true };
    const contacts = state.contacts.map((item) => (item.id === contactId ? updated : item));
    await this.persist({ ...state, contacts });
    return { ...updated };
  }

  async updateContactName(contactId: string, name: string) {
    const state = await this.getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) throw new Error("Contact not found.");
    const updated = { ...contact, name: name.trim() };
    const contacts = state.contacts.map((item) => (item.id === contactId ? updated : item));
    await this.persist({ ...state, contacts });
    return { ...updated };
  }

  async lookupPhone(phone: string): Promise<PhoneLookupResult> {
    const state = await this.getState();
    const normalized = normalizePhone(phone);
    const contact = state.contacts.find((item) => normalizePhone(item.phone) === normalized);
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

export const chatService: ChatService = new MockChatService();
