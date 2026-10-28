import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "@/components/GlassSurface";
import { getEventImage } from "@/constants/eventImages";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import type { LiveRoom } from "@/services/liveState";
import { LiveAvatar } from "./LivePrimitives";

/** The original Event Streams layout, backed by the shared Live flows. */
export function LiveDiscovery({ rooms, busy, onHost, onJoin, onRoom, onWallet, onDemo, children }: {
  rooms: LiveRoom[]; busy: boolean; onHost: () => void; onJoin: () => void;
  onRoom: (room: LiveRoom) => void; onWallet?: () => void; onDemo?: () => void; children?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <GlassSurface style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.row}><View style={styles.redBadge}><View style={styles.dot} /><Text style={styles.badgeText}>LIVE</Text></View><Text style={[styles.title, { color: colors.foreground }]}>Event Streams</Text></View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Backstage moments, artist Q&As & community chats</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Go Live" onPress={onHost} style={({ pressed }) => [styles.goLive, { opacity: pressed ? .8 : 1 }]}><Ionicons name="radio" size={15} color="#FFF" /><Text style={styles.goLiveText}>Go Live</Text></Pressable>
      </View>
    </GlassSurface>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <GlassSurface style={[styles.joinCard, { borderColor: "rgba(56,189,248,0.3)" }]}>
        <View style={styles.row}><Ionicons name="videocam-outline" size={24} color={colors.primary} /><View style={{ flex: 1, gap: 4 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Join a Live</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter a host’s room code to watch and chat in real time.</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Join with a code" onPress={onJoin} style={({ pressed }) => [styles.joinButton, { backgroundColor: colors.primary, opacity: pressed ? .8 : 1 }]}><Ionicons name="chatbubbles" size={17} color="#FFF" /><Text style={styles.joinText}>Join with a code</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></Pressable>
      </GlassSurface>
      {children}
      <View style={styles.row}><View style={styles.accent} /><Text style={[styles.sectionTitle, { color: colors.foreground, flex: 1 }]}>Explore room previews</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{rooms.length} demos</Text></View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sample rooms for trying chat and gifts. These are not live broadcasts.</Text>
      {rooms.map(room => <GlassSurface key={room.id} style={styles.streamCard}>
        <View style={styles.media}>
          <Image source={getEventImage(room.mode === "voice" ? "tech" : "concert")} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {room.cover ? <Image source={getEventImage(room.cover)} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0F172A" }]} />}
          <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.row, { justifyContent: "space-between" }]}><View style={styles.redBadge}><Text style={styles.badgeText}>DEMO</Text></View><View style={styles.modeBadge}><Ionicons name={room.mode === "voice" ? "mic-outline" : "videocam-outline"} size={14} color="#FFF" /><Text style={styles.badgeText}>{room.mode === "voice" ? "Voice room" : "Video room"}</Text></View></View>
          <Text style={styles.previewLabel}>Interactive room preview</Text>
        </View>
        <View style={styles.details}>
          <View style={styles.row}><LiveAvatar person={room.host} size={40} /><View style={{ flex: 1, gap: 3 }}><Text style={[styles.host, { color: colors.foreground }]}>{room.host.name}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{room.guests.length} guests · Demo room</Text></View></View>
          <Text style={[styles.streamTitle, { color: colors.foreground }]}>{room.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open demo room: ${room.title}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onRoom(room)} style={({ pressed }) => [styles.joinButton, { backgroundColor: colors.primary, opacity: busy ? .4 : pressed ? .8 : 1 }]}><Ionicons name="chatbubbles" size={17} color="#FFF" /><Text style={styles.joinText}>Open demo room</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></Pressable>
        </View>
      </GlassSurface>)}
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        {onWallet ? <Pressable accessibilityRole="button" accessibilityLabel="Open Live wallet" onPress={onWallet} style={styles.footerButton}><Ionicons name="wallet-outline" size={19} color={colors.primary} /><Text style={[styles.subtitle, { color: colors.foreground }]}>Demo wallet</Text></Pressable> : null}
        {onDemo ? <Pressable accessibilityRole="button" onPress={onDemo} style={styles.footerButton}><Ionicons name="flask-outline" size={18} color={colors.mutedForeground} /><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Demo controls</Text></Pressable> : null}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 16, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 }, titleWrap: { flex: 1, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  redBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" }, badgeText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", color: "#FFF" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -.4, flexShrink: 1 }, subtitle: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  goLive: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, minHeight: 44, borderRadius: 99, backgroundColor: "#EF4444" }, goLiveText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  content: { padding: 20, gap: 16, paddingBottom: 36 }, joinCard: { borderRadius: 22, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" }, accent: { width: 3, height: 16, borderRadius: 2, backgroundColor: "#EF4444" },
  streamCard: { borderRadius: 22 }, media: { width: "100%", aspectRatio: 16 / 9, padding: 12, justifyContent: "space-between", overflow: "hidden" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,.6)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  previewLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#FFF" }, details: { padding: 16, gap: 12 }, host: { fontSize: 14, fontFamily: "Inter_700Bold" },
  streamTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 }, joinButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, minHeight: 44 }, joinText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  footerButton: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44 },
});
