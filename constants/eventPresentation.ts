import type { Event } from "@/constants/events";

export type EventPalette = {
  accent: string;
  accentSoft: string;
  deep: string;
  pageLight: readonly [string, string, string];
  pageDark: readonly [string, string, string];
};

const DEFAULT_PALETTE: EventPalette = {
  accent: "#2F6BFF",
  accentSoft: "#D9E6FF",
  deep: "#0D1838",
  pageLight: ["#D9E6FF", "#F4F7FF", "#E8EEF8"],
  pageDark: ["#172149", "#070814", "#070814"],
};

const EVENT_PALETTES: Record<string, EventPalette> = {
  Music: DEFAULT_PALETTE,
  Nightlife: DEFAULT_PALETTE,
  Food: DEFAULT_PALETTE,
  Sports: DEFAULT_PALETTE,
  Business: DEFAULT_PALETTE,
  Tech: DEFAULT_PALETTE,
  Art: DEFAULT_PALETTE,
  Community: DEFAULT_PALETTE,
};

export function getEventPalette(category: string) {
  return EVENT_PALETTES[category] ?? DEFAULT_PALETTE;
}

export type EventTiming = {
  kind: "live" | "today" | "upcoming" | "ended";
  label: string;
};

export type EventGroup = "today" | "tomorrow" | "weekend" | "upcoming";

export const EVENT_GROUP_LABELS: Record<EventGroup, { title: string; subtitle: string }> = {
  today: { title: "Today", subtitle: "Plans you can still make today" },
  tomorrow: { title: "Tomorrow", subtitle: "One day ahead, already sorted" },
  weekend: { title: "This weekend", subtitle: "A short list for your weekend" },
  upcoming: { title: "Coming up", subtitle: "Worth planning ahead for" },
};

export function getEventGroup(event: Pick<Event, "date" | "time" | "endTime">, now = new Date()): EventGroup {
  const start = parseEventDate(event.date, event.time);
  if (!start || isSameDay(start, now)) return "today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(start, tomorrow)) return "tomorrow";

  const endOfWeekend = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  endOfWeekend.setDate(endOfWeekend.getDate() + daysUntilSunday);
  endOfWeekend.setHours(23, 59, 59, 999);
  if ((start.getDay() === 0 || start.getDay() === 6) && start <= endOfWeekend) return "weekend";

  return "upcoming";
}

export function getEventTiming(event: Pick<Event, "date" | "time" | "endTime">, now = new Date()): EventTiming {
  const start = parseEventDate(event.date, event.time);
  if (!start) return { kind: "upcoming", label: "Date to be confirmed" };

  const suppliedEnd = event.endTime ? parseEventDate(event.date, event.endTime) : null;
  const end = suppliedEnd ?? new Date(start.getTime() + 3 * 60 * 60 * 1000);
  if (suppliedEnd && end < start) end.setDate(end.getDate() + 1);

  if (now >= start && now <= end) {
    return { kind: "live", label: "Happening now" };
  }

  if (now > end) {
    return { kind: "ended", label: `Ended · ${formatShortDate(start)}` };
  }

  if (isSameDay(now, start)) {
    return { kind: "today", label: `Today · ${event.time}` };
  }

  return { kind: "upcoming", label: `Upcoming · ${formatShortDate(start)}` };
}

function parseEventDate(date: string, time: string) {
  const value = new Date(`${date}T${normaliseTime(time)}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function normaliseTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "00:00";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
