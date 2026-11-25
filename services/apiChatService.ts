import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { API_BASE, api, getToken, refreshSession } from "@/utils/apiClient";

import type {
  ChatContact,
  ChatContactUpdate,
  ChatConversation,
  ChatMessage,
  ChatReport,
  ChatUserSearchPage,
  ChatService,
  ChatSnapshot,
  PhoneLookupResult,
} from "./chatService";

interface ApiProfile {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface ApiParticipant {
  userId: string;
  isOnline?: boolean;
  isArchived: boolean;
  isMuted: boolean;
  hiddenAt: string | null;
  profile: ApiProfile | null;
}

interface ApiAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  downloadPath: string;
}

interface ApiReceipt {
  participantId: string;
  status: string;
}

interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  replyToId: string | null;
  forwardedFromId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments: ApiAttachment[];
  receipts: ApiReceipt[];
}

interface ApiConversation {
  id: string;
  type: string;
  service: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: ApiMessage | null;
  participants: ApiParticipant[];
}

interface ApiAlias {
  phone: string;
  contactUserId: string | null;
  firstName: string;
  lastName: string | null;
  updatedAt: string;
}

interface ApiContact {
  name: string | null;
  phoneNumber: string;
  isRegistered: boolean;
  userId: string | null;
  action: "MESSAGE" | "INVITE" | "INVALID";
  profile: ApiProfile | null;
}

interface ApiInvitation {
  id: string;
  phoneNumber: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  shareUrl: string;
}

interface ConversationPage {
  items: ApiConversation[];
  page: number;
  limit: number;
  total: number;
}

