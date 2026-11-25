import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { CallContextValue } from "@/context/CallContext";
import { useChat } from "@/context/ChatContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

export function CallOverlay({
  call,
  localStream,
  remoteStream,
  muted,
  cameraEnabled,
  acceptCall,
  rejectCall,
  endCall,
  toggleMute,
  toggleCamera,
}: CallContextValue) {
  const insets = useAppSafeAreaInsets();
  const { getConversation, getContact } = useChat();
  if (!call) return null;
  const conversation = getConversation(call.conversationId);
  const avatar = conversation && getContact(conversation.contactId)?.avatarUrl;
  const initials = call.peerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase();
  const video = call.type === "VIDEO";
  const ringing = call.status === "RINGING";
  const incoming = ringing && call.direction === "incoming";
  const connected = !ringing && call.connectionState === "connected";
  const showVideo =
    video && connected && remoteStream?.getVideoTracks?.().length > 0;
  const status =
    call.error ||
    (incoming
      ? "Incoming call"
      : ringing
        ? "Ringing…"
        : connected
          ? "Connected"
          : "Connecting…");

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={callStyles.screen}>
        <LinearGradient
          colors={["#203C53", "#152B40", "#0D1727"]}
          style={StyleSheet.absoluteFill}
        />
        {Platform.OS === "web" && remoteStream && !showVideo && (
          <WebCallVideo
            stream={remoteStream}
            local={false}
            style={{ display: "none" }}
          />
        )}
        {showVideo && (
          <CallMediaView
            stream={remoteStream}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            callStyles.layout,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 14) + 18,
            },
          ]}
        >
          <View style={callStyles.header}>
            <View style={callStyles.kind}>
              <Ionicons
                name={video ? "videocam-outline" : "call-outline"}
                size={17}
                color="#DCF1F0"
              />
              <Text style={callStyles.kindLabel}>
                {video ? "Video call" : "Voice call"}
              </Text>
            </View>
            {showVideo && (
              <View style={callStyles.caption}>
                <Text numberOfLines={1} style={callStyles.videoName}>
                  {call.peerName}
                </Text>
                {call.error ? (
                  <Text style={callStyles.status}>{call.error}</Text>
                ) : (
                  <CallDuration start={call.connectedAt!} />
                )}
              </View>
            )}
          </View>
          {video && localStream && cameraEnabled && (
            <View style={[callStyles.preview, { top: insets.top + 64 }]}>
              <CallMediaView stream={localStream} local style={{ flex: 1 }} />
            </View>
          )}
          {!showVideo && (
            <View style={callStyles.identity}>
              <View style={callStyles.halo}>
                <View style={callStyles.avatar}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <Text style={callStyles.initials}>{initials}</Text>
                  )}
                </View>
              </View>
              <Text numberOfLines={2} style={callStyles.name}>
                {call.peerName}
              </Text>
              {connected && !call.error ? (
                <CallDuration start={call.connectedAt!} />
              ) : (
                <Text style={callStyles.status}>{status}</Text>
              )}
            </View>
          )}
          <View style={callStyles.controls}>
            {incoming ? (
              <>
                <CallAction
                  label="Decline"
                  icon="call"
                  hangUp
                  color="#DC4057"
                  onPress={() => void rejectCall()}
                />
                <CallAction
                  label="Answer"
                  icon={video ? "videocam" : "call"}
                  color="#15876C"
                  onPress={() => void acceptCall()}
                />
              </>
            ) : (
              <>
                {!ringing && (
                  <CallAction
                    label={muted ? "Unmute" : "Mute"}
                    icon={muted ? "mic-off" : "mic"}
                    active={muted}
                    onPress={toggleMute}
                  />
                )}
                {!ringing && video && (
                  <CallAction
                    label={cameraEnabled ? "Camera off" : "Camera on"}
                    icon={cameraEnabled ? "videocam" : "videocam-off"}
                    active={!cameraEnabled}
                    onPress={() => void toggleCamera()}
                  />
                )}
                <CallAction
                  label={ringing ? "Cancel" : "End call"}
                  icon="call"
                  hangUp
                  color="#DC4057"
                  onPress={() => void endCall()}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CallDuration({ start }: { start: number }) {
  const [seconds, setSeconds] = useState(() =>
    Math.floor((Date.now() - start) / 1000),
  );
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [start]);
  return (
    <Text style={callStyles.status}>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </Text>
  );
}

function CallAction({
  label,
  icon,
  color,
  active,
  hangUp,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  active?: boolean;
  hangUp?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        callStyles.action,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          callStyles.button,
          { backgroundColor: color ?? (active ? "#E2F0EF" : "#32465A") },
        ]}
      >
        <Ionicons
          name={icon}
          size={26}
          color={active ? "#192E40" : "#FFFFFF"}
          style={hangUp && { transform: [{ rotate: "135deg" }] }}
        />
      </View>
      <Text style={callStyles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const callStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#101D2C" },
  layout: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between" },
  header: { alignItems: "flex-start" },
  kind: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#192B3DDD",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  kindLabel: {
    color: "#DCF1F0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  identity: { alignItems: "center", paddingHorizontal: 12 },
  halo: {
    padding: 9,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "#6C8C9860",
    backgroundColor: "#749A9A19",
  },
  avatar: {
    height: 106,
    width: 106,
    borderRadius: 53,
    overflow: "hidden",
    backgroundColor: "#416C70",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#F1FAF8", fontSize: 38, fontFamily: "Inter_600SemiBold" },
  name: {
    marginTop: 24,
    color: "white",
    textAlign: "center",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  status: {
    marginTop: 7,
    color: "#CCDAE2",
    textAlign: "center",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  caption: {
    marginTop: 8,
    maxWidth: "66%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#101D2CCE",
    borderRadius: 12,
    alignItems: "flex-start",
  },
  videoName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "white" },
  preview: {
    position: "absolute",
    right: 18,
    height: 112,
    width: 80,
    borderRadius: 16,
    backgroundColor: "#24354A",
    borderWidth: 1,
    borderColor: "#A4BAC1",
    overflow: "hidden",
  },
  controls: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 16,
    backgroundColor: "#112132EB",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  action: { alignItems: "center", gap: 7, minWidth: 58 },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

function CallMediaView({
  stream,
  local = false,
  style,
}: {
  stream: any;
  local?: boolean;
  style?: any;
}) {
  if (Platform.OS === "web")
    return <WebCallVideo stream={stream} local={local} style={style} />;
  const { RTCView } =
    require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc");
  return (
    <RTCView
      streamURL={stream?.toURL?.()}
      mirror={local}
      zOrder={local ? 1 : 0}
      objectFit="cover"
      style={style}
    />
  );
}

function WebCallVideo({
  stream,
  local,
  style,
}: {
  stream: any;
  local: boolean;
  style?: any;
}) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      void ref.current.play?.().catch(() => {});
    }
  }, [stream]);
  return React.createElement("video", {
    ref,
    autoPlay: true,
    playsInline: true,
    muted: local,
    style: { width: "100%", height: "100%", objectFit: "cover", ...style },
  });
}
