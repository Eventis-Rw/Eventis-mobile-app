/**
 * FindLove connection requests: who may send what before two members are
 * connected. No React or storage imports, so screens, contexts, the service
 * and the tests share one definition.
 *
 * Until a request is accepted each side may send ONE text message: the sender
 * with their request, the receiver as a reply. The server must enforce the same
 * rule; the app only applies it so people see the limit instead of an error.
 */

import type { LoveConnectionStatus } from "@/constants/loveProfiles";
import type { LoveChatThread } from "@/utils/findLoveChat";

/** Messages sent before connecting are short notes, not a chat. */
export const LOVE_REQUEST_MESSAGE_MAX = 200;

/** Connected members chat freely; everyone else gets one message each. */
export function messagesAllowedBeforeConnect(status: LoveConnectionStatus): number {
  return status === "connected" ? Infinity : 1;
}

/** How many more messages the viewer may send to this member right now. */
export function messagesLeft(status: LoveConnectionStatus, thread: LoveChatThread | undefined): number {
  const allowed = messagesAllowedBeforeConnect(status);
  if (allowed === Infinity) return Infinity;
  const sent = thread?.messages.filter((message) => message.own).length ?? 0;
  return Math.max(0, allowed - sent);
}

export function validateLoveRequestMessage(value: string): string | undefined {
  const text = value.trim();
  if (!text) return "Write a message first.";
  if (text.length > LOVE_REQUEST_MESSAGE_MAX) return `Keep it under ${LOVE_REQUEST_MESSAGE_MAX} characters.`;
  return undefined;
}
