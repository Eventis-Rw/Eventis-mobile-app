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
    accent: "#9B6DFF",
    accentSoft: "#E9E0FF",
    deep: "#21113F",
    pageLight: ["#E9E0FF", "#FAF7FF", "#ECE9F7"],
    pageDark: ["#251346", "#100B1C", "#070814"],
  },
  Nightlife: {
    accent: "#FF5A9F",
    accentSoft: "#FFE0ED",
    deep: "#3D102B",
    pageLight: ["#FFE0ED", "#FFF7FA", "#F5E9F0"],
    pageDark: ["#40122E", "#170A15", "#070814"],
  },
  Food: {
    accent: "#FF8B3D",
    accentSoft: "#FFE7D5",
    deep: "#3C1C0C",
    pageLight: ["#FFE7D5", "#FFF9F4", "#F6EDE7"],
    pageDark: ["#3C1D0D", "#160E0A", "#070814"],
  },
  Sports: {
    accent: "#24B982",
    accentSoft: "#D8F7EA",
    deep: "#0C3529",
    pageLight: ["#D8F7EA", "#F5FCF9", "#E6F2ED"],
    pageDark: ["#0D382B", "#091612", "#070814"],
  },
  Business: DEFAULT_PALETTE,
  Tech: {
    accent: "#13A9D2",
    accentSoft: "#D6F5FC",
    deep: "#0A3040",
    pageLight: ["#D6F5FC", "#F4FCFE", "#E5F1F4"],
    pageDark: ["#0B3342", "#081419", "#070814"],
  },
  Art: {
    accent: "#E960A9",
    accentSoft: "#FBE0F0",
    deep: "#3A1430",
    pageLight: ["#FBE0F0", "#FFF7FC", "#F3E8EF"],
    pageDark: ["#3C1732", "#170C15", "#070814"],
  },
  Community: {
    accent: "#D99712",
    accentSoft: "#FFF0C9",
    deep: "#382707",
    pageLight: ["#FFF0C9", "#FFFBF1", "#F4EEE0"],
    pageDark: ["#392809", "#171206", "#070814"],
  },
};

export function getEventPalette(category: string) {
  return EVENT_PALETTES[category] ?? DEFAULT_PALETTE;
}

export type EventTiming = {
  kind: "live" | "today" | "upcoming" | "ended";
  label: string;
};

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
