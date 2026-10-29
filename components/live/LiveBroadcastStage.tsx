import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Track, type Participant } from "livekit-client";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LivePerson } from "@/services/liveState";
import { BroadcastVideo } from "./BroadcastVideo";
import { LiveAvatar, liveColors as c } from "./LivePrimitives";
import { LiveSpeakingAvatar, LiveSpeakingBars } from "./LiveSpeakingIndicator";

type StageMember = {
  participant?: Participant;
  person: LivePerson;
  isHost: boolean;
  hasVideo: boolean;
  microphone: boolean;
  speaking: boolean;
};

function StageTile({ member, revision, compact, showTag, mode }: {
  member: StageMember; revision: number; compact: boolean; showTag: boolean; mode: "video" | "voice";
}) {
  const { participant, person, isHost, hasVideo, microphone, speaking } = member;
  const status = !participant ? "Connecting" : !microphone ? "Muted" : speaking ? "Speaking" : "Listening";
  return <View testID={`live-stage-${isHost ? "host" : "guest"}`}
    accessibilityLabel={`${person.name}, ${isHost ? "host" : "guest"}, ${status.toLowerCase()}`}
    style={[styles.tile, showTag && styles.sharedTile, showTag && speaking && styles.speakingTile]}>
    {hasVideo && participant ? <BroadcastVideo participant={participant} revision={revision} /> : <LinearGradient colors={["#17263C", "#080D19", "#111827"]} style={styles.fallback}>
      <LiveSpeakingAvatar speaking={speaking}><LiveAvatar person={person} size={compact ? 52 : 88} /></LiveSpeakingAvatar>
      <View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{person.name}{participant?.isLocal ? " · You" : ""}</Text>{isHost ? <Text style={styles.host}>HOST</Text> : null}</View>
      <View style={styles.status}>
        {speaking ? <LiveSpeakingBars speaking /> : <Ionicons name={microphone ? "mic-outline" : "mic-off-outline"} size={13} color={participant && !microphone ? c.redSoft : "#BCC6D7"} />}
        <Text style={[styles.hint, speaking && styles.activeText, participant && !microphone && styles.mutedText]}>
          {!participant ? "Waiting for connection…" : status}
        </Text>
      </View>
      {mode === "video" ? <Text style={styles.cameraHint}>Camera is off</Text> : null}
    </LinearGradient>}
    {showTag && hasVideo ? <View style={[styles.tag, isHost ? { bottom: 12 } : { top: 12 }, speaking && styles.speakingTag]}>
      {speaking ? <LiveSpeakingBars speaking /> : <Ionicons name={microphone ? "mic" : "mic-off"} size={12} color={microphone ? "#FFF" : c.redSoft} />}
      <Text numberOfLines={1} style={styles.tagText}>{person.name}{participant?.isLocal ? " · You" : ""}</Text>
      {isHost ? <Text style={styles.host}>HOST</Text> : null}
    </View> : null}
  </View>;
}

/** Snapshot mutable SDK values on media/speaker events so every tile receives fresh primitives. */
export function LiveBroadcastStage({ participants, revision, hostId, host, guests, mode, connected }: {
  participants: Participant[]; revision: number; hostId: string; host: LivePerson; guests: LivePerson[]; mode: "video" | "voice"; connected: boolean;
}) {
  const members = useMemo(() => {
    const ids = [hostId, ...participants.filter(p => p.identity !== hostId).map(p => p.identity)];
    return ids.map(id => {
      const participant = participants.find(p => p.identity === id);
      const camera = participant?.getTrackPublication(Track.Source.Camera);
      const microphone = !!participant?.isMicrophoneEnabled;
      return {
        participant,
        person: id === hostId ? host : guests.find(p => p.id === id) ?? { id, name: participant?.name || "Guest" },
        isHost: id === hostId,
        hasVideo: !!camera?.track && !camera.isMuted,
        microphone,
        speaking: connected && microphone && !!participant?.isSpeaking,
      };
    });
  }, [participants, revision, hostId, host, guests, connected]);
  const [leader, ...guestMembers] = members;
  const shared = guestMembers.length > 0;
  return <View testID="live-broadcast-stage" style={styles.canvas}>
    <View style={{ flex: guestMembers.length > 1 ? 1.15 : 1 }}><StageTile member={leader} revision={revision} compact={guestMembers.length > 1} showTag={shared} mode={mode} /></View>
    {shared ? <View style={styles.guests}>{guestMembers.map(member => <View key={member.person.id} style={{ width: guestMembers.length === 1 ? "100%" : "50%", height: guestMembers.length > 2 ? "50%" : "100%" }}>
      <StageTile member={member} revision={revision} compact={guestMembers.length > 1} showTag mode={mode} />
    </View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#000" },
  tile: { flex: 1, overflow: "hidden", backgroundColor: "#080D19" },
  sharedTile: { borderWidth: 1, borderColor: "transparent" },
  speakingTile: { borderColor: c.blue },
  guests: { flex: 1, flexDirection: "row", flexWrap: "wrap", backgroundColor: "#000" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  name: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 16, flexShrink: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  hint: { color: "#BCC6D7", fontFamily: "Inter_500Medium", fontSize: 12 },
  activeText: { color: c.blue },
  mutedText: { color: c.redSoft },
  cameraHint: { color: "#8492AA", fontFamily: "Inter_400Regular", fontSize: 11 },
  tag: { position: "absolute", left: 10, maxWidth: "85%", flexDirection: "row", alignItems: "center", gap: 5, padding: 6, borderRadius: 10, borderWidth: 1, borderColor: "transparent", backgroundColor: "#080D19BB" },
  speakingTag: { borderColor: "#38BDF866", backgroundColor: "#0A2A3EEB" },
  tagText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1, textShadowColor: "#000", textShadowRadius: 5 },
  host: { color: "#FFF", fontSize: 8, fontWeight: "700", backgroundColor: "#EF4444CC", paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4 },
});
