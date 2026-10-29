import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { LiveButton, LiveIcon, liveColors as c, liveStyles as s } from "./LivePrimitives";

/** Local camera only. Unmounting releases it before LiveKit starts publishing. */
export function LiveCameraPreview({ facing, onFlip, onReadyChange, immersive = false }: {
  immersive?: boolean; facing: CameraType; onFlip: () => void; onReadyChange: (ready: boolean) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const asked = useRef(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission().catch(() => setFailure("Camera access failed. Please try again."));
    }
  }, [permission, requestPermission]);
  useEffect(() => {
    setReady(false);
    onReadyChange(false);
  }, [facing, active, attempt, onReadyChange]);
  const retry = () => {
    setFailure(""); setAttempt(n => n + 1);
    if (!permission?.granted) void requestPermission().catch(() => setFailure("Camera access failed. Please try again."));
  };
  return <View style={immersive ? styles.immersive : styles.frame}>
    {permission?.granted && active && !failure ? <CameraView key={`${facing}-${attempt}`} style={StyleSheet.absoluteFill} facing={facing} mirror={facing === "front"} mute
      onCameraReady={() => { setReady(true); onReadyChange(true); }}
      onMountError={() => { setFailure("Couldn’t open your camera. Close other apps using it, then retry."); setReady(false); onReadyChange(false); }} /> : null}
    {!permission || (permission.granted && active && !failure && !ready) ? <View style={[styles.center, immersive ? { paddingBottom: 220 } : null]}><ActivityIndicator color={c.blue} /><Text style={s.body}>Opening camera…</Text></View> : null}
    {failure || (permission && !permission.granted) || !active ? <View style={[styles.center, immersive ? { paddingBottom: 220 } : null]}>
      <Text style={[s.heading, { textAlign: "center" }]}>{!active ? "Camera paused" : "Camera preview"}</Text>
      <Text style={[s.body, { textAlign: "center" }]}>{!active ? "Return to Eventis to continue." : failure || "Allow camera access to see your live preview."}</Text>
      {active ? permission?.canAskAgain === false && !permission.granted ? Platform.OS === "web" ? <Text style={s.body}>Allow the camera in your browser’s site settings, then reopen this screen.</Text> : <LiveButton label="Open settings" onPress={() => { void Linking.openSettings().catch(() => setFailure("Open your phone settings and enable Camera for Eventis.")); }} /> : <LiveButton label={failure ? "Retry camera" : "Allow camera"} onPress={retry} /> : null}
    </View> : null}
    {!immersive ? <View style={styles.top}><Text style={styles.badge}>PREVIEW · NOT LIVE YET</Text><LiveIcon name="camera-reverse-outline" label="Flip preview camera" onPress={onFlip} /></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  immersive: { flex: 1, overflow: "hidden", backgroundColor: "#03050B" },
  frame: { height: 320, borderRadius: 22, overflow: "hidden", backgroundColor: "#03050B", borderWidth: 1, borderColor: c.line },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  top: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#FFF", backgroundColor: "rgba(0,0,0,.65)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
});
