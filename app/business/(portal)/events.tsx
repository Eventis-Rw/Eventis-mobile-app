import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { getEventImage } from "@/constants/eventImages";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function OrganiserEventsScreen() {
  const palette = useOrganiserPalette();
  const router = useRouter();
  const { events, isLoading, hasLoaded, error, refresh } = useOrganiserEvents();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.2;
  const create = () => router.push("/business/create-event");

  return <View style={[styles.root, { backgroundColor: palette.canvas }]} testID="organiser-events-screen">
    <OrganiserAtmosphere />
    <OrganiserPortalHeader title="My events" />
    <FlatList data={events} keyExtractor={(event) => event.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading && hasLoaded} onRefresh={() => void refresh()} tintColor={palette.accent} />}
      ListHeaderComponent={<View style={styles.heading}>
        <View style={styles.flex}><Text style={[styles.title, { color: palette.text }]}>{!hasLoaded ? "Your event workspace" : `${events.length} ${events.length === 1 ? "event" : "events"}`}</Text><Text style={[styles.description, { color: palette.muted }]}>Manage your published, paused and past events.</Text></View>
        <Pressable onPress={create} accessibilityRole="button" accessibilityLabel="Create another event" style={[styles.create, { backgroundColor: palette.blue }]}>
          <Ionicons name="add" size={20} color="white" /><Text style={styles.createText}>New</Text>
        </Pressable>
      </View>}
      ListEmptyComponent={isLoading && !hasLoaded ? <View style={styles.state}><ActivityIndicator color={palette.accent} /><Text style={[styles.description, { color: palette.muted }]}>Loading events…</Text></View>
        : <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <Ionicons name={error ? "cloud-offline-outline" : "calendar-outline"} size={28} color={palette.accent} />
          <Text style={[styles.title, { color: palette.text }]}>{error ? "Couldn't load your events" : "Create your first event"}</Text>
          <Text style={[styles.description, { color: palette.muted, textAlign: "center" }]}>{error ?? "Add the date, venue and public details. Your event will appear here when published."}</Text>
          <Pressable onPress={error ? () => void refresh() : create} accessibilityRole="button" style={[styles.create, { backgroundColor: palette.blue }]}><Text style={styles.createText}>{error ? "Try again" : "Start event"}</Text></Pressable>
        </View>}
      ListFooterComponent={error && events.length ? <Pressable onPress={() => void refresh()} accessibilityRole="button" style={styles.state}><Text style={[styles.description, { color: palette.danger }]}>{error} Tap to retry.</Text></Pressable> : null}
      renderItem={({ item: event }) => <View style={[styles.card, compact && styles.stack, { backgroundColor: palette.surface, borderColor: palette.line }]}>
        <View style={[styles.imageWrap, compact && styles.imageWide]}><Image source={getEventImage(event.image)} style={styles.image} accessibilityLabel={`${event.title} poster`} /></View>
        <View style={styles.copy}>
          <View style={styles.topLine}><View style={[styles.status, { backgroundColor: palette.blueSoft }]}><Text style={[styles.statusText, { color: palette.accent }]}>{event.status === "paused" ? "Paused" : "Published"}</Text></View>
            <Pressable onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } })} accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={palette.muted} /></Pressable>
          </View>
          <Text style={[styles.eventTitle, { color: palette.text }]}>{event.title}</Text>
          <View style={styles.meta}><Ionicons name="calendar-outline" size={14} color={palette.muted} /><Text style={[styles.metaText, { color: palette.muted }]}>{formatDate(event.date)}</Text></View>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push({ pathname: "/business/create-event", params: { id: event.id } })} accessibilityRole="button" accessibilityLabel={`Edit ${event.title}`} style={[styles.action, { backgroundColor: palette.blue }]}><Ionicons name="create-outline" size={15} color="white" /><Text style={styles.createText}>Edit</Text></Pressable>
            <Pressable onPress={() => router.push({ pathname: "/business/event/[id]", params: { id: event.id } })} accessibilityRole="button" style={[styles.action, { borderColor: palette.line, borderWidth: 1 }]}><Text style={[styles.actionText, { color: palette.text }]}>Manage</Text></Pressable>
          </View>
        </View>
      </View>} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1, minWidth: 0 }, content: { padding: 20, paddingBottom: 32, gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }, title: { fontSize: 19, lineHeight: 25, fontFamily: "Inter_700Bold" }, description: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  create: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 14, borderRadius: 13 }, createText: { color: "white", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  state: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 10 }, empty: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  card: { flexDirection: "row", minHeight: 174, borderRadius: 20, borderWidth: 1, overflow: "hidden", alignItems: "stretch" }, stack: { flexDirection: "column" },
  imageWrap: { width: 104, overflow: "hidden" }, imageWide: { width: "100%", height: 160 }, image: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", resizeMode: "cover" },
  copy: { flex: 1, minHeight: 174, padding: 13 }, topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }, status: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, statusText: { fontSize: 11, fontFamily: "Inter_700Bold" }, more: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 16, lineHeight: 22, fontFamily: "Inter_700Bold", marginTop: 8 }, meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }, metaText: { flexShrink: 1, fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, action: { minHeight: 44, borderRadius: 11, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
