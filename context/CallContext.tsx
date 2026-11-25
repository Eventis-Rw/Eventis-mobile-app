import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { registerForCallPushToken } from "@/services/callPushNotifications";
import { mediaUnavailableReason, prepareLiveMedia, stopLiveMedia } from "@/services/liveMedia";
import { API_BASE, api, getToken } from "@/utils/apiClient";

type CallStatus = "RINGING" | "ACCEPTED" | "REJECTED" | "MISSED" | "ENDED" | "CANCELLED";
export type ChatCall = {
  id: string;
  conversationId: string;
  callerId: string;
  type: "VOICE" | "VIDEO";
  status: CallStatus;
  startedAt: string;
};
type ActiveCall = ChatCall & { direction: "incoming" | "outgoing"; peerName: string; error?: string; connectionState?: "connecting" | "connected" | "failed" };
type CallContextValue = {
  call: ActiveCall | null;
  localStream: any;
  remoteStream: any;
  muted: boolean;
  cameraEnabled: boolean;
  startCall: (conversationId: string, type: "VOICE" | "VIDEO", peerName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);
const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const chat = useChat();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const peerRef = useRef<any>(null);
  const localRef = useRef<any>(null);
  const remoteRef = useRef<any>(null);
  const pendingSignals = useRef<Record<string, any>[]>([]);

  const updateCall = useCallback((next: ActiveCall | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const sendSignal = useCallback(async (callId: string, signal: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Call connection is starting. Please try again in a moment.");
    if (!socket.connected) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Could not connect to Eventis calling. Check your internet and try again.")), 10000);
        socket.once("connect", () => { clearTimeout(timeout); resolve(); });
        socket.once("connect_error", () => { clearTimeout(timeout); reject(new Error("Could not connect to Eventis calling. Check your internet and try again.")); });
      });
    }
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Call signaling timed out.")), 8000);
      socket.emit("chat:call:signal", { callId, signal }, (result: any) => {
        clearTimeout(timeout);
        if (result?.ok) resolve();
        else reject(new Error(result?.error || "Could not connect the call."));
      });
    });
  }, []);

  const handleSignal = useCallback(async (signal: Record<string, any>) => {
    const active = callRef.current;
    const peer = peerRef.current;
    if (!active || !peer) {
      pendingSignals.current.push(signal);
      return;
    }
    if (signal.type === "offer" && active.direction === "incoming" && active.status === "ACCEPTED") {
      await peer.setRemoteDescription(signal.description);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(active.id, { type: "answer", description: peer.localDescription });
      for (const item of pendingSignals.current.splice(0)) await handleSignal(item);
      return;
    }
    if (signal.type === "answer" && active.direction === "outgoing") {
      await peer.setRemoteDescription(signal.description);
      for (const item of pendingSignals.current.splice(0)) await handleSignal(item);
      return;
    }
    if (signal.type === "candidate" && signal.candidate) {
      if (!peer.remoteDescription) pendingSignals.current.push(signal);
      else await peer.addIceCandidate(signal.candidate);
    }
  }, [sendSignal]);

  const connectPeer = useCallback(async (active: ActiveCall, makeOffer: boolean) => {
    updateCall({ ...active, connectionState: "connecting" });
    await prepareLiveMedia();
    const mediaDevices = (globalThis as any).navigator?.mediaDevices;
    if (!mediaDevices?.getUserMedia) throw new Error("This device does not support in-app calls. Install the Eventis app and allow microphone access.");
    const stream = await mediaDevices.getUserMedia({ audio: true, video: active.type === "VIDEO" });
    localRef.current = stream;
    setLocalStream(stream);
    const Peer = (globalThis as any).RTCPeerConnection;
    if (!Peer) throw new Error("WebRTC is unavailable in this app build. Install the latest Eventis development build.");
    const relay = await api.get<{ iceServers?: any[] }>("/api/v1/chat/calls/ice-servers").catch(() => ({ iceServers: DEFAULT_ICE }));
    const peer = new Peer({ iceServers: relay.iceServers?.length ? relay.iceServers : DEFAULT_ICE });
    peerRef.current = peer;
    const MediaStreamClass = (globalThis as any).MediaStream;
    const remote = MediaStreamClass ? new MediaStreamClass() : null;
    remoteRef.current = remote;
    if (remote) setRemoteStream(remote);
    for (const track of stream.getTracks()) peer.addTrack(track, stream);
    peer.ontrack = (event: any) => {
      const incoming = event.streams?.[0];
      if (incoming) {
        remoteRef.current = incoming;
        setRemoteStream(incoming);
      } else if (remoteRef.current) {
        remoteRef.current.addTrack(event.track);
        setRemoteStream({ ...remoteRef.current });
      }
    };
    peer.onicecandidate = (event: any) => {
      if (event.candidate) void sendSignal(active.id, { type: "candidate", candidate: event.candidate.toJSON?.() ?? event.candidate }).catch(() => {});
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        updateCall(callRef.current ? { ...callRef.current, connectionState: "connected", error: undefined } : null);
      }
      if (["failed", "disconnected"].includes(peer.connectionState)) {
        updateCall(callRef.current ? { ...callRef.current, connectionState: "failed", error: "Connection lost. Check your network or TURN relay settings." } : null);
      }
    };
    if (makeOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(active.id, { type: "offer", description: peer.localDescription });
    } else {
      for (const item of pendingSignals.current.splice(0)) await handleSignal(item);
    }
  }, [handleSignal, sendSignal, updateCall]);

  const cleanup = useCallback(async () => {
    peerRef.current?.close?.();
    peerRef.current = null;
    for (const track of localRef.current?.getTracks?.() ?? []) track.stop();
    localRef.current = null;
    remoteRef.current = null;
    pendingSignals.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraEnabled(true);
    await stopLiveMedia().catch(() => {});
  }, []);

  const transition = useCallback(async (callId: string, status: string) => {
    await api.patch(`/api/v1/chat/calls/${callId}`, { status });
  }, []);

  const finish = useCallback(async (status: "REJECTED" | "CANCELLED" | "ENDED") => {
    const active = callRef.current;
    if (!active) return;
    updateCall({ ...active, status });
    try { await transition(active.id, status); } finally {
      await cleanup();
      updateCall(null);
    }
  }, [cleanup, transition, updateCall]);

  const startCall = useCallback(async (conversationId: string, type: "VOICE" | "VIDEO", peerName: string) => {
    if (!user || user.isDemo) throw new Error("Sign in to make an Eventis call.");
    if (callRef.current) throw new Error("Finish your current call first.");
    const unavailable = mediaUnavailableReason();
    if (unavailable) throw new Error(unavailable);
    const net = await NetInfo.fetch();
    if (net.isConnected === false || net.isInternetReachable === false) {
      throw new Error("No internet connection. Check your network and try again.");
    }
    try {
      const created = await api.post<ChatCall>("/api/v1/chat/calls", { conversationId, type });
      const active: ActiveCall = { ...created, direction: "outgoing", peerName };
      updateCall(active);
      await connectPeer(active, true);
    } catch (error) {
      const active = callRef.current as ActiveCall | null;
      if (active?.direction === "outgoing") await api.patch(`/api/v1/chat/calls/${active.id}`, { status: "CANCELLED" }).catch(() => {});
      await cleanup();
      updateCall(null);
      throw error;
    }
  }, [cleanup, connectPeer, updateCall, user]);

  const acceptCall = useCallback(async () => {
    const active = callRef.current;
    if (!active || active.direction !== "incoming") return;
    try {
      await transition(active.id, "ACCEPTED");
      const accepted = { ...active, status: "ACCEPTED" as const };
      updateCall(accepted);
      await connectPeer(accepted, false);
      for (const item of pendingSignals.current.splice(0)) await handleSignal(item);
    } catch (error) {
      updateCall({ ...active, error: error instanceof Error ? error.message : "Could not answer the call." });
    }
  }, [connectPeer, handleSignal, transition, updateCall]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    for (const track of localRef.current?.getAudioTracks?.() ?? []) track.enabled = !next;
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const stream = localRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks?.()[0];
    if (!track) return;
    const next = !cameraEnabled;
    track.enabled = next;
    setCameraEnabled(next);
  }, [cameraEnabled]);

  useEffect(() => {
    if (!user || user.isDemo) return;
    let cancelled = false;
    void getToken().then((token) => {
      if (cancelled || !token) return;
      const socket = io(API_BASE, { path: "/socket.io", transports: ["websocket"], auth: { token } });
      socketRef.current = socket;
      socket.on("chat:call:incoming", (incoming: ChatCall & { service?: string }) => {
        if (incoming.service && incoming.service !== "EVENTIS") return;
        const conversation = chat.getConversation(incoming.conversationId);
        const contact = conversation ? chat.getContact(conversation.contactId) : undefined;
        if (callRef.current) {
          void transition(incoming.id, "REJECTED").catch(() => {});
          return;
        }
        updateCall({ ...incoming, direction: "incoming", peerName: contact?.name || "Eventis contact" });
      });
      socket.on("chat:call:signal", (payload: { callId: string; service?: string; signal: Record<string, any> }) => {
        if (payload.service && payload.service !== "EVENTIS") return;
        if (callRef.current?.id !== payload.callId) return;
        void handleSignal(payload.signal).catch((error) => updateCall(callRef.current ? { ...callRef.current, error: error instanceof Error ? error.message : "Call connection failed." } : null));
      });
      socket.on("chat:call:updated", (updated: ChatCall & { service?: string }) => {
        if (updated.service && updated.service !== "EVENTIS") return;
        const current = callRef.current;
        if (!current || current.id !== updated.id) return;
        updateCall({ ...current, status: updated.status });
        if (["REJECTED", "MISSED", "ENDED", "CANCELLED"].includes(updated.status)) {
          void cleanup().finally(() => updateCall(null));
        }
      });
    });
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [chat.getContact, chat.getConversation, cleanup, handleSignal, transition, updateCall, user?.id, user?.isDemo]);

  useEffect(() => {
    if (Platform.OS === "web" || !user || user.isDemo) return;
    void registerForCallPushToken();
  }, [user?.id, user?.isDemo]);

  const presentIncomingCallFromPush = useCallback(async (callId: string) => {
    if (!user || user.isDemo || callRef.current) return;
    try {
      const latest = await api.get<ChatCall & { service?: string }>(`/api/v1/chat/calls/${callId}`);
      if (latest.service && latest.service !== "EVENTIS") return;
      if (latest.status !== "RINGING") return;
      const conversation = chat.getConversation(latest.conversationId);
      const contact = conversation ? chat.getContact(conversation.contactId) : undefined;
      updateCall({ ...latest, direction: "incoming", peerName: contact?.name || "Eventis contact" });
    } catch {
      // The call may already have ended by the time the notification was tapped.
    }
  }, [chat, updateCall, user]);

  useEffect(() => {
    // Push notifications (and this listener) aren't supported on web — calls
    // there rely entirely on the live socket above, same as before.
    if (Platform.OS === "web") return;
    // Covers both a live tap (app backgrounded) and a cold start (app was fully
    // killed, this launch is the result of tapping the call notification) —
    // the handled-ids set guards against both firing for the same tap.
    const handledIds = new Set<string>();
    const handle = (response: Notifications.NotificationResponse | null | undefined) => {
      const id = response?.notification?.request?.identifier;
      if (!id || handledIds.has(id)) return;
      handledIds.add(id);
      const data = response?.notification?.request?.content?.data as
        | { type?: string; callId?: string }
        | undefined;
      if (data?.type === "incoming_call" && data.callId) void presentIncomingCallFromPush(data.callId);
    };
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, [presentIncomingCallFromPush]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && callRef.current && peerRef.current?.connectionState === "failed") void finish("ENDED");
    });
    return () => subscription.remove();
  }, [finish]);

  const value = useMemo<CallContextValue>(() => ({
    call, localStream, remoteStream, muted, cameraEnabled, startCall, acceptCall,
    rejectCall: () => finish("REJECTED"),
    endCall: () => finish(call?.direction === "outgoing" && call.status === "RINGING" ? "CANCELLED" : "ENDED"),
    toggleMute, toggleCamera,
  }), [acceptCall, call, cameraEnabled, finish, localStream, muted, remoteStream, startCall, toggleCamera, toggleMute]);
  return <CallContext.Provider value={value}>{children}<CallOverlay /></CallContext.Provider>;
}

