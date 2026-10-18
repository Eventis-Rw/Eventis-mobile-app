import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAnalytics } from "@/context/AnalyticsContext";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { summarizeLocalAnalytics } from "@/utils/localAnalytics";

const number = (value: number) => value.toLocaleString();
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const SOURCE_LABELS: Record<string, string> = { home: "Home feed", category: "Categories", search: "Search", stories: "Stories", direct: "Direct / other" };
export function OrganiserAnalytics({ ownerId, events }: { ownerId: string; events: { id: string; title: string }[] }) {
  const palette = useOrganiserPalette();
  const router = useRouter();
  const { records, loading, error, refresh } = useAnalytics();
  const [days, setDays] = useState<7 | 30>(7);
  const [showStories, setShowStories] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const narrow = width < 350 || fontScale > 1.25;
  const data = useMemo(() => summarizeLocalAnalytics(records, events, ownerId, days), [records, events, ownerId, days]);
  const max = Math.max(1, ...data.daily.map((day) => day.views));
  const surface = { backgroundColor: palette.surface, borderColor: palette.line };
  const heading = { color: palette.text };
  const muted = { color: palette.muted };
  const metric = (label: string, value: string, caption?: string) => <View key={label} style={[styles.metric, surface, narrow && styles.full]}>
    <Text style={[styles.metricLabel, muted]}>{label}</Text><Text style={[styles.value, heading]}>{value}</Text>
    {caption ? <Text style={[styles.caption, muted]}>{caption}</Text> : null}
  </View>;
  const row = (label: string, value: string) => <View key={label} style={styles.row}><Text style={[styles.body, muted]}>{label}</Text><Text style={[styles.rowValue, heading]}>{value}</Text></View>;
  return <View style={styles.section} testID="organiser-analytics">
    <View style={styles.heading}><View style={styles.flex}><Text accessibilityRole="header" style={[styles.title, heading]}>Your audience, in focus</Text><Text style={[styles.body, muted]}>Activity across your events and stories.</Text></View></View>
    <View style={styles.periods}>{([7, 30] as const).map((period) => <Pressable key={period} onPress={() => setDays(period)} accessibilityRole="button" accessibilityState={{ selected: period === days }}
      style={[styles.period, { backgroundColor: period === days ? palette.blue : palette.surfaceRaised }]}><Text style={[styles.periodText, { color: period === days ? "white" : palette.muted }]}>Last {period} days</Text></Pressable>)}</View>
    <View style={[styles.notice, { backgroundColor: palette.blueSoft }]}><Ionicons name="phone-portrait-outline" size={18} color={palette.accent} /><Text style={[styles.noticeText, { color: palette.accent }]}>Device-local activity · all your organisations. These are recorded interactions on this device, not your total audience. Cross-device reporting will need the backend.</Text></View>
    {loading ? <ActivityIndicator accessibilityLabel="Loading analytics" color={palette.accent} /> : error ? <Pressable onPress={() => void refresh()} accessibilityRole="button" style={[styles.panel, surface]}><Text style={[styles.body, { color: palette.danger }]}>{error}</Text><Text style={{ color: palette.accent }}>Retry analytics</Text></Pressable> : <>
      {!data.hasActivity ? <View style={[styles.panel, surface]}><Text style={[styles.panelTitle, heading]}>Ready for your first insights</Text><Text style={[styles.body, muted]}>Activity will appear as other accounts view and interact with your content on this device. Your own previews are excluded.</Text></View> : null}
      <View style={styles.grid}>
        {metric("Post views", number(data.views), "50% visible for 1 second")}
        {metric("People reached", number(data.reach), "Unique accounts / guest browsers")}
        {metric("Event detail opens", number(data.detailOpens), "Viewed for at least 1 second")}
        {metric("Engagement rate", percent(data.engagementRate), "Reached viewers who saved, shared or copied a link")}
      </View>
      <View style={[styles.panel, surface]}>
        <Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Views over time</Text>
        <Text style={[styles.body, muted]}>{!data.comparisonAvailable ? "Previous-period comparison needs more history." : data.change === null ? "No views in the previous period." : `${data.change >= 0 ? "+" : ""}${percent(data.change)} vs the previous ${days} days`}</Text>
        <View style={styles.chart} accessibilityRole="image" accessibilityLabel={`Daily views for the last ${days} days. ${data.daily.map((day) => `${day.label}: ${day.views}`).join(", ")}`}>
          {data.daily.map((day) => <View key={day.date} style={styles.barSlot}><View style={[styles.bar, { height: Math.max(2, day.views / max * 90), backgroundColor: day.views ? palette.blue : palette.line }]} /></View>)}
        </View>
        <View style={styles.row}><Text style={[styles.caption, muted]}>{data.daily[0].label}</Text><Text style={[styles.caption, muted]}>{data.daily[data.daily.length - 1].label}</Text></View>
        <Text style={[styles.caption, muted]}>Days use this device's local time. Views repeat at most once per viewer and event every 30 minutes.</Text>
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Engagement & intent</Text>
        {row("Save actions", number(data.saves))}{row("Unsaves", number(data.unsaves))}{row("Shares", number(data.shares))}{row("Links copied", number(data.linkCopies))}
        {row("Website clicks", number(data.websiteClicks))}{row("Directions clicks", number(data.directionsClicks))}
        <Text style={[styles.caption, muted]}>Shares are successful in-app sends or share-sheet hand-offs. Copies are separate. Clicks show interest, not confirmed attendance.</Text>
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Stories performance</Text>
        <View style={styles.grid}>{metric("Story views", number(data.storyViews))}{metric("Story viewers", number(data.storyReach))}{metric("Completion", percent(data.storyCompletion), "Viewer–story pairs that reached the end")}{metric("Event-link taps", number(data.storyEventClicks))}</View>
        {row("Early closes", number(data.storyExits))}
        <Text style={[styles.caption, muted]}>Skipping ahead does not count as completion. Own-story previews and failed media are excluded.</Text>
        {data.storyRows.length ? <><Pressable onPress={() => setShowStories((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showStories }} style={styles.expand}><Text style={{ color: palette.accent }}>{showStories ? "Hide story breakdown" : "View story breakdown"}</Text></Pressable>
          {showStories ? data.storyRows.map((story, index) => <View key={story.id} style={[styles.breakdown, { borderTopColor: palette.line }]}><Text style={[styles.rowValue, heading]}>Story {index + 1}</Text><Text style={[styles.caption, muted]}>{story.views} views · {story.reach} viewers · {percent(story.completion)} completed · {story.exits} early closes · {story.eventClicks} event taps</Text></View>) : null}</> : null}
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Discovery sources</Text><Text style={[styles.caption, muted]}>Post views / event detail opens</Text>
        {data.sources.map((source) => row(SOURCE_LABELS[source.source], `${number(source.views)} / ${number(source.details)}`))}
      </View>
      <View style={[styles.panel, surface]}><Text accessibilityRole="header" style={[styles.panelTitle, heading]}>Event performance</Text><Text style={[styles.caption, muted]}>Ranked by post views, then detail opens.</Text>
        {!data.topEvents.length ? <Text style={[styles.body, muted]}>Publish an event to see its performance here.</Text> : (showAllEvents ? data.topEvents : data.topEvents.slice(0, 3)).map((event, index) => <Pressable key={event.id} onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } })} accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} style={[styles.breakdown, { borderTopColor: palette.line }]}>
          <Text style={[styles.rowValue, heading]}>{index + 1}. {event.title}</Text><Text style={[styles.caption, muted]}>{event.views} views · {event.reach} reached · {event.details} detail opens · {event.saves} saves · {event.shares} shares</Text>
        </Pressable>)}
        {data.topEvents.length > 3 ? <Pressable onPress={() => setShowAllEvents((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showAllEvents }} style={styles.expand}><Text style={{ color: palette.accent }}>{showAllEvents ? "Show fewer events" : "View all event results"}</Text></Pressable> : null}
      </View>
      <View style={[styles.panel, surface]}><View style={styles.heading}><Ionicons name="lock-closed-outline" size={18} color={palette.muted} /><Text style={[styles.panelTitle, heading]}>Bookings & revenue</Text></View>
        {row("Reservations", "Unavailable")}{row("Ticket sales", "Unavailable")}{row("Revenue", "Unavailable")}{row("Attendance / fill rate", "Unavailable")}
        <Text style={[styles.body, muted]}>Booking is currently disabled. These metrics will appear when booking and confirmed payment reporting are connected.</Text>
      </View>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 14 }, flex: { flex: 1, minWidth: 0 }, heading: { flexDirection: "row", alignItems: "center", gap: 10 },
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
