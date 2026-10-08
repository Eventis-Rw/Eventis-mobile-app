import type { Event } from "@/constants/events";

export type EventPalette = {
  accent: string;
  accentSoft: string;
  deep: string;
  pageLight: readonly [string, string, string];
  pageDark: readonly [string, string, string];
};

const DEFAULT_PALETTE: EventPalette = {
  accent: "#4C78FF",
  accentSoft: "#DDE7FF",
  deep: "#101A3D",
  pageLight: ["#DDE7FF", "#F4F7FF", "#E8EEF8"],
  pageDark: ["#131D42", "#080B18", "#070814"],
};

const EVENT_PALETTES: Record<string, EventPalette> = {
  Music: {
    accent: "#7667F2",
    accentSoft: "#E3E0FF",
    deep: "#151A3D",
    pageLight: ["#E2E7FF", "#F8F9FF", "#E8EEF8"],
    pageDark: ["#171D45", "#090D1D", "#070814"],
  },
  Nightlife: {
    accent: "#8B5CF6",
    accentSoft: "#E9DFFF",
    deep: "#17183D",
    pageLight: ["#E5E7FF", "#F8F9FF", "#E8EEF8"],
    pageDark: ["#191D45", "#090D1D", "#070814"],
  },
  Food: {
    accent: "#E9903F",
    accentSoft: "#FFE8D1",
    deep: "#151B35",
    pageLight: ["#E7ECFF", "#FAFAFF", "#E8EEF8"],
    pageDark: ["#171E3D", "#090D1D", "#070814"],
  },
  Sports: {
    accent: "#2AA37B",
    accentSoft: "#D8F3E9",
    deep: "#101C36",
    pageLight: ["#E3EDFF", "#F8FAFF", "#E8EEF8"],
    pageDark: ["#121F40", "#090E1E", "#070814"],
  },
  Business: DEFAULT_PALETTE,
  Tech: {
    accent: "#278DFF",
    accentSoft: "#D9EAFF",
    deep: "#0A2142",
    pageLight: ["#D9EAFF", "#F6FAFF", "#E8EEF8"],
    pageDark: ["#0D2850", "#081020", "#070814"],
  },
  Art: {
    accent: "#C7619E",
    accentSoft: "#F5DEEC",
    deep: "#171936",
    pageLight: ["#E8E9FF", "#FAF9FF", "#E8EEF8"],
    pageDark: ["#1A1C40", "#0A0D1D", "#070814"],
  },
  Community: {
    accent: "#C88E2F",
    accentSoft: "#F8E9C9",
    deep: "#151B35",
    pageLight: ["#E6ECFF", "#FAFAFF", "#E8EEF8"],
    pageDark: ["#171E3D", "#090D1D", "#070814"],
  },
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
