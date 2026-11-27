import * as Haptics from "expo-haptics";
import { Share } from "react-native";

import { formatEventLocation } from "@/constants/eventPresentation";
import type { Event } from "@/constants/events";

/** Matches the event link shareEvent()/eventShareText() embed in a message, wherever it falls in the text. */
export const EVENT_SHARE_LINK_REGEX = /https?:\/\/eventis\.app\/event\/([0-9a-f-]{36})/i;

export function extractSharedEventId(text: string): string | null {
  return EVENT_SHARE_LINK_REGEX.exec(text)?.[1] ?? null;
}

/** The message text sent when sharing an event into an Eventis chat (as opposed to the OS share sheet). */
export function eventShareText(event: Event): string {
  const date = new Date(event.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `Check out this event: ${event.title}\n📍 ${formatEventLocation(event)}\n📅 ${date} · ${event.time}\nhttps://eventis.app/event/${encodeURIComponent(event.id)}`;
}

// Shared by the event cards and Event Details so both send the same message.
export async function shareEvent(event: Event): Promise<boolean> {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const date = new Date(event.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  try {
    const result = await Share.share({
      title: event.title,
      message: `Check out "${event.title}" on ${date} at ${event.location}, ${event.city}\nhttps://eventis.app/event/${encodeURIComponent(event.id)}`,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.warn("shareEvent: native share failed", error);
    return false;
  }
}
