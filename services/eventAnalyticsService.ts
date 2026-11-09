import { api } from "@/utils/apiClient";

const DAY = 24 * 60 * 60 * 1000;
const ANALYTICS_PATH = "/api/v1/me/analytics/overview";

export type AnalyticsEventType =
  | "IMPRESSION"
  | "VIEW"
  | "CLICK"
  | "SAVE"
  | "SHARE"
  | "WEBSITE_CLICK";

export interface EventAnalyticsRow {
  eventId: string;
  title: string;
  viewsCount: number;
  saves: number;
  counts: Record<AnalyticsEventType, number>;
}

export interface EventAnalyticsOverview {
  from: string;
  to: string;
  totals: Record<AnalyticsEventType, number>;
  eventViews: number;
  savedEvents: number;
  events: EventAnalyticsRow[];
  daily: Array<{
    date: string;
    impressions: number;
    views: number;
    clicks: number;
    saves: number;
    shares: number;
    websiteClicks: number;
  }>;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function eventCounts(value: unknown): Record<AnalyticsEventType, number> {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    IMPRESSION: count(source.IMPRESSION),
    VIEW: count(source.VIEW),
    CLICK: count(source.CLICK),
    SAVE: count(source.SAVE),
    SHARE: count(source.SHARE),
    WEBSITE_CLICK: count(source.WEBSITE_CLICK),
  };
}

export async function fetchEventAnalytics(days = 30): Promise<EventAnalyticsOverview> {
  const to = new Date();
  const from = new Date(to.getTime() - Math.max(1, days - 1) * DAY);
  const query = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  const raw = await api.get<Record<string, unknown>>(`${ANALYTICS_PATH}?${query}`);
  const records = Array.isArray(raw?.events) ? raw.events : [];
  return {
    from: typeof raw?.from === "string" ? raw.from : from.toISOString(),
    to: typeof raw?.to === "string" ? raw.to : to.toISOString(),
    totals: eventCounts(raw?.totals),
    eventViews: count(raw?.event_views),
    savedEvents: count(raw?.saved_events),
    events: records.flatMap((item): EventAnalyticsRow[] => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.eventId !== "string" || typeof row.title !== "string") return [];
      return [{
        eventId: row.eventId,
        title: row.title,
        viewsCount: count(row.viewsCount),
        saves: count(row.saves),
        counts: eventCounts(row.counts),
      }];
    }),
    daily: (Array.isArray(raw?.daily) ? raw.daily : []).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.date !== "string") return [];
      return [{
        date: row.date,
        impressions: count(row.impressions),
        views: count(row.views),
        clicks: count(row.clicks),
        saves: count(row.saves),
        shares: count(row.shares),
        websiteClicks: count(row.websiteClicks),
      }];
    }),
  };
}
