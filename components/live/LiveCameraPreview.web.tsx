import type { CameraType } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LiveButton, LiveIcon, liveColors as c, liveStyles as s } from "./LivePrimitives";

export function LiveCameraPreview({ facing, onFlip, onReadyChange, immersive = false }: {
  immersive?: boolean; facing: CameraType; onFlip: () => void; onReadyChange: (ready: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const notify = useRef(onReadyChange);
  notify.current = onReadyChange;
  const [active, setActive] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const changed = () => setActive(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    const element = video.current;
    const stop = () => stream?.getTracks().forEach(track => track.stop());
    setReady(false);
    setFailure("");
    notify.current(false);
    if (active) void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Open Eventis over HTTPS to use the camera.");
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing === "front" ? "user" : "environment" } } });
        if (disposed || !element) { stop(); return; }
        element.srcObject = stream;
        await element.play();
        if (disposed) stop();
      } catch (error) {
        stop();
        if (!disposed) setFailure(error instanceof Error ? error.message : "Couldn’t open your camera.");
      }
    })();
    return () => {
      disposed = true;
      stop();
      if (element) element.srcObject = null;
    };
  }, [facing, active, attempt]);
  return <View style={immersive ? styles.immersive : styles.frame}>
    <video ref={video} autoPlay muted playsInline aria-label="Your camera preview"
      onLoadedData={() => { if (active && video.current?.srcObject) { setReady(true); notify.current(true); } }}
      style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: facing === "front" ? "scaleX(-1)" : undefined }} />
    {!ready && active && !failure ? <View style={[styles.center, immersive && styles.raised]}><ActivityIndicator color={c.blue} /><Text style={s.body}>Opening camera…</Text></View> : null}
    {failure || !active ? <View style={[styles.center, immersive && styles.raised]}>
      <Text style={s.heading}>{active ? "Camera preview" : "Camera paused"}</Text>
      <Text style={[s.body, { textAlign: "center" }]}>{active ? failure : "Return to Eventis to continue."}</Text>
      {active ? <LiveButton label="Retry camera" onPress={() => setAttempt(n => n + 1)} /> : null}
    </View> : null}
    {!immersive ? <View style={styles.top}><Text style={s.label}>Camera preview</Text><LiveIcon name="camera-reverse-outline" label="Flip preview camera" onPress={onFlip} /></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  immersive: { flex: 1, overflow: "hidden", backgroundColor: "#03050B" },
  frame: { height: 320, borderRadius: 22, overflow: "hidden", backgroundColor: "#03050B", borderWidth: 1, borderColor: c.line },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  raised: { paddingBottom: 220 },
  top: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
