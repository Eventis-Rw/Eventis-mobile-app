import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { liveColors as c } from "./LivePrimitives";

/** Kept beside the stage, including while typing; actions always target this device. */
export function LiveMediaControls({ microphone, camera, video, disabled, onAction }: {
  microphone: boolean; camera: boolean; video: boolean; disabled: boolean;
  onAction: (action: "mic" | "camera" | "flip") => void;
}) {
  return <View testID="live-media-controls" style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={microphone ? "Mute microphone" : "Turn microphone on"}
      accessibilityState={{ disabled }} disabled={disabled} onPress={() => onAction("mic")}
      style={({ pressed }) => [styles.button, !microphone && styles.off, { opacity: disabled ? .45 : pressed ? .7 : 1 }]}>
      <Ionicons name={microphone ? "mic" : "mic-off"} size={19} color={microphone ? c.blue : "#FFB8BE"} />
      <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.label}>Microphone</Text><Text style={[styles.state, !microphone && styles.offText]}>{microphone ? "On · tap to mute" : "Off · tap to enable"}</Text></View>
    </Pressable>
    {video ? <>
      <Pressable accessibilityRole="button" accessibilityLabel={camera ? "Turn camera off" : "Turn camera on"}
        accessibilityState={{ disabled }} disabled={disabled} onPress={() => onAction("camera")}
        style={({ pressed }) => [styles.button, !camera && styles.off, { opacity: disabled ? .45 : pressed ? .7 : 1 }]}>
        <Ionicons name={camera ? "videocam" : "videocam-off"} size={19} color={camera ? c.blue : "#FFB8BE"} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.label}>Camera</Text><Text style={[styles.state, !camera && styles.offText]}>{camera ? "On · tap to stop" : "Off · tap to enable"}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Flip camera" accessibilityState={{ disabled: disabled || !camera }}
        disabled={disabled || !camera} onPress={() => onAction("flip")} style={[styles.flip, { opacity: disabled || !camera ? .4 : 1 }]}>
        <Ionicons name="camera-reverse-outline" size={21} color="#FFF" /><Text style={styles.state}>Flip</Text>
      </Pressable>
    </> : <View style={styles.audioNote}><Ionicons name="headset-outline" size={16} color={c.muted} /><Text style={styles.state}>Audio Live</Text></View>}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 6, width: "100%" },
  button: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 14, backgroundColor: "#112434", borderWidth: 1, borderColor: "#244258", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  label: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  state: { color: "#AEBACB", fontFamily: "Inter_400Regular", fontSize: 9, marginTop: 2 },
  off: { backgroundColor: "#2A1821", borderColor: "#56313F" },
  offText: { color: "#FFB8BE" },
  flip: { width: 43, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#161D29" },
  audioNote: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
});
