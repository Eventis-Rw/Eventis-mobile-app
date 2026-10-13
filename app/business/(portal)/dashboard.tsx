import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { getEventImage } from "@/constants/eventImages";
import { useAuth } from "@/context/AuthContext";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { fetchPublisherEvents, type PublisherEvent } from "@/services/publisherService";

const enter = (delay: number) => Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrganiserDashboard() {
  const palette = useOrganiserPalette();
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<PublisherEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const organisation = user?.organisation?.name ?? user?.businessName ?? "Your organisation";
  const [showAllEvents, setShowAllEvents] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.2;
  const visibleEvents = showAllEvents ? events : events.slice(0, 4);

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setEvents(await fetchPublisherEvents(user.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void loadEvents(); }, [loadEvents]));

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserPortalHeader title="Overview" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(30)}>
          <LinearGradient
            colors={palette.dark ? ["#087EC1", "#07568D", "#10243D"] : ["#098BD3", "#0872B4", "#125286"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroOrb} />
            <View style={styles.heroLabelRow}><View style={styles.statusDot} /><Text style={styles.heroLabel}>WORKSPACE READY</Text></View>
            <Text style={styles.heroTitle}>Your next event starts here.</Text>
            <Text style={styles.heroCopy}>Create the event page first, then keep people interested with posts and stories.</Text>
            <Pressable
              onPress={() => router.push("/business/create-event" as any)}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Create an event"
            >
              <Text style={styles.heroButtonText}>Create an event</Text>
              <Ionicons name="arrow-forward" size={18} color="#087EC1" />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={enter(70)} style={[styles.summaryRow, compact && styles.stack]}>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.summaryIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="calendar-outline" size={20} color={palette.accent} /></View>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{isLoading ? "—" : events.length}</Text>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Events in workspace</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.summaryIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="business-outline" size={20} color={palette.accent} /></View>
            <Text style={[styles.orgValue, { color: palette.text }]} numberOfLines={1}>{organisation}</Text>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Active organisation</Text>
          </View>
        </Animated.View>

        <SectionHeading title="Quick create" text="Choose the format that matches your goal." palette={palette} />
        <Animated.View entering={enter(110)} style={styles.actions}>
          <QuickAction icon="calendar-outline" title="Event" text="A dated, discoverable page with venue and ticket details." onPress={() => router.push("/business/create-event" as any)} palette={palette} />
          <QuickAction icon="images-outline" title="Post" text="A feed update for news, reminders or announcements." onPress={() => router.push("/business/create-post" as any)} palette={palette} />
          <QuickAction icon="aperture-outline" title="Story" text="A short visual update shown at the top of the feed." onPress={() => router.push("/business/create-story" as any)} palette={palette} />
        </Animated.View>

        <View style={styles.eventsHeading}>
          <View style={styles.flex}><SectionHeading title="Your events" text="Manage details, visibility and promotion." palette={palette} /></View>
          <Pressable onPress={() => router.push("/business/create-event" as any)} style={({ pressed }) => [styles.smallAdd, { backgroundColor: palette.blueSoft }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Create another event">
            <Ionicons name="add" size={19} color={palette.accent} />
          </Pressable>
        </View>

        {isLoading && !visibleEvents.length ? (
          <View style={styles.state}><ActivityIndicator color={palette.accent} /><Text style={[styles.stateText, { color: palette.muted }]}>Loading events…</Text></View>
        ) : error && !visibleEvents.length ? (
          <StateCard icon="cloud-offline-outline" title="Events could not be loaded" text={error} action="Try again" onPress={() => void loadEvents()} palette={palette} />
        ) : !visibleEvents.length ? (
          <StateCard icon="calendar-outline" title="Create your first event" text="Add the date, venue and public details. It will appear here when published." action="Start event" onPress={() => router.push("/business/create-event" as any)} palette={palette} />
        ) : (
          <View style={styles.eventList}>
            {visibleEvents.map((event, index) => (
              <Animated.View key={event.id} entering={enter(140 + index * 45)} style={[styles.eventCard, compact && styles.stack, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={[styles.eventImageWrap, compact && styles.eventImageWide]}><Image source={getEventImage(event.image)} style={styles.eventImage} /></View>
                <View style={styles.eventCopy}>
                  <View style={styles.eventTopLine}>
                    <View style={[styles.publishedPill, { backgroundColor: palette.blueSoft }]}><Text style={[styles.publishedText, { color: palette.accent }]}>{event.status === "paused" ? "Paused" : "Published"}</Text></View>
                    <Pressable onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } } as any)} style={styles.moreButton} accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`}>
                      <Ionicons name="ellipsis-horizontal" size={19} color={palette.muted} />
                    </Pressable>
                  </View>
                  <Text style={[styles.eventTitle, { color: palette.text }]}>{event.title}</Text>
                  <View style={styles.eventMeta}><Ionicons name="calendar-outline" size={14} color={palette.muted} /><Text style={[styles.eventMetaText, { color: palette.muted }]}>{formatDate(event.date)}</Text></View>
                  <View style={styles.eventActions}>
                    <Pressable onPress={() => router.push({ pathname: "/business/create-event", params: { id: event.id } } as any)} style={({ pressed }) => [styles.editButton, { backgroundColor: palette.blue }, pressed && styles.pressed]} accessibilityRole="button">
                      <Ionicons name="create-outline" size={15} color="#FFFFFF" /><Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } } as any)} style={({ pressed }) => [styles.manageButton, { borderColor: palette.line }, pressed && styles.pressed]} accessibilityRole="button">
                      <Text style={[styles.manageButtonText, { color: palette.text }]}>Manage</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
            {events.length > 4 ? (
              <Pressable onPress={() => setShowAllEvents((value) => !value)} style={[styles.moreEvents, { borderColor: palette.line }]} accessibilityRole="button" accessibilityState={{ expanded: showAllEvents }}>
                <Text style={[styles.moreEventsText, { color: palette.text }]}>{showAllEvents ? "Show fewer events" : `View all ${events.length} events`}</Text>
                <Ionicons name={showAllEvents ? "chevron-up" : "chevron-down"} size={18} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type Palette = ReturnType<typeof useOrganiserPalette>;

function SectionHeading({ title, text, palette }: { title: string; text: string; palette: Palette }) {
  return <View style={styles.sectionHeading}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.sectionText, { color: palette.muted }]}>{text}</Text></View>;
}

function QuickAction({ icon, title, text, onPress, palette }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string; onPress: () => void; palette: Palette }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: palette.surface, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]} accessibilityRole="button" accessibilityLabel={`Create ${title.toLowerCase()}`}>
    <View style={[styles.actionIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name={icon} size={21} color={palette.accent} /></View>
    <View style={styles.flex}><Text style={[styles.actionTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.actionText, { color: palette.muted }]}>{text}</Text></View>
    <Ionicons name="chevron-forward" size={20} color={palette.muted} />
  </Pressable>;
}

function StateCard({ icon, title, text, action, onPress, palette }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string; action: string; onPress: () => void; palette: Palette }) {
  return <View style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
    <View style={[styles.stateIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name={icon} size={24} color={palette.accent} /></View>
    <Text style={[styles.stateTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.stateText, { color: palette.muted }]}>{text}</Text>
    <Pressable onPress={onPress} style={[styles.stateButton, { backgroundColor: palette.blue }]} accessibilityRole="button"><Text style={styles.stateButtonText}>{action}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 }, scroll: { flex: 1 }, content: { padding: 20, paddingBottom: 32, gap: 24 },
  hero: { borderRadius: 26, padding: 21, overflow: "hidden" },
  heroOrb: { position: "absolute", width: 210, height: 210, borderRadius: 105, right: -65, top: -105, borderWidth: 36, borderColor: "rgba(255,255,255,0.08)" },
  heroLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7DD3FC" },
  heroLabel: { color: "rgba(255,255,255,0.88)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.1 },
  heroTitle: { color: "#FFFFFF", fontSize: 29, lineHeight: 35, fontFamily: "Inter_700Bold", letterSpacing: -0.65, marginTop: 24, maxWidth: 340 },
  heroCopy: { color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 8, maxWidth: 320 },
  heroButton: { minHeight: 49, backgroundColor: "#FFFFFF", borderRadius: 15, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }, heroButtonText: { color: "#087EC1", fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryRow: { flexDirection: "row", gap: 10 }, summaryCard: { flex: 1, minHeight: 139, borderRadius: 19, borderWidth: 1, padding: 14 }, summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  summaryValue: { fontSize: 26, lineHeight: 30, fontFamily: "Inter_700Bold" }, orgValue: { fontSize: 17, lineHeight: 22, fontFamily: "Inter_700Bold", marginTop: 3 }, summaryLabel: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  sectionHeading: { gap: 5 }, sectionTitle: { fontSize: 19, lineHeight: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 }, sectionText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  actions: { gap: 9 }, action: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 13 }, actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, actionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" }, actionText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 3 },
  eventsHeading: { flexDirection: "row", alignItems: "center", gap: 12 }, smallAdd: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  state: { minHeight: 110, alignItems: "center", justifyContent: "center", gap: 10 }, stateCard: { alignItems: "center", borderRadius: 21, borderWidth: 1, padding: 22, gap: 8 }, stateIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 4 }, stateTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" }, stateText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "center" }, stateButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 7 }, stateButtonText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  eventList: { gap: 12 }, eventCard: { flexDirection: "row", minHeight: 174, borderRadius: 20, borderWidth: 1, overflow: "hidden", alignItems: "stretch" }, eventImageWrap: { width: 104, overflow: "hidden" }, eventImageWide: { width: "100%", height: 160 }, eventImage: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", resizeMode: "cover" }, eventCopy: { flex: 1, minHeight: 174, padding: 13 }, eventTopLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, publishedPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, publishedText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.7 }, moreButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 16, lineHeight: 21, fontFamily: "Inter_700Bold", marginTop: 8 }, eventMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }, eventMetaText: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_400Regular" }, eventActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, editButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 11, borderRadius: 11 }, editButtonText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" }, manageButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 11, borderRadius: 11, borderWidth: 1 }, manageButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stack: { flexDirection: "column" },
  moreEvents: { minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  moreEventsText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
