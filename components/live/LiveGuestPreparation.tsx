import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { LiveCameraPreview } from "./LiveCameraPreview";
import {
  LiveButton,
  LiveOverlayAction,
  liveColors as c,
  liveStyles as s,
} from "./LivePrimitives";

export function LiveGuestPreparation({
  mode,
  onJoin,
  onCancel,
}: {
  mode: "video" | "voice";
  onJoin: (settings: {
    microphone: boolean;
    camera: boolean;
    facing: "user" | "environment";
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const insets = useAppSafeAreaInsets();
  const [camera, setCamera] = useState(mode === "video");
  const [microphone, setMicrophone] = useState(true);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const join = useRef(onJoin);
  join.current = onJoin;
  useEffect(() => {
    if (!joining) return;
    let disposed = false;
    // Unmount the private preview before LiveKit acquires the same camera.
    const timer = setTimeout(() => {
      void join
        .current({
          microphone,
          camera,
          facing: facing === "front" ? "user" : "environment",
        })
        .catch((e) => {
          if (!disposed) {
            setError(e.message);
            setJoining(false);
          }
        });
    }, 200);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [joining, microphone, camera, facing]);
  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!joining) onCancel();
      }}
    >
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {camera && !joining ? (
          <View style={StyleSheet.absoluteFill}>
            <LiveCameraPreview
              immersive
              facing={facing}
              onFlip={() => {
                setReady(false);
                setFacing((f) => (f === "front" ? "back" : "front"));
              }}
              onReadyChange={setReady}
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingBottom: 180,
            }}
          >
            <Ionicons
              name={joining ? "radio-outline" : "mic-outline"}
              size={70}
              color={c.blue}
            />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            right: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <LiveOverlayAction
            name="close"
            label="Cancel joining stage"
            disabled={joining}
            onPress={onCancel}
          />
          <Text style={s.label}>Your guest preview</Text>
          {camera ? (
            <LiveOverlayAction
              name="camera-reverse-outline"
              label="Flip guest preview camera"
              disabled={joining}
              onPress={() => {
                setReady(false);
                setFacing((f) => (f === "front" ? "back" : "front"));
              }}
            />
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>
        <LinearGradient
          colors={["#0000", "#000D", "#000F"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
            paddingTop: 65,
            paddingBottom: Math.max(insets.bottom, 18),
            gap: 18,
          }}
        >
          <Text style={[s.eyebrow, { color: "#FFF" }]}>
            ONLY YOU CAN SEE THIS PREVIEW
          </Text>
          <Text style={s.heading}>You’re invited on stage.</Text>
          <Text style={s.body}>
            Choose what to share. People can see or hear you only after you join
            the broadcast.
          </Text>
          <View style={s.row}>
            {(
              [
                {
                  key: "microphone",
                  value: microphone,
                  set: setMicrophone,
                  icon: "mic-outline",
                  label: "Microphone",
                },
                ...(mode === "video"
                  ? [
                      {
                        key: "camera",
                        value: camera,
                        set: setCamera,
                        icon: "videocam-outline",
                        label: "Camera",
                      },
                    ]
                  : []),
              ] as const
            ).map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="switch"
                accessibilityLabel={`Guest ${option.key}`}
                accessibilityState={{ checked: option.value }}
                disabled={joining}
                onPress={() => {
                  option.set((v) => !v);
                  if (option.key === "camera") setReady(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF16",
                  borderRadius: 16,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Ionicons
                  name={
                    option.key === "camera" ? "videocam-outline" : "mic-outline"
                  }
                  size={22}
                  color={option.value ? c.blue : c.muted}
                />
                <Text style={s.label}>
                  {option.label} {option.value ? "on" : "off"}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          ) : null}
          {joining ? <ActivityIndicator color={c.blue} /> : null}
          <LiveButton
            tone="live"
            label={joining ? "Joining…" : "Join broadcast"}
            disabled={joining || (camera && !ready)}
            onPress={() => {
              setError("");
              setJoining(true);
            }}
          />
          <LiveButton
            secondary
            label="Stay watching"
            disabled={joining}
            onPress={onCancel}
          />
        </LinearGradient>
      </View>
    </Modal>
  );
}
