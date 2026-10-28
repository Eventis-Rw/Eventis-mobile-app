import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLiveBroadcast } from "@/hooks/useLiveBroadcast";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { createBroadcastSession, joinBroadcastSession, liveProject, roomState, type BroadcastSession } from "@/services/liveBroadcastProtocol";
import { mediaUnavailableReason } from "@/services/liveMedia";
import type { LivePerson } from "@/services/liveState";
import { LiveAvatar, LiveButton, LiveOverlayAction, liveColors as c, liveStyles as s } from "./LivePrimitives";
import { LiveRoomView } from "./LiveRoomView";
import { LiveBroadcastStage } from "./LiveBroadcastStage";
import { LiveCameraPreview } from "./LiveCameraPreview";

function nonce() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`; }

export function LiveBroadcastEntry({ person, initialTab = "host", onClose }: { person: LivePerson; initialTab?: "host" | "join"; onClose: () => void }) {
  const insets = useAppSafeAreaInsets();
  const [session, setSession] = useState<BroadcastSession | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);
  const [tab, setTab] = useState<"host" | "join">(initialTab);
  const [mode, setMode] = useState<"video" | "voice">("video");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const unavailable = mediaUnavailableReason();
  const start = () => {
    try {
      setError(""); setCloseSignal(0);
      setSession(tab === "host" ? { ...createBroadcastSession(title, mode, nonce()), facingMode: facing === "back" ? "environment" : "user" } : joinBroadcastSession(code, nonce()));
    } catch (e) { setError(e instanceof Error ? e.message : "Check your room details."); }
  };
  const flip = () => { setCameraReady(false); setFacing(f => f === "back" ? "front" : "back"); };
  const disabled = !!unavailable || !liveProject.tokenServerId || (tab === "host" ? !title.trim() || (mode === "video" && !cameraReady) : !code.trim());
  return <Modal animationType="slide" presentationStyle="fullScreen" onRequestClose={() => session ? setCloseSignal(n => n + 1) : onClose()}>
    <StatusBar style="light" />
    {session ? <ConnectedBroadcast key={session.code} session={session} name={person.name} closeSignal={closeSignal} onClose={onClose} /> : <View style={entry.screen}>
      {tab === "host" ? <View style={StyleSheet.absoluteFill}>
        {mode === "video" ? <LiveCameraPreview immersive facing={facing} onFlip={flip} onReadyChange={setCameraReady} /> : <LinearGradient colors={["#152B44", "#080D19", "#14243B"]} style={entry.voiceCanvas}><View style={entry.voiceHalo}><LiveAvatar person={person} size={112} /></View><Text style={entry.voiceName}>{person.name}</Text><View style={entry.voiceWave}>{[12, 24, 38, 18, 30, 46, 22, 34, 14].map((h, i) => <View key={i} style={{ width: 4, height: h, borderRadius: 3, backgroundColor: i % 2 ? "#38BDF8" : "#38BDF866" }} />)}</View><Text style={entry.voiceHint}>A space for your conversations.</Text></LinearGradient>}
      </View> : null}
      {tab === "host" ? <LinearGradient pointerEvents="none" colors={["#0008", "#0000"]} style={entry.topShade} /> : null}
      <View style={[entry.header, { paddingTop: insets.top + 12 }]}>
        <LiveOverlayAction name="close" label="Close streaming setup" onPress={onClose} />
        <Text style={entry.headerTitle}>{tab === "host" ? "Create Live" : "Join a Live"}</Text>
        {tab === "host" && mode === "video" ? <LiveOverlayAction name="camera-reverse-outline" label="Flip preview camera" onPress={flip} /> : <View style={{ width: 42 }} />}
      </View>
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {tab === "host" ? <View style={entry.setupBottom}>
          <LinearGradient pointerEvents="none" colors={["#0000", "#000B", "#000E"]} style={StyleSheet.absoluteFill} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 65, paddingBottom: Math.max(insets.bottom, 16), gap: 18 }}>
            <View style={entry.previewLabel}><View style={entry.previewDot} /><Text style={entry.previewText}>PREVIEW · ONLY YOU CAN SEE THIS</Text></View>
            <View style={entry.modeSwitch}>
              {(["video", "voice"] as const).map(m => <Pressable key={m} accessibilityRole="button" accessibilityLabel={m === "video" ? "Camera + voice" : "Voice only"} accessibilityState={{ selected: mode === m }} onPress={() => { if (mode !== m) { setCameraReady(false); setMode(m); } }} style={[entry.mode, mode === m ? entry.selectedMode : null]}><Ionicons name={m === "video" ? "videocam-outline" : "mic-outline"} size={17} color="#FFF" /><Text style={entry.modeText}>{m === "video" ? "Camera" : "Voice"}</Text></Pressable>)}
            </View>
            <View style={entry.titleField}><LiveAvatar person={person} size={38} /><View style={{ flex: 1, gap: 4 }}><Text style={entry.fieldLabel}>WHAT’S HAPPENING?</Text><TextInput accessibilityLabel="Broadcast title" style={entry.titleInput} placeholder="Give your Live a title…" placeholderTextColor="#D5D9E2" value={title} maxLength={80} onChangeText={setTitle} returnKeyType="done" /></View><Text style={entry.charCount}>{title.length}/80</Text></View>
            {unavailable || !liveProject.tokenServerId || error ? <Text accessibilityRole={error ? "alert" : undefined} style={entry.setupNotice}>{error || (unavailable ? "Camera preview only. Open the Eventis development app to broadcast." : "Connect your LiveKit project to start broadcasting.")}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Start broadcasting" accessibilityState={{ disabled }} disabled={disabled} onPress={start} style={({ pressed }) => [entry.goLive, { opacity: disabled ? .45 : pressed ? .7 : 1 }]}><Ionicons name="radio" size={22} color="#FFF" /><Text style={entry.goLiveText}>Go LIVE</Text></Pressable>
            <View style={entry.setupFoot}><Text style={entry.setupFootText}>Up to 4 guests · 30 minutes</Text><Pressable accessibilityRole="button" accessibilityLabel="Join with a code" hitSlop={8} onPress={() => { setError(""); setTab("join"); }}><Text style={entry.joinLink}>Join a Live instead</Text></Pressable></View>
          </ScrollView>
        </View> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[entry.joinContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={entry.joinIcon}><Ionicons name="radio-outline" size={36} color={c.blue} /></View><Text style={entry.joinTitle}>Pull up a seat.</Text><Text style={entry.joinDescription}>Paste the host’s room code to watch and join the conversation.</Text>
          <View style={entry.codeField}><TextInput accessibilityLabel="Broadcast room code" style={[s.input, { flex: 1, backgroundColor: "transparent", minWidth: 0 }]} placeholder="Enter room code" placeholderTextColor={c.muted} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} maxLength={60} /><Pressable accessibilityRole="button" accessibilityLabel="Paste room code" onPress={() => { void Clipboard.getStringAsync().then(setCode).catch(() => setError("Paste the room code into the field above.")); }} style={entry.paste}><Ionicons name="clipboard-outline" size={19} color={c.blue} /></Pressable></View>
          {error || unavailable || !liveProject.tokenServerId ? <Text accessibilityRole="alert" style={s.error}>{error || unavailable || "Streaming isn’t configured yet."}</Text> : null}
          <LiveButton icon="enter-outline" label="Join Live" disabled={disabled} onPress={start} /><Text style={entry.joinPrivacy}><Ionicons name="lock-closed-outline" size={12} />  Your camera and microphone stay off.</Text><LiveButton secondary label="Host a Live" onPress={() => { setError(""); setTab("host"); }} />
        </ScrollView>}
      </KeyboardAvoidingView>
    </View>}
  </Modal>;
}

function ConnectedBroadcast({ session, name, closeSignal, onClose }: { session: BroadcastSession; name: string; closeSignal: number; onClose: () => void }) {
  const live = useLiveBroadcast(session, name);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice.startsWith("Room code copied")) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const insets = useAppSafeAreaInsets();
  const own = { id: session.identity, name };
  useEffect(() => { if (closeSignal && !live.ready) onClose(); }, [closeSignal, live.ready, onClose]);
  if (!live.ready || !live.room) return <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, paddingTop: insets.top + 24, justifyContent: "center", gap: 20 }}>
    {live.connection !== "failed" ? <ActivityIndicator color={c.blue} /> : null}<Text style={s.heading}>{live.connection === "failed" ? "Couldn’t connect" : "Connecting to your Live…"}</Text>
    <Text style={s.body}>{live.error || (session.hosting ? "Opening the room and preparing media permissions." : "Waiting for the host. Your microphone and camera are off.")}</Text>
    {live.connection === "failed" ? <LiveButton label="Retry connection" onPress={live.retry} /> : null}<LiveButton secondary label="Back to Live" onPress={onClose} />
  </View>;
  const stage = live.participants.filter(p => p.identity === session.hostId || live.model.guests.some(g => g.id === p.identity));
  const disabled = live.connection !== "connected";
  return <LiveRoomView room={live.model} person={own} state={roomState(live.model)} now={live.now} closeSignal={closeSignal} act={live.act} onClose={onClose} broadcast={{
    status: live.connection === "connected" ? "LIVE · TEST SESSION" : live.connection.toUpperCase(),
    onShare: () => { void Share.share({ message: `Join ${live.model.title} on Eventis. Open Live → Join with a code.\nRoom code: ${session.code}` }).catch(() => setNotice("Sharing is unavailable. Use Copy code.")); },
    onCopyCode: () => { void Clipboard.setStringAsync(session.code).then(() => setNotice("Room code copied. Share it with your guests."), () => setNotice(`Room code: ${session.code}`)); },
    notice: live.error || notice,
    onDismissNotice: () => { setNotice(""); live.clearError(); },
    stage: <LiveBroadcastStage participants={stage} revision={live.revision} hostId={session.hostId} host={live.model.host} mode={session.mode} />,
    controls: <>
      {live.canPublish ? <>
        <LiveOverlayAction name={live.localMedia.microphone ? "mic-outline" : "mic-off-outline"} label={live.localMedia.microphone ? "Mute" : "Enable mic"} caption="Mic" active={!live.localMedia.microphone} disabled={disabled} onPress={() => live.media("mic")} />
        {session.mode === "video" ? <><LiveOverlayAction name={live.localMedia.camera ? "videocam-outline" : "videocam-off-outline"} label={live.localMedia.camera ? "Camera off" : "Camera on"} caption="Camera" active={!live.localMedia.camera} disabled={disabled} onPress={() => live.media("camera")} /><LiveOverlayAction name="camera-reverse-outline" label="Flip" caption="Flip" disabled={disabled || !live.localMedia.camera} onPress={() => live.media("flip")} /></> : null}
      </> : null}
      {Platform.OS === "web" ? <LiveOverlayAction name="volume-high-outline" label="Enable sound" disabled={disabled} onPress={() => live.media("audio")} /> : null}
    </>,
  }} />;
}

const entry = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#080D19" },
  topShade: { position: "absolute", top: 0, right: 0, left: 0, height: 170 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  headerTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: -.2 },
  setupBottom: { marginTop: "auto", maxHeight: "100%" },
  previewLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFF" },
  previewText: { color: "#FFFFFFCC", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2 },
  modeSwitch: { alignSelf: "center", flexDirection: "row", padding: 4, borderRadius: 25, backgroundColor: "#0006", borderWidth: 1, borderColor: "#FFFFFF20" },
  mode: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 20, height: 37, borderRadius: 22 },
  selectedMode: { backgroundColor: "#FFFFFF22" },
  modeText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  titleField: { flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "#FFFFFF30", paddingBottom: 13, paddingTop: 4 },
  fieldLabel: { color: "#FFFFFF90", fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 1.2 },
  titleInput: { color: "#FFF", fontSize: 16, fontFamily: "Inter_500Medium", paddingVertical: 6, minHeight: 35 },
  charCount: { color: "#FFFFFF70", fontSize: 9, fontFamily: "Inter_400Regular" },
  setupNotice: { color: "#FFF", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", backgroundColor: "#111827CC", padding: 12, borderRadius: 12 },
  goLive: { minHeight: 56, backgroundColor: "#EF4444", borderRadius: 30, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  goLiveText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: .3 },
  setupFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  setupFootText: { color: "#FFFFFF99", fontSize: 10, fontFamily: "Inter_400Regular" },
  joinLink: { color: "#FFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  voiceCanvas: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 180, gap: 16 },
  voiceHalo: { padding: 20, borderRadius: 100, borderWidth: 1, borderColor: "#38BDF82A", backgroundColor: "#38BDF809" },
  voiceName: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 20 },
  voiceHint: { color: "#FFFFFF80", fontSize: 12, fontFamily: "Inter_400Regular" },
  voiceWave: { flexDirection: "row", height: 48, alignItems: "center", gap: 5 },
  joinContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 26, paddingTop: 26, gap: 20 },
  joinIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#38BDF812", alignItems: "center", justifyContent: "center" },
  joinTitle: { color: "#FFF", fontSize: 30, letterSpacing: -.8, fontFamily: "Inter_700Bold" },
  joinDescription: { color: c.muted, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, maxWidth: 300 },
  codeField: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FFFFFF20", backgroundColor: "#FFFFFF08", borderRadius: 18 },
  paste: { padding: 15 },
  joinPrivacy: { color: c.muted, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