export function useCall() {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used within CallProvider");
  return value;
}

function CallOverlay() {
  const { call, localStream, remoteStream, muted, cameraEnabled, acceptCall, rejectCall, endCall, toggleMute, toggleCamera } = useCall();
  const colors = useMemo(() => ({ background: "#080B16", surface: "#141A2A", accent: "#16A9F5", text: "#FFFFFF", muted: "#A9B2C6", red: "#F15D70", green: "#24C68A" }), []);
  if (!call) return null;
  const ringing = call.status === "RINGING";
  return (
    <View style={{ position: "absolute", inset: 0, zIndex: 999, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 28 }}>
      {call.type === "VIDEO" && remoteStream ? <CallMediaView stream={remoteStream} style={{ position: "absolute", inset: 0 }} /> : null}
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 8 }}>{call.peerName}</Text>
      <Text style={{ color: colors.muted, fontSize: 16, marginBottom: 18 }}>{call.error || (ringing ? call.direction === "incoming" ? `Incoming ${call.type.toLowerCase()} call` : "Calling…" : call.connectionState === "connected" ? "Connected" : "Connecting…")}</Text>
      {call.type === "VIDEO" && localStream ? <View style={{ position: "absolute", top: 58, right: 20, width: 104, height: 156, overflow: "hidden", borderRadius: 16, backgroundColor: colors.surface }}><CallMediaView stream={localStream} local style={{ flex: 1 }} /></View> : null}
      {call.type === "VIDEO" && !remoteStream ? <Text style={{ color: colors.muted, marginBottom: 28 }}>Waiting for video…</Text> : null}
      <View style={{ flexDirection: "row", gap: 20, marginTop: 24 }}>
        {ringing && call.direction === "incoming" ? <CallAction label="Decline" icon="call" color={colors.red} onPress={() => void rejectCall()} /> : null}
        {ringing && call.direction === "incoming" ? <CallAction label="Answer" icon="call" color={colors.green} onPress={() => void acceptCall()} /> : null}
        {!ringing ? <CallAction label={muted ? "Unmute" : "Mute"} icon={muted ? "mic-off" : "mic"} color={colors.surface} onPress={toggleMute} /> : null}
        {!ringing && call.type === "VIDEO" ? <CallAction label={cameraEnabled ? "Camera off" : "Camera on"} icon={cameraEnabled ? "videocam" : "videocam-off"} color={colors.surface} onPress={() => void toggleCamera()} /> : null}
        {call.direction === "outgoing" || !ringing ? <CallAction label={ringing ? "Cancel" : "End"} icon="call" color={colors.red} onPress={() => void endCall()} /> : null}
      </View>
    </View>
  );
}

function CallAction({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  const { Ionicons } = require("@expo/vector-icons") as typeof import("@expo/vector-icons");
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: "center", gap: 9 }}><View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: color, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon as any} size={25} color="#FFFFFF" /></View><Text style={{ color: "#FFFFFF", fontSize: 13 }}>{label}</Text></Pressable>;
}

function CallMediaView({ stream, local = false, style }: { stream: any; local?: boolean; style?: any }) {
  if (Platform.OS === "web") return <WebCallVideo stream={stream} local={local} style={style} />;
  const { RTCView } = require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc");
  return <RTCView streamURL={stream?.toURL?.()} mirror={local} objectFit="cover" style={style} />;
}

function WebCallVideo({ stream, local, style }: { stream: any; local: boolean; style?: any }) {
  const ref = useRef<any>(null);
  useEffect(() => { if (ref.current) { ref.current.srcObject = stream; void ref.current.play?.().catch(() => {}); } }, [stream]);
  return React.createElement("video", { ref, autoPlay: true, playsInline: true, muted: local, style: { width: "100%", height: "100%", objectFit: "cover", ...style } });
}