interface ApiDiscoverableUser {
  id: string;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

const FALLBACK_AVATAR = "";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function displayName(profile: ApiProfile | null, fallback: string) {
  const name = profile?.displayName?.trim();
  if (name) return name;
  const full = [profile?.firstName, profile?.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
  return full || fallback;
}

function messagePreview(message: ApiMessage | null) {
  if (!message) return "Start a conversation";
  if (message.content?.trim()) return message.content;
  if (message.type === "IMAGE") return "Photo";
  if (message.type === "VOICE") return "Voice message";
  if (message.attachments.some((item) => item.mimeType.startsWith("video/")))
    return "Video";
  if (message.type === "FILE") return "Attachment";
  return "Message";
}

function extensionOf(uri: string) {
  return /\.([a-z0-9]{1,8})(?:[?#]|$)/i.exec(uri)?.[1]?.toLowerCase();
}

function inferMimeType(uri: string, fallback: string) {
  const extension = extensionOf(uri);
  if (extension === "mp4" || extension === "mov" || extension === "m4v")
    return "video/mp4";
  if (extension === "m4a" || extension === "aac") return "audio/mp4";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "wav") return "audio/wav";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic" || extension === "heif") return "image/heic";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return fallback;
}

async function appendChatFile(
  form: FormData,
  uri: string,
  name: string,
  type: string,
) {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("This attachment could not be opened.");
    form.append("file", await response.blob(), name);
    return;
  }
  const file = new File(uri);
  form.append(
    "file",
    {
      name,
      type,
      bytes: () => file.bytes(),
    } as unknown as Blob,
  );
}

function aliasContact(alias: ApiAlias): ChatContact {
  const name =
    [alias.firstName, alias.lastName].filter(Boolean).join(" ") || alias.phone;
  return {
    id: alias.contactUserId ?? `phone:${alias.phone}`,
    name,
    phone: alias.phone,
    avatarUrl: FALLBACK_AVATAR,
    headline: alias.contactUserId
      ? "On Eventis"
      : "Saved in your contacts",
    isEventisUser: Boolean(alias.contactUserId),
    firstName: alias.firstName,
    lastName: alias.lastName ?? "",
    isInAddressBook: true,
  };
}

export class ApiChatService implements ChatService {
  private readonly aliases = new Map<string, ApiAlias>();
  private readonly aliasByUserId = new Map<string, ApiAlias>();
  private readonly contacts = new Map<string, ChatContact>();
  private readonly messageCache = new Map<string, ApiMessage>();
  private readonly invitedPhones = new Set<string>();
  private readonly blockedIds = new Set<string>();
  private readonly attachmentDownloads = new Map<string, Promise<string>>();
  private readonly webAttachmentUrls = new Map<string, string>();
  private selfId = "";
  private directoryLoadedAt = 0;

  constructor(private readonly getSelfId: () => string) {}

  private currentUserId(): string {
    if (!this.selfId) this.selfId = this.getSelfId();
    return this.selfId;
  }

  async load(reuseDirectory = false): Promise<ChatSnapshot> {
    if (reuseDirectory && Date.now() - this.directoryLoadedAt < 120_000) {
      return this.mapInbox(await this.fetchConversations());
    }
    const [aliases, invitations, blocks, conversations] = await Promise.all([
      api
        .get<{ items: ApiAlias[] }>("/api/v1/chat/contacts/aliases")
        .catch(() => ({ items: [] as ApiAlias[] })),
      api.get<ApiInvitation[]>("/api/v1/chat/invitations").catch(() => []),
      api
        .get<{ userIds: string[] }>("/api/v1/chat/blocks")
        .catch(() => ({ userIds: [] as string[] })),
      this.fetchConversations(),
    ]);
    this.directoryLoadedAt = Date.now();
    this.aliases.clear();
    this.aliasByUserId.clear();
    this.contacts.clear();
    this.blockedIds.clear();
    this.invitedPhones.clear();
    for (const invitation of invitations) {
      if (invitation.status === "PENDING") {
        this.invitedPhones.add(normalizePhone(invitation.phoneNumber));
      }
    }
    for (const blockedId of blocks.userIds) this.blockedIds.add(blockedId);
    for (const alias of aliases.items) {
      const contact = aliasContact(alias);
      if (this.invitedPhones.has(normalizePhone(alias.phone))) {
        contact.invited = true;
      }
      if (this.blockedIds.has(contact.id)) contact.blocked = true;
      this.aliases.set(contact.id, alias);
      if (alias.contactUserId) this.aliasByUserId.set(alias.contactUserId, alias);
      this.contacts.set(contact.id, contact);
    }

    return this.mapInbox(conversations);
  }

  private mapInbox(conversations: ApiConversation[]): ChatSnapshot {
    const mapped = conversations.map((conversation) =>
      this.mapConversation(conversation),
    );
    mapped.sort(
      (first, second) =>
        Date.parse(second.lastMessageAt) - Date.parse(first.lastMessageAt),
    );
    return {
      contacts: [...this.contacts.values()],
      conversations: mapped,
      messages: [],
    };
  }

  async getMessages(conversationId: string, deferAttachments = false): Promise<ChatMessage[]> {
    const result = await api.get<{ items: ApiMessage[] }>(
      `/api/v1/chat/conversations/${conversationId}/messages?limit=100`,
    );
    const ascending = [...result.items];
    for (const message of ascending) {
      this.messageCache.set(message.id, message);
    }
    return Promise.all(
      ascending
        .filter((message) => !message.deletedAt)
        .map((message) => this.mapMessage(message, undefined, deferAttachments)),
    );
  }

  async startConversation(contactId: string): Promise<ChatConversation> {
    if (contactId.startsWith("phone:") || contactId.startsWith("group:")) {
      throw new Error(
        "This person needs to join Eventis before you can message them.",
      );
    }
    const conversation = await api.post<ApiConversation>(
      "/api/v1/chat/conversations",
      { userIds: [contactId], service: "EVENTIS" },
    );
    return this.mapConversation(conversation);
  }

  async sendMessage(
    conversationId: string,
    text: string,
    options?: Parameters<ChatService["sendMessage"]>[2],
  ): Promise<ChatMessage> {
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mediaUri = options?.videoUri ?? options?.imageUri ?? options?.audioUri;
    if (mediaUri) {
      const fallbackType = options?.videoUri
        ? "video/mp4"
        : options?.imageUri
          ? "image/jpeg"
          : "audio/mp4";
      const type =
        options?.attachmentMimeType ??
        inferMimeType(mediaUri, fallbackType);
      const extension = extensionOf(mediaUri);
      const name =
        options?.attachmentName ??
        `${options?.videoUri ? "video" : options?.imageUri ? "photo" : "voice"}-${Date.now()}.${extension ?? (options?.videoUri ? "mp4" : options?.imageUri ? "jpg" : "m4a")}`;
      const form = new FormData();
      await appendChatFile(form, mediaUri, name, type);
      if (text.trim()) form.append("content", text.trim());
      if (options?.replyTo) form.append("replyToId", options.replyTo.id);
      const durationMs = options?.videoDurationMs ?? options?.audioDurationMs;
      if (durationMs !== undefined) form.append("durationMs", String(durationMs));
      if (options?.attachmentWidth !== undefined)
        form.append("width", String(options.attachmentWidth));
      if (options?.attachmentHeight !== undefined)
        form.append("height", String(options.attachmentHeight));
      form.append("clientMessageId", clientMessageId);
      const message = await api.postForm<ApiMessage>(
        `/api/v1/chat/conversations/${conversationId}/messages/attachments`,
        form,
      );
      this.messageCache.set(message.id, message);
      return this.mapMessage(message, mediaUri);
    }
    if (!text.trim()) throw new Error("Enter a message.");
    const message = await api.post<ApiMessage>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      {
        content: text.trim(),
        ...(options?.replyTo ? { replyToId: options.replyTo.id } : {}),
        clientMessageId,
      },
    );
    this.messageCache.set(message.id, message);
    return this.mapMessage(message);
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<void> {
    if (!text.trim()) throw new Error("Enter a message.");
    await api.patch(`/api/v1/chat/messages/${messageId}`, {
      content: text.trim(),
    });
    this.messageCache.delete(messageId);
    void conversationId;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await api.delete(`/api/v1/chat/messages/${messageId}`);
    this.messageCache.delete(messageId);
    void conversationId;
  }

  async clearConversation(
    conversationId: string,
    remove = false,
  ): Promise<void> {
    await api.delete(`/api/v1/chat/conversations/${conversationId}`);
    if (!remove) {
      await api
        .post(`/api/v1/chat/conversations/${conversationId}/unhide`)
        .catch(() => undefined);
    }
  }

  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    await api.patch(`/api/v1/chat/conversations/${conversationId}/settings`, {
      isMuted: muted,
    });
  }

  async setBlocked(contactId: string, blocked: boolean): Promise<void> {
    if (blocked) {
      await api.post("/api/v1/chat/blocks", { userId: contactId });
      this.blockedIds.add(contactId);
      return;
    }
    await api.delete(`/api/v1/chat/blocks/${contactId}`);
    this.blockedIds.delete(contactId);
  }

  async reportContact(
    contactId: string,
    reason: string,
    messageId?: string,
  ): Promise<ChatReport> {
    const conversation = [...this.messageCache.values()].find(
      (message) => message.id === messageId,
    );
    const result = await api.post<{ id: string }>("/api/v1/chat/reports", {
      userId: contactId,
      reason,
      ...(conversation ? { conversationId: conversation.conversationId } : {}),
    });
    return {
      id: result.id,
      contactId,
      messageId,
      reason,
      createdAt: new Date().toISOString(),
      status: "submitted",
    };
  }

  async simulateIncoming(): Promise<ChatMessage> {
    throw new Error("Demo messages are only available in demo mode.");
  }

  async inviteContact(contactId: string): Promise<ChatContact> {
    const contact = this.contacts.get(contactId);
    if (!contact) throw new Error("Contact not found.");
    if (!contact.phone) {
      throw new Error("This contact does not have a phone number to invite.");
    }
    const invitation = await api.post<ApiInvitation>(
      "/api/v1/chat/invitations",
      { phoneNumber: contact.phone, service: "EVENTIS" },
    );
    this.invitedPhones.add(normalizePhone(contact.phone));
    const updated: ChatContact = {
      ...contact,
      invited: true,
      inviteUrl: invitation.shareUrl,
    };
    this.contacts.set(contactId, updated);
    return updated;
  }

  async updateContactName(
    contactId: string,
    name: string,
  ): Promise<ChatContact> {
    const contact = this.contacts.get(contactId);
    if (!contact) throw new Error("Contact not found.");
    const [firstName = "", ...rest] = name.trim().split(/\s+/);
    return this.updateContact(contactId, {
      firstName,
      lastName: rest.join(" "),
      phone: contact.phone,
      isInAddressBook: contact.isInAddressBook,
      deviceContactId: contact.deviceContactId,
    });
  }

  async updateContact(
    contactId: string,
    update: ChatContactUpdate,
  ): Promise<ChatContact> {
    const existing = this.contacts.get(contactId);
    if (!existing) throw new Error("Contact not found.");
    const firstName = update.firstName.trim();
    if (!firstName) throw new Error("Enter a first name.");
    const nextPhone = update.phone.trim();
    if (!nextPhone) throw new Error("Enter a phone number.");
    const currentAlias = this.aliases.get(contactId);
    if (!currentAlias) {
      throw new Error(
        "This contact is not saved on the server yet. Sync your phone contacts and try again.",
      );
    }
    const alias = await api.patch<ApiAlias>("/api/v1/chat/contacts/aliases", {
      phoneNumber: currentAlias.phone,
      firstName,
      lastName: update.lastName.trim(),
      ...(normalizePhone(nextPhone) !== normalizePhone(currentAlias.phone)
        ? { newPhoneNumber: nextPhone }
        : {}),
    });
    const contact = aliasContact(alias);
    const updated: ChatContact = {
      ...contact,
      id: contactId,
      avatarUrl: alias.contactUserId === existing.id ? existing.avatarUrl : contact.avatarUrl,
      isInAddressBook: update.isInAddressBook ?? true,
      deviceContactId: update.deviceContactId,
    };
    this.contacts.set(contactId, updated);
    this.aliases.set(contactId, alias);
    if (alias.contactUserId) this.aliasByUserId.set(alias.contactUserId, alias);
    return updated;
  }

  async lookupPhone(phone: string): Promise<PhoneLookupResult> {
    const result = await api.post<{ contacts: ApiContact[] }>(
      "/api/v1/chat/contacts/sync",
      { contacts: [{ phoneNumber: phone }] },
    );
    const match = result.contacts[0];
    if (!match || match.action === "INVALID" || match.userId === this.currentUserId()) {
      return { kind: "not_found", phone };
    }
    const contact = this.contactFromSync(match);
    this.contacts.set(contact.id, contact);
    this.aliases.set(contact.id, {
      phone: match.phoneNumber,
      contactUserId: match.userId,
      firstName: contact.firstName ?? contact.name,
      lastName: contact.lastName ?? null,
      updatedAt: new Date().toISOString(),
    });
    if (match.action === "MESSAGE") return { kind: "eventis", contact };
    return {
      kind: "invite",
      contact: {
        ...contact,
        invited: this.invitedPhones.has(normalizePhone(match.phoneNumber)),
      },
    };
  }

  async markConversationRead(conversationId: string): Promise<void> {
    await api.patch(`/api/v1/chat/conversations/${conversationId}/read`);
  }

  async syncContacts(
    contacts: Array<{ name?: string; phoneNumber: string }>,
  ): Promise<ChatContact[]> {
    if (!contacts.length) return [];
    const result = await api.post<{ contacts: ApiContact[] }>(
      "/api/v1/chat/contacts/sync",
      { contacts },
    );
    return result.contacts.map((contact) => {
      const mapped = this.contactFromSync(contact);
      this.contacts.set(mapped.id, mapped);
      return mapped;
    });
  }

  async searchUsers(query: string, page = 1): Promise<ChatUserSearchPage> {
    const result = await api.get<{
      items: ApiDiscoverableUser[];
      page: number;
      limit: number;
      hasMore: boolean;
    }>(`/api/v1/chat/users/search?query=${encodeURIComponent(query)}&page=${page}&limit=20`);
    const items = result.items.map((profile): ChatContact => {
      const username = profile.username?.trim() || undefined;
      return {
        id: profile.id,
        username,
        name: displayName(profile, username ? `@${username}` : "Eventis user"),
        phone: "",
        avatarUrl: profile.avatarUrl ?? FALLBACK_AVATAR,
        headline: username ? `@${username} · On Eventis` : "On Eventis",
        isEventisUser: true,
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        isInAddressBook: false,
      };
    });
    for (const contact of items) this.contacts.set(contact.id, contact);
    return { items, page: result.page, hasMore: result.hasMore };
  }

  async acceptInvitation(token: string): Promise<ChatConversation> {
    const result = await api.post<{ conversation: ApiConversation }>(
      "/api/v1/chat/invitations/accept",
      { token },
    );
    return this.mapConversation(result.conversation);
  }

  private async fetchConversations(): Promise<ApiConversation[]> {
    const all: ApiConversation[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const result = await api.get<ConversationPage>(
        `/api/v1/chat/conversations?page=${page}&limit=100`,
      );
      all.push(...result.items);
      if (all.length >= result.total || result.items.length === 0) break;
    }
    return all;
  }

  private contactFromSync(contact: ApiContact): ChatContact {
    const profile = contact.profile;
    const id = contact.userId ?? `phone:${contact.phoneNumber}`;
    return {
      id,
      name: contact.name?.trim() || displayName(profile, contact.phoneNumber),
      phone: contact.phoneNumber,
      avatarUrl: profile?.avatarUrl ?? FALLBACK_AVATAR,
      headline: contact.isRegistered ? "On Eventis" : "Saved in your contacts",
      isEventisUser: contact.isRegistered,
      firstName: profile?.firstName ?? undefined,
      lastName: profile?.lastName ?? undefined,
      isInAddressBook: true,
    };
  }

  private mapConversation(conversation: ApiConversation): ChatConversation {
    const contact = this.contactForConversation(conversation);
    this.contacts.set(contact.id, contact);
    const self = conversation.participants.find(
      (participant) => participant.userId === this.currentUserId(),
    );
    return {
      id: conversation.id,
      contactId: contact.id,
      lastMessage: messagePreview(conversation.lastMessage),
      lastMessageStatus: conversation.lastMessage && conversation.lastMessage.senderId === this.currentUserId()
        ? this.receiptStatus(conversation.lastMessage) : undefined,
      lastMessageAt:
        conversation.lastMessage?.createdAt ?? conversation.updatedAt,
      unreadCount: conversation.unreadCount,
      muted: self?.isMuted ?? false,
    };
  }

  private contactForConversation(conversation: ApiConversation): ChatContact {
    if (conversation.type === "GROUP") {
      return {
        id: `group:${conversation.id}`,
        name: conversation.title?.trim() || "Group chat",
        phone: "",
        avatarUrl: FALLBACK_AVATAR,
        headline: `${conversation.participants.length} members`,
        isEventisUser: true,
      };
    }
    const peer =
      conversation.participants.find(
        (participant) => participant.userId !== this.currentUserId(),
      ) ?? conversation.participants[0];
    const profile = peer?.profile ?? null;
    const alias = profile ? this.aliasByUserId.get(profile.id) : undefined;
    const id = peer?.userId ?? `conversation:${conversation.id}`;
    return {
      id,
      name: displayName(profile, conversation.title ?? "Eventis user"),
      phone: alias?.phone ?? "",
      avatarUrl: profile?.avatarUrl ?? FALLBACK_AVATAR,
      headline: "On Eventis",
      isEventisUser: true,
      isOnline: peer?.isOnline ?? false,
      firstName: profile?.firstName ?? alias?.firstName ?? undefined,
      lastName: profile?.lastName ?? alias?.lastName ?? undefined,
      isInAddressBook: Boolean(alias),
      ...(this.blockedIds.has(id) ? { blocked: true } : {}),
    };
  }

  private async resolveAttachment(
    attachment: ApiAttachment,
  ): Promise<string> {
    const pending = this.attachmentDownloads.get(attachment.id);
    if (pending) return pending;
    const download = this.downloadAttachment(attachment);
    this.attachmentDownloads.set(attachment.id, download);
    try {
      return await download;
    } finally {
      this.attachmentDownloads.delete(attachment.id);
    }
  }

  private async downloadAttachment(attachment: ApiAttachment): Promise<string> {
    if (Platform.OS === "web") {
      const cached = this.webAttachmentUrls.get(attachment.id);
      if (cached) return cached;
      const blob = await api.getBlob(attachment.downloadPath);
      if (blob.size !== attachment.sizeBytes || !blob.size) {
        throw new Error("The attachment download was incomplete.");
      }
      const uri = URL.createObjectURL(blob);
      this.webAttachmentUrls.set(attachment.id, uri);
      return uri;
    }
    const extension = extensionOf(attachment.fileName);
    const file = new File(
      Paths.cache,
      `chat-v2-${this.currentUserId()}-${attachment.id}${extension ? `.${extension}` : ""}`,
    );
    if (file.exists && file.size === attachment.sizeBytes && file.size > 0) return file.uri;
    if (file.exists) file.delete();
    try {
      let token = await getToken();
      if (!token) throw new Error("Please sign in again to download this attachment.");
      const download = (accessToken: string) => File.downloadFileAsync(
        `${API_BASE}${attachment.downloadPath}`, file,
        { headers: { Authorization: `Bearer ${accessToken}` }, idempotent: true },
      );
      let downloaded: File;
      try {
        downloaded = await download(token);
      } catch (error) {
        if (!(error instanceof Error) || !/\b401\b/.test(error.message)) throw error;
        token = await refreshSession();
        downloaded = await download(token);
      }
      if (downloaded.size !== attachment.sizeBytes || downloaded.size === 0) {
        throw new Error("The attachment download was incomplete.");
      }
      return downloaded.uri;
    } catch (error) {
      if (file.exists) file.delete();
      throw error;
    }
  }

  async loadAttachment(messageId: string): Promise<Partial<ChatMessage>> {
    const message = this.messageCache.get(messageId);
    if (!message?.attachments.length) throw new Error("This attachment is unavailable.");
    const { imageUri, audioUri, videoUri, attachmentError, audioDurationMs, videoDurationMs } = await this.mapMessage(message);
    return { imageUri, audioUri, videoUri, attachmentError, audioDurationMs, videoDurationMs };
  }

  private async mapMessage(
    message: ApiMessage,
    localMediaUri?: string,
    deferAttachments = false,
  ): Promise<ChatMessage> {
    const reply = message.replyToId
      ? this.messageCache.get(message.replyToId)
      : undefined;
    const attachment = message.attachments[0];
    let uri = localMediaUri;
    let attachmentError: string | undefined;
    if (!uri && attachment && !deferAttachments) {
      try {
        uri = await this.resolveAttachment(attachment);
      } catch (error) {
        console.warn("Chat attachment download failed:", error);
        attachmentError = "Attachment could not be downloaded. Tap to retry.";
      }
    }
    const mimeType = attachment?.mimeType ?? "";
    const result: ChatMessage = {
      id: message.id,
      conversationId: message.conversationId,
      text: message.content ?? "",
      sentAt: message.createdAt,
      direction:
        message.senderId === this.currentUserId() ? "outgoing" : "incoming",
      status: this.receiptStatus(message),
      ...(message.editedAt ? { editedAt: message.editedAt } : {}),
      ...(message.forwardedFromId ? { forwarded: true } : {}),
      ...(reply
        ? {
            replyTo: {
              id: reply.id,
              text: reply.content ?? "",
              direction:
                reply.senderId === this.currentUserId()
                  ? ("outgoing" as const)
                  : ("incoming" as const),
            },
          }
        : {}),
    };
    if (attachment) {
      if (deferAttachments) result.attachmentDeferred = true;
      result.attachmentName = attachment.fileName;
      result.attachmentMimeType = attachment.mimeType;
      if (attachmentError) result.attachmentError = attachmentError;
      if (attachment.width !== null) result.attachmentWidth = attachment.width;
      if (attachment.height !== null) result.attachmentHeight = attachment.height;
      if (uri) {
        if (message.type === "IMAGE" || mimeType.startsWith("image/")) {
          result.imageUri = uri;
        } else if (message.type === "VOICE" || mimeType.startsWith("audio/")) {
          result.audioUri = uri;
          if (attachment.durationMs !== null)
            result.audioDurationMs = attachment.durationMs;
        } else if (mimeType.startsWith("video/")) {
          result.videoUri = uri;
          if (attachment.durationMs !== null)
            result.videoDurationMs = attachment.durationMs;
        }
      }
    }
    return result;
  }

  private receiptStatus(
    message: ApiMessage,
  ): "sent" | "delivered" | "read" {
    if (message.senderId !== this.currentUserId()) return "read";
    const receipts = message.receipts;
    if (!receipts.length) return "sent";
    if (receipts.every(receipt => receipt.status === "READ")) return "read";
    if (receipts.every(receipt => receipt.status === "DELIVERED" || receipt.status === "READ")) return "delivered";
    return "sent";
  }
}

export function createApiChatService(getSelfId: () => string) {
  return new ApiChatService(getSelfId);
}
