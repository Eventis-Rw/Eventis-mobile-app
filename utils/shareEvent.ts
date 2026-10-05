import * as Haptics from "expo-haptics";
import { Share } from "react-native";

import type { Event } from "@/constants/events";

// Shared by the event cards and Event Details so both send the same message.
export async function shareEvent(event: Event): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const date = new Date(event.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  try {
    await Share.share({
      title: event.title,
      message: `Check out "${event.title}" on ${date} at ${event.location}, ${event.city}${event.organizerWebsite ? " — " + event.organizerWebsite : ""}`,
    });
  } catch {}
}
