import { Ionicons } from "@expo/vector-icons";
import type { Participant } from "livekit-client";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { LiveVoice } from "@/hooks/useLiveBroadcast";
import type { LivePerson } from "@/services/liveState";
import { liveStageMembers, type LiveStageMember, type LiveStageActions } from "@/services/liveStage";
import { BroadcastVideo } from "./BroadcastVideo";
import { LiveAvatar, liveColors as c } from "./LivePrimitives";
import { LiveSpeakingAvatar, LiveSpeakingBars } from "./LiveSpeakingIndicator";

function StageTile({ member, revision, compact, shared, demo, actions }: {
  member: LiveStageMember; revision: number; compact: boolean; shared: boolean;
  demo: boolean; actions: LiveStageActions;
}) {
  const [height, setHeight] = useState(200);
  const { participant, person, isHost, hasVideo, microphone, speaking, cameraPending } = member;
  const status = demo ? (isHost ? "Host" : "Guest") : !participant ? "Joining…" : !microphone ? "Muted" : speaking ? "Speaking" : "Listening";
  const video = hasVideo && participant;
  const own = person.id === actions.ownId;
  const canManage = shared && (actions.isHost || own);
  const avatarSize = compact ? Math.max(30, Math.min(56, height * .29)) : Math.max(48, Math.min(88, height * .29));
  return <View testID={`live-stage-${isHost ? "host" : "guest"}`} onLayout={event => setHeight(event.nativeEvent.layout.height)}
    accessibilityLabel={`${person.name}, ${isHost ? "host" : "guest"}, ${status.toLowerCase()}`}
    style={[styles.tile, shared && styles.sharedTile, speaking && shared && styles.speakingTile]}>
    {video ? <BroadcastVideo participant={participant} revision={revision} /> : <View style={styles.fallback}>
      <LiveSpeakingAvatar size={compact ? "small" : "large"} speaking={speaking}><LiveAvatar person={person} size={avatarSize} /></LiveSpeakingAvatar>
      {cameraPending ? <ActivityIndicator size="small" color={c.blue} accessibilityLabel="Loading camera" /> : !compact ? <Text style={styles.hint}>{!participant && !demo ? "Joining the stage…" : "Camera off"}</Text> : null}
    </View>}
    {isHost && shared ? <View pointerEvents="none" style={styles.hostBadge}><Text style={styles.hostText}>LIVE creator</Text></View> : null}
    {shared ? <View pointerEvents="none" style={styles.namePlate}>
      <View style={styles.namePill}><Text numberOfLines={1} style={styles.name}>{person.name}{own ? " · You" : ""}</Text></View>
      {speaking ? <LiveSpeakingBars speaking /> : <Ionicons name={microphone ? "mic" : "mic-off"} size={12} color={microphone ? "#FFF" : "#D8DBE4"} />}
    </View> : null}
    {canManage ? <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
      accessibilityLabel={own ? "Your stage controls" : `Manage ${person.name}`} onPress={() => actions.onMember(person)} /> : null}
  </View>;
}

function AudioSeat({ member, actions, demo }: { member?: LiveStageMember; actions: LiveStageActions; demo: boolean }) {
  const own = member?.person.id === actions.ownId;
  const interactive = member ? actions.isHost || own : !actions.emptyDisabled;
  const speaking = !!member?.speaking;
  return <Pressable testID={member ? `live-stage-${member.isHost ? "host" : "guest"}` : "live-audio-open-seat"}
    accessibilityRole={interactive ? "button" : undefined}
    accessibilityLabel={member ? `${member.person.name}, ${member.isHost ? "host" : "guest"}${own ? ", your controls" : ""}, ${speaking ? "speaking" : member.microphone ? "listening" : "muted"}` : actions.emptyLabel}
    accessibilityState={{ disabled: !interactive }} disabled={!interactive}
    onPress={() => member ? actions.onMember(member.person) : actions.onEmpty()} style={styles.audioSeat}>
    {member ? <>
      <View style={styles.audioAvatar}>
        <LiveSpeakingAvatar size="small" minimal speaking={speaking}><LiveAvatar person={member.person} size={60} /></LiveSpeakingAvatar>
        {!demo && !member.microphone ? <View style={styles.audioMuted}><Ionicons name="mic-off" size={11} color="#FFF" /></View> : null}
      </View>
      <Text numberOfLines={1} style={styles.audioName}>{member.person.name}{own ? " · You" : ""}</Text>
      <View style={styles.audioStatus}>
        {speaking ? <LiveSpeakingBars speaking /> : null}
        <Text style={[styles.audioRole, member.isHost && styles.activeText]}>{member.isHost ? "Host" : speaking ? "Speaking" : !member.participant && !demo ? "Joining…" : "Guest"}</Text>
      </View>
    </> : <>
      <View style={styles.audioAdd}><Ionicons name="add" size={30} color={actions.emptyDisabled ? "#687181" : "#CBD2DF"} /></View>
      <Text numberOfLines={2} style={styles.audioEmptyLabel}>{actions.emptyDisabled ? "Open seat" : actions.emptyLabel}</Text>
    </>}
  </Pressable>;
}

