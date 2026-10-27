import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LoveChatMessage, LoveChatThread } from "@/utils/findLoveChat";

export type LoveChatThreads = Record<string, LoveChatThread>;

// FindLove chats are kept on the device, per member, until the messaging API exists.
// INTEGRATION POINT (proposed):
//   GET  /api/v1/love-chats                      -> [{ profileId, lastMessage, unreadCount }]
//   GET  /api/v1/love-chats/:profileId/messages  -> LoveChatMessage[]
//   POST /api/v1/love-chats/:profileId/messages  -> LoveChatMessage (server sets id and sentAt)
//   POST /api/v1/love-chats/:profileId/read      -> marks the chat read up to now
// The server must only allow chats between connected members.
const chatsKey = (userId: string) => `@eventis_findlove_chats_v1_${userId}`;

const MINUTE = 60 * 1000;

/** Sample chats with the demo's connected members, dated relative to now so the Inbox times look real. */
function demoThreads(now: number): LoveChatThreads {
  const at = (minutesAgo: number) => new Date(now - minutesAgo * MINUTE).toISOString();
  const text = (id: string, minutesAgo: number, own: boolean, body: string): LoveChatMessage => ({
    id,
    sentAt: at(minutesAgo),
    own,
    kind: "text",
    text: body,
  });
  return {
    "love-amara": {
      // The last two arrived after the member last looked, so they show as unread.
      readAt: at(40),
      messages: [
        text("demo-amara-1", 55, false, "Hey! Great to connect here. Are you going to any events this weekend?"),
        text("demo-amara-2", 48, true, "I was thinking about the Kigali Jazz Night. It looks like a good one."),
        text("demo-amara-3", 12, false, "Same! I have been meaning to check it out."),
        text("demo-amara-4", 9, false, "We should say hi there 😊"),
      ],
    },
    "love-ethan": {
      readAt: at(26 * 60),
      messages: [
        text("demo-ethan-1", 27 * 60, false, "Thanks for connecting! Have you tried the new food market in Kimihurura?"),
        text("demo-ethan-2", 26 * 60, true, "Not yet, is it good? I'm always looking for new spots."),
      ],
    },
  };
}

function isThread(value: unknown): value is LoveChatThread {
  return !!value && typeof value === "object" && Array.isArray((value as LoveChatThread).messages);
}

export async function loadLoveChats(userId: string, now: number = Date.now()): Promise<LoveChatThreads> {
  const stored = await AsyncStorage.getItem(chatsKey(userId));
  if (!stored) return demoThreads(now);
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return demoThreads(now);
    return Object.fromEntries(Object.entries(parsed).filter(([, thread]) => isThread(thread))) as LoveChatThreads;
  } catch {
    return demoThreads(now);
  }
}

export async function saveLoveChats(userId: string, threads: LoveChatThreads): Promise<void> {
  await AsyncStorage.setItem(chatsKey(userId), JSON.stringify(threads));
}
