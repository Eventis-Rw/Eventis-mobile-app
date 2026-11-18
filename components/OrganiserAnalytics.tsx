import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEventAnalytics } from "@/hooks/useEventAnalytics";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

const number = (value: number) => value.toLocaleString();
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const SOURCE_LABELS: Record<string, string> = { home: "Home feed", category: "Categories", search: "Search", details: "Event details", stories: "Stories", direct: "Direct / other" };

export function OrganiserAnalytics({ events, refreshSignal = 0 }: { events: { id: string; title: string; viewCount?: number }[]; refreshSignal?: number }) {
  const palette = useOrganiserPalette();
  const router = useRouter();
  const [days, setDays] = useState<7 | 30>(7);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const narrow = width < 350 || fontScale > 1.25;
  const live = useEventAnalytics(days);
  const seenRefreshSignal = useRef(refreshSignal);
  useEffect(() => {
    if (seenRefreshSignal.current === refreshSignal) return;
    seenRefreshSignal.current = refreshSignal;
    void live.refresh();
  }, [live.refresh, refreshSignal]);
  const overview = live.overview;
  const sources = overview?.sources ?? [];
  const eventStats = useMemo(() => new Map((overview?.events ?? []).map((event) => [event.eventId, event] as const)), [overview]);
  const topEvents = useMemo(() => events.map((event) => {
    const stats = eventStats.get(event.id);
    return {
      ...event,
      views: stats?.viewsCount ?? event.viewCount ?? 0,
      saves: stats?.saves ?? 0,
      impressions: stats?.counts.IMPRESSION ?? 0,
      periodViews: stats?.counts.VIEW ?? 0,
    };
  }).sort((a, b) => b.views - a.views || a.title.localeCompare(b.title)), [events, eventStats]);
  const daily = useMemo(() => {
    const counts = new Map((overview?.daily ?? []).map((row) => [row.date, row.views] as const));
    const today = new Date();
    const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(end - (days - index - 1) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      return { date: key, label: date.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }), views: counts.get(key) ?? 0 };
    });
  }, [overview, days]);
  const max = Math.max(1, ...daily.map((day) => day.views));
  const impressions = overview?.totals.IMPRESSION ?? 0;
  const engagementActions = overview ? overview.totals.CLICK + overview.totals.SAVE + overview.totals.SHARE + overview.totals.WEBSITE_CLICK : 0;
  const engagementRate = impressions ? engagementActions / impressions : null;
  const surface = { backgroundColor: palette.surface, borderColor: palette.line };
  const heading = { color: palette.text };
  const muted = { color: palette.muted };
  const metric = (label: string, value: string, caption?: string) => <View key={label} style={[styles.metric, surface, narrow && styles.full]}>
    <Text style={[styles.metricLabel, muted]}>{label}</Text><Text style={[styles.value, heading]}>{value}</Text>
    {caption ? <Text style={[styles.caption, muted]}>{caption}</Text> : null}
  </View>;
  const row = (label: string, value: string) => <View key={label} style={styles.row}><Text style={[styles.body, muted]}>{label}</Text><Text style={[styles.rowValue, heading]}>{value}</Text></View>;

  return <View style={styles.section} testID="organiser-analytics">
    <View style={styles.heading}><View style={styles.flex}><Text accessibilityRole="header" style={[styles.title, heading]}>Your audience, in focus</Text><Text style={[styles.body, muted]}>Server reported activity across your events.</Text></View><Pressable onPress={() => void live.refresh()} accessibilityRole="button" accessibilityLabel="Refresh analytics" style={styles.refresh}><Ionicons name="refresh-outline" size={20} color={palette.accent} /></Pressable></View>
    <View style={styles.periods}>{([7, 30] as const).map((period) => <Pressable key={period} onPress={() => setDays(period)} accessibilityRole="button" accessibilityState={{ selected: period === days }}
      style={[styles.period, { backgroundColor: period === days ? palette.blue : palette.surfaceRaised }]}><Text style={[styles.periodText, { color: period === days ? "white" : palette.muted }]}>Last {period} days</Text></Pressable>)}</View>
    <View style={[styles.notice, { backgroundColor: palette.blueSoft }]}><Ionicons name="cloud-done-outline" size={18} color={palette.accent} /><Text style={[styles.noticeText, { color: palette.accent }]}>Event views and saves are account-wide. New impressions, shares and clicks are recorded by Eventis across devices.</Text></View>
    {live.error ? <Pressable onPress={() => void live.refresh()} accessibilityRole="button" style={[styles.panel, surface]}><Text style={[styles.body, { color: palette.danger }]}>{live.error}</Text><Text style={{ color: palette.accent }}>Retry Eventis analytics</Text></Pressable> : null}
    {live.isLoading && !overview ? <ActivityIndicator accessibilityLabel="Loading analytics" color={palette.accent} /> : !overview ? <View style={[styles.panel, surface]}><Text style={[styles.panelTitle, heading]}>Analytics unavailable</Text><Text style={[styles.body, muted]}>Eventis could not load account-wide analytics. Try again when you are online.</Text></View> : <>
      {!overview.events.length ? <View style={[styles.panel, surface]}><Text style={[styles.panelTitle, heading]}>No events to report yet</Text><Text style={[styles.body, muted]}>Publish an event and its views and saves will appear here.</Text></View> : null}
      <View style={styles.grid}>
        {metric("Event detail views", number(overview.eventViews), "All time · server event view counter")}
        {metric("People who saved events", number(overview.savedEvents), "Current account-wide saves")}
        {metric("Feed impressions", number(impressions), `Last ${days} days · server reported`)}
        {metric("Engagement actions / impression", percent(engagementRate), "Clicks, saves, shares and website actions")}
      </View>
      <View style={[styles.panel, surface]}>
        <Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Event views over time</Text>
        <Text style={[styles.body, muted]}>Account-wide event detail views recorded during the selected period.</Text>
        <View style={styles.chart} accessibilityRole="image" accessibilityLabel={`Daily server reported views for the last ${days} days. ${daily.map((day) => `${day.label}: ${day.views}`).join(", ")}`}>
          {daily.map((day) => <View key={day.date} style={styles.barSlot}><View style={[styles.bar, { height: Math.max(2, day.views / max * 90), backgroundColor: day.views ? palette.blue : palette.line }]} /></View>)}
        </View>
        <View style={styles.row}><Text style={[styles.caption, muted]}>{daily[0]?.label}</Text><Text style={[styles.caption, muted]}>{daily[daily.length - 1]?.label}</Text></View>
        <Text style={[styles.caption, muted]}>No activity is shown as zero. The previous-period comparison is unavailable from the current analytics API.</Text>
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Engagement & intent · last {days} days</Text>
        {row("Feed impressions", number(overview.totals.IMPRESSION))}{row("Saves", number(overview.totals.SAVE))}{row("Shares", number(overview.totals.SHARE))}{row("Event link and direction clicks", number(overview.totals.CLICK))}{row("Website clicks", number(overview.totals.WEBSITE_CLICK))}
        <Text style={[styles.caption, muted]}>These are server-recorded actions, not confirmed attendance.</Text>
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Discovery sources · last {days} days</Text><Text style={[styles.caption, muted]}>Impressions / event views recorded by Eventis.</Text>
        {!sources.length ? <Text style={[styles.body, muted]}>No source activity has been recorded in this period.</Text> : sources.map((source) => row(SOURCE_LABELS[source.source ?? ""] ?? source.source ?? "Unspecified", `${number(source.impressions)} / ${number(source.views)}`))}
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Event performance</Text><Text style={[styles.caption, muted]}>Views and current saves are account-wide. Impressions are for the selected period.</Text>
        {!topEvents.length ? <Text style={[styles.body, muted]}>Publish an event to see performance here.</Text> : (showAllEvents ? topEvents : topEvents.slice(0, 3)).map((event, index) => <Pressable key={event.id} onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } })} accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} style={[styles.breakdown, { borderTopColor: palette.line }]}>
          <Text style={[styles.rowValue, heading]}>{index + 1}. {event.title}</Text><Text style={[styles.caption, muted]}>{number(event.views)} all-time views · {number(event.saves)} current saves · {number(event.impressions)} impressions · {number(event.periodViews)} views in period</Text>
        </Pressable>)}
        {topEvents.length > 3 ? <Pressable onPress={() => setShowAllEvents((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showAllEvents }} style={styles.expand}><Text style={{ color: palette.accent }}>{showAllEvents ? "Show fewer events" : "View all event results"}</Text></Pressable> : null}
      </View>
      <View style={[styles.panel, surface]}><View style={styles.heading}><Ionicons name="time-outline" size={18} color={palette.muted} /><Text style={[styles.panelTitle, heading]}>Stories, bookings & revenue</Text></View>
        <Text style={[styles.body, muted]}>Story analytics are not yet collected account-wide. Booking and confirmed payment reporting are not connected, so attendance and revenue cannot be reported as real statistics.</Text>
      </View>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 14 }, flex: { flex: 1, minWidth: 0 }, heading: { flexDirection: "row", alignItems: "center", gap: 10 }, refresh: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, lineHeight: 27, fontFamily: "Inter_700Bold", marginBottom: 4 },
  body: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", flexShrink: 1 },
  periods: { flexDirection: "row", gap: 8 }, period: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 22 }, periodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 14, borderRadius: 16 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { flexGrow: 1, width: "46%", padding: 14, borderWidth: 1, borderRadius: 18, minWidth: 0 }, full: { width: "100%" },
  metricLabel: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_500Medium" }, value: { fontSize: 27, lineHeight: 36, fontFamily: "Inter_700Bold", marginVertical: 4 },
  caption: { fontSize: 11, lineHeight: 17, flexShrink: 1 }, panel: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 }, panelTitle: { fontSize: 16, lineHeight: 23, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, rowValue: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  chart: { flexDirection: "row", gap: 3, height: 100, alignItems: "flex-end" }, barSlot: { flex: 1, height: 100, justifyContent: "flex-end" }, bar: { borderRadius: 3, minWidth: 2 },
  expand: { minHeight: 44, justifyContent: "center" }, breakdown: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 4, gap: 5 },
});
