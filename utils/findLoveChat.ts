/**
 * FindLove chat rules shared by the Inbox, the chat screen, the service and
 * the tests. No React or storage imports.
 */

export type LoveChatContent =
  | { kind: "text"; text: string }
  | { kind: "voice"; uri: string; durationMs: number }
  | { kind: "document"; name: string; size?: number };

export type LoveChatMessage = {
  id: string;
  /** ISO timestamp. */
  sentAt: string;
  /** Sent by the signed-in member. */
  own: boolean;
} & LoveChatContent;

/** One conversation: its messages (oldest first) and when the member last read it. */
export interface LoveChatThread {
  messages: LoveChatMessage[];
  readAt?: string;
}

export interface LoveConversationSummary {
  profileId: string;
  lastMessage?: LoveChatMessage;
  unreadCount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;

/** One line for the Inbox row. */
export function loveMessagePreview(message: LoveChatMessage): string {
  const body =
    message.kind === "text" ? message.text : message.kind === "voice" ? "Voice message" : `Document: ${message.name}`;
  return message.own ? `You: ${body}` : body;
}

/** Messages from the other person that arrived after the member last opened the chat. */
export function countUnread(thread: LoveChatThread | undefined): number {
  if (!thread) return 0;
  const readAt = thread.readAt ? Date.parse(thread.readAt) : Number.NEGATIVE_INFINITY;
  return thread.messages.filter((message) => !message.own && Date.parse(message.sentAt) > readAt).length;
}

/**
 * One summary per connection. Chats with messages come first, newest first;
 * connections nobody has written to yet keep their order at the end.
 */
export function summarizeConversations(
  profileIds: string[],
  threads: Record<string, LoveChatThread | undefined>,
): LoveConversationSummary[] {
  const summaries = profileIds.map((profileId) => {
    const thread = threads[profileId];
    return { profileId, lastMessage: thread?.messages.at(-1), unreadCount: countUnread(thread) };
  });
  const time = (summary: LoveConversationSummary) =>
    summary.lastMessage ? Date.parse(summary.lastMessage.sentAt) : Number.NEGATIVE_INFINITY;
  return summaries.sort((a, b) => time(b) - time(a));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "14:05", 24-hour, in the device's time zone. */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Inbox time: "14:05" today, then "Yesterday", a weekday this week, else "12 Oct" (with the year if it isn't this year). */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (daysAgo <= 0) return formatMessageTime(iso);
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return WEEKDAYS[date.getDay()];
  const dayMonth = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth} ${date.getFullYear()}`;
}

/** Divider between days inside a chat: "Today", "Yesterday" or "Mon 12 Oct". */
export function formatChatDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  const label = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** True when a message starts a new day, so the chat shows a divider above it. */
export function startsNewDay(message: LoveChatMessage, previous: LoveChatMessage | undefined): boolean {
  if (!previous) return true;
  return startOfDay(new Date(message.sentAt)) !== startOfDay(new Date(previous.sentAt));
}
