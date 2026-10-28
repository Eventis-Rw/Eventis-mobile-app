import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Track, type Participant } from "livekit-client";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LivePerson } from "@/services/liveState";
import { BroadcastVideo } from "./BroadcastVideo";
import { LiveAvatar, liveColors as c } from "./LivePrimitives";

/** A single host owns the canvas; approved guests share it without fixed pixel heights. */
export function LiveBroadcastStage({ participants, revision, hostId, host, mode }: {
  participants: Participant[]; revision: number; hostId: string; host: LivePerson; mode: "video" | "voice";
}) {
  const leader = participants.find(p => p.identity === hostId);
  const guests = participants.filter(p => p.identity !== hostId);
  const tile = (participant: Participant | undefined, person: LivePerson, isHost: boolean) => {
    const camera = participant?.getTrackPublication(Track.Source.Camera);
    const hasVideo = !!camera?.track && !camera.isMuted;
    return <View key={person.id} testID={`live-stage-${isHost ? "host" : "guest"}`} style={[styles.tile, { borderColor: participant?.isSpeaking && guests.length > 0 ? c.blue : "transparent", borderWidth: guests.length > 0 ? 1 : 0 }]}>
      {hasVideo && participant ? <BroadcastVideo participant={participant} revision={revision} /> : <LinearGradient colors={["#17263C", "#080D19", "#111827"]} style={styles.fallback}>
        <View style={[styles.avatarRing, participant?.isSpeaking ? { borderColor: c.blue, backgroundColor: "#38BDF81A" } : null]}><LiveAvatar person={person} size={guests.length > 1 ? 52 : 88} /></View>
        <Text numberOfLines={1} style={styles.name}>{person.name}</Text>
        <Text style={styles.hint}>{!participant ? "Waiting for connection…" : mode === "voice" ? participant.isSpeaking ? "Speaking" : "Voice Live" : "Camera is off"}</Text>
      </LinearGradient>}
      {guests.length > 0 ? <View style={[styles.tag, isHost ? { bottom: 12 } : { top: 12 }]}><Ionicons name={participant?.isMicrophoneEnabled ? "mic" : "mic-off"} size={11} color="#FFF" /><Text numberOfLines={1} style={styles.tagText}>{person.name}{participant?.isLocal ? " · You" : ""}</Text>{isHost ? <Text style={styles.host}>HOST</Text> : null}</View> : null}
    </View>;
  };
  return <View testID="live-broadcast-stage" style={styles.canvas}>
    <View style={{ flex: guests.length > 1 ? 1.15 : 1 }}>{tile(leader, host, true)}</View>
    {guests.length > 0 ? <View style={styles.guests}>{guests.map(p => <View key={p.identity} style={{ width: guests.length === 1 ? "100%" : "50%", height: guests.length > 2 ? "50%" : "100%" }}>{tile(p, { id: p.identity, name: p.name || "Guest" }, false)}</View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#000" },
  tile: { flex: 1, overflow: "hidden", backgroundColor: "#080D19" },
  guests: { flex: 1, flexDirection: "row", flexWrap: "wrap", backgroundColor: "#000", gap: 0 },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16 },
  avatarRing: { padding: 9, borderRadius: 100, borderWidth: 1, borderColor: "#FFFFFF20" },
  name: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  hint: { color: "#BCC6D7", fontFamily: "Inter_400Regular", fontSize: 12 },
  tag: { position: "absolute", left: 10, maxWidth: "85%", flexDirection: "row", alignItems: "center", gap: 5, padding: 6, borderRadius: 8, backgroundColor: "#0006" },
  tagText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1, textShadowColor: "#000", textShadowRadius: 5 },
  host: { color: "#FFF", fontSize: 8, fontWeight: "700", backgroundColor: "#EF4444CC", paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4 },
});