export function LiveBroadcastStage({ participants, revision, voice, hostId, host, guests, mode, connected, actions, demo = false, placeholderHost = false }: {
  participants: Participant[]; revision: number; voice: LiveVoice; hostId: string; host: LivePerson; guests: LivePerson[];
  mode: "video" | "voice"; connected: boolean; actions: LiveStageActions; demo?: boolean; placeholderHost?: boolean;
}) {
  "use no memo";
  const members = useMemo(() => liveStageMembers(participants, { ...host, id: hostId }, guests, voice, connected), [participants, revision, voice, hostId, host, guests, connected]);
  const [leader, ...others] = members;
  const audio = mode === "voice";
  const shared = audio || others.length > 0;
  const tile = (member: LiveStageMember, compact: boolean) => <StageTile member={member} revision={revision} compact={compact} shared={shared} demo={demo || (placeholderHost && member.isHost)} actions={actions} />;
  if (!shared) return <View testID="live-broadcast-stage" style={styles.canvas}>{tile(leader, false)}</View>;
  const seats = Array.from({ length: 4 }, (_, index) => others[index]);
  if (audio) return <View testID="live-broadcast-stage" style={[styles.canvas, styles.audioCanvas]}>
    <View style={styles.audioGrid}>{[leader, ...seats].map((member, index) => <AudioSeat
      key={member?.person.id ?? `empty-${index}`} member={member} actions={actions} demo={demo} />)}</View>
  </View>;
  // Fill the panel with connected/approved guests; camera-off guests keep
  // their slot, while leaving the stage redistributes the available space.
  const grid = others.length === 4;
  return <View testID="live-broadcast-stage" style={[styles.canvas, styles.split]}>
    <View style={styles.mainHost}>{tile(leader, false)}</View>
    <View style={styles.guestGrid}>{others.map(member => <View key={member.person.id}
      style={[styles.guestSeat, others.length === 1 && styles.singleGuest, { width: grid ? "50%" : "100%", height: grid ? "50%" : `${100 / others.length}%` }]}>
      {tile(member, others.length > 1)}
    </View>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  canvas: { flex: 1, minHeight: 0, backgroundColor: "#000" },
  split: { flexDirection: "row", paddingHorizontal: 2, gap: 2 },
  mainHost: { flex: 1, minWidth: 0 },
  guestGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", minWidth: 0 },
  guestSeat: { padding: 1 },
  singleGuest: { padding: 0 },
  tile: { flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", backgroundColor: "#414141" },
  sharedTile: { borderRadius: 10, borderWidth: 1, borderColor: "transparent" },
  speakingTile: { borderColor: c.blue },
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 4, paddingBottom: 22 },
  hostBadge: { position: "absolute", top: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: "#0006" },
  hostText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_500Medium" },
  namePlate: { position: "absolute", bottom: 5, left: 4, right: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 },
  namePill: { flexShrink: 1, minWidth: 0, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: "#0007" },
  name: { color: "#FFF", fontSize: 10, fontFamily: "Inter_500Medium" },
  hint: { color: "#AAB4C7", fontSize: 10, fontFamily: "Inter_500Medium" },
  activeText: { color: c.blue },
  audioCanvas: { paddingHorizontal: 12, paddingTop: 28 },
  audioGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 26 },
  audioSeat: { width: "33.333%", minHeight: 112, alignItems: "center", paddingHorizontal: 4 },
  audioAvatar: { position: "relative" },
  audioMuted: { position: "absolute", right: 5, bottom: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "#333A47", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
  audioAdd: { width: 60, height: 60, margin: 8, borderRadius: 30, backgroundColor: "#1D1D20", alignItems: "center", justifyContent: "center" },
  audioName: { maxWidth: "100%", color: "#E1E5ED", fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 3 },
  audioStatus: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4, height: 14 },
  audioRole: { color: "#7E8A9F", fontSize: 9, fontFamily: "Inter_500Medium" },
  audioEmptyLabel: { color: "#8690A2", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 3 },
});
