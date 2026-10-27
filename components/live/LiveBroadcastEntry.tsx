import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Track } from "livekit-client";
import { useLiveBroadcast } from "@/hooks/useLiveBroadcast";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { createBroadcastSession, joinBroadcastSession, liveProject, roomState, type BroadcastSession } from "@/services/liveBroadcastProtocol";
import { mediaUnavailableReason } from "@/services/liveMedia";
import type { LivePerson } from "@/services/liveState";
import { LiveAvatar, LiveButton, LiveIcon, liveColors as c, liveStyles as s } from "./LivePrimitives";
import { LiveRoomView } from "./LiveRoomView";
import { BroadcastVideo } from "./BroadcastVideo";

function nonce() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`; }

export function LiveBroadcastEntry({ person, onClose }: { person: LivePerson; onClose: () => void }) {
  const insets = useAppSafeAreaInsets();
  const [session, setSession] = useState<BroadcastSession | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);
  const [tab, setTab] = useState<"host" | "join">("host");
  const [mode, setMode] = useState<"video" | "voice">("video");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const unavailable = mediaUnavailableReason();
  return <Modal animationType="slide" presentationStyle="fullScreen" onRequestClose={() => session ? setCloseSignal(n => n + 1) : onClose()}>
    {session ? <ConnectedBroadcast key={session.code} session={session} name={person.name} closeSignal={closeSignal} onClose={onClose} /> : <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[s.row, { padding: 18, justifyContent: "space-between" }]}><Text style={s.eyebrow}>EVENTIS LIVE · DEVICE TESTING</Text><LiveIcon name="close" label="Close streaming setup" onPress={onClose} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 22, paddingBottom: insets.bottom + 24 }}>
        <Text style={s.title}>Make it live.</Text><Text style={s.body}>Stream your camera and voice to another phone. Both devices must use the same LiveKit project and room code.</Text>
        <View style={s.row}><LiveButton compact secondary={tab !== "host"} label="Host a Live" onPress={() => setTab("host")} /><LiveButton compact secondary={tab !== "join"} label="Join with a code" onPress={() => setTab("join")} /></View>
        {unavailable ? <View style={s.card}><Text style={s.heading}>Use a development build</Text><Text style={s.body}>{unavailable}</Text></View> : null}
        {!liveProject.tokenServerId ? <View style={s.card}><Text style={s.heading}>Connect your LiveKit project</Text><Text style={s.body}>Enable the Development token server in LiveKit Cloud. Add its ID as EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID in the app’s .env file, then restart Expo.</Text><Text style={s.body}>Use only the public token server ID. Your API secret never belongs in this app.</Text></View> : null}
        {tab === "host" ? <><View style={s.card}><Text style={s.label}>What’s happening?</Text><TextInput accessibilityLabel="Broadcast title" style={s.input} placeholder="Give your Live a title" placeholderTextColor={c.muted} value={title} maxLength={80} onChangeText={setTitle} /><View style={s.wrap}><LiveButton secondary={mode !== "video"} compact icon="videocam-outline" label="Camera + voice" onPress={() => setMode("video")} /><LiveButton secondary={mode !== "voice"} compact icon="mic-outline" label="Voice only" onPress={() => setMode("voice")} /></View></View><Text style={s.body}>Starting will request microphone{mode === "video" ? " and camera" : ""} access. Share the room code once connected. Guests join with their media off.</Text></> : <View style={s.card}><Text style={s.label}>Room code</Text><TextInput accessibilityLabel="Broadcast room code" style={s.input} placeholder="ev1-v-…" placeholderTextColor={c.muted} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} maxLength={60} /><Text style={s.body}>Ask the host to copy the full code. Your camera and microphone stay off until you join the stage and enable them.</Text></View>}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <LiveButton tone={tab === "host" ? "live" : "blue"} label={tab === "host" ? "Start broadcasting" : "Join Live"} disabled={!!unavailable || !liveProject.tokenServerId || (tab === "host" ? !title.trim() : !code.trim())} onPress={() => { try { setError(""); setCloseSignal(0); setSession(tab === "host" ? createBroadcastSession(title, mode, nonce()) : joinBroadcastSession(code, nonce())); } catch (e) { setError(e instanceof Error ? e.message : "Check your room details."); } }} />
        <Text style={s.body}>Development access is for trusted testing. Global limits, secure host permissions and payments need the production backend.</Text>
      </ScrollView>
    </KeyboardAvoidingView>}
  </Modal>;
}

function ConnectedBroadcast({ session, name, closeSignal, onClose }: { session: BroadcastSession; name: string; closeSignal: number; onClose: () => void }) {
  const live = useLiveBroadcast(session, name);
  const [notice, setNotice] = useState("");
  const insets = useAppSafeAreaInsets();
  const own = { id: session.identity, name };
  useEffect(() => { if (closeSignal && !live.ready) onClose(); }, [closeSignal, live.ready, onClose]);
  if (!live.ready || !live.room) return <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, paddingTop: insets.top + 24, justifyContent: "center", gap: 20 }}>
    {live.connection !== "failed" ? <ActivityIndicator color={c.blue} /> : null}<Text style={s.heading}>{live.connection === "failed" ? "Couldn’t connect" : "Connecting to your Live…"}</Text>
    <Text style={s.body}>{live.error || (session.hosting ? "Opening the room and preparing media permissions." : "Waiting for the host. Your microphone and camera are off.")}</Text>
    {live.connection === "failed" ? <LiveButton label="Retry connection" onPress={live.retry} /> : null}<LiveButton secondary label="Back to Live" onPress={onClose} />
  </View>;
  const participants = [live.room.localParticipant, ...live.room.remoteParticipants.values()];
  const stage = participants.filter(p => p.identity === session.hostId || live.model.guests.some(g => g.id === p.identity));
  const disabled = live.connection !== "connected";
  return <LiveRoomView room={live.model} person={own} state={roomState(live.model)} now={live.now} closeSignal={closeSignal} act={live.act} onClose={onClose} broadcast={{
    status: live.connection === "connected" ? "LIVE · TEST SESSION" : live.connection.toUpperCase(),
    onShare: () => { void Share.share({ message: `Join ${live.model.title} on Eventis. Open Live → Stream between phones → Join with a code.\nRoom code: ${session.code}` }).catch(() => setNotice("Sharing is unavailable. Use Copy code.")); },
    stage: <View style={{ gap: 14 }}>{stage.map(p => {
      const camera = p.getTrackPublication(Track.Source.Camera);
      return <View key={p.identity} style={{ backgroundColor: c.panel, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: p.isSpeaking ? c.blue : c.line }}>
        {camera?.track && !camera.isMuted ? <BroadcastVideo participant={p} /> : <View style={{ alignItems: "center", justifyContent: "center", height: stage.length > 1 ? 140 : 240, gap: 14 }}><LiveAvatar person={{ id: p.identity, name: p.name || "Guest" }} size={76} /><Text style={s.body}>{p.isMicrophoneEnabled ? p.isSpeaking ? "Speaking" : "Microphone on" : "Microphone off"}</Text></View>}
        <View style={{ padding: 12 }}><Text style={s.label}>{p.name || "Guest"}{p.isLocal ? " · You" : ""}{p.identity === session.hostId ? " · Host" : ""}</Text></View>
      </View>;
    })}{stage.length === 0 ? <Text style={s.body}>Waiting for the host to reconnect…</Text> : null}</View>,
    controls: <View style={{ gap: 8 }}>
      {live.error ? <Text style={s.error}>{live.error}</Text> : null}{notice ? <Text style={s.body}>{notice}</Text> : null}
      <View style={s.wrap}>
        {live.canPublish ? <><LiveButton compact secondary disabled={disabled} icon="mic-outline" label={live.room.localParticipant.isMicrophoneEnabled ? "Mute" : "Enable mic"} onPress={() => live.media("mic")} />{session.mode === "video" ? <><LiveButton compact secondary disabled={disabled} icon="videocam-outline" label={live.room.localParticipant.isCameraEnabled ? "Camera off" : "Camera on"} onPress={() => live.media("camera")} /><LiveButton compact secondary disabled={disabled || !live.room.localParticipant.isCameraEnabled} label="Flip" onPress={() => live.media("flip")} /></> : null}</> : null}
        {Platform.OS === "web" ? <LiveButton compact secondary label="Enable sound" disabled={disabled} onPress={() => live.media("audio")} /> : null}
        <LiveButton compact secondary label="Copy code" onPress={() => { void Clipboard.setStringAsync(session.code).then(() => setNotice("Room code copied. Send it to the other phone."), () => setNotice(session.code)); }} />
      </View>
    </View>,
  }} />;
}
