import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BootstrapIcon } from "@/components/icons/BootstrapIcons";
import { liveColors as c } from "./LivePrimitives";

/** Kept beside the stage, including while typing; actions always target this device. */
export function LiveMediaControls({
  microphone,
  camera,
  video,
  disabled,
  onAction,
}: {
  microphone: boolean;
  camera: boolean;
  video: boolean;
  disabled: boolean;
  onAction: (action: "mic" | "camera" | "flip") => void;
}) {
  return (
    <View testID="live-media-controls" style={styles.row}>
      {/* Microphone Control */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={microphone ? "Mute microphone" : "Turn microphone on"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onAction("mic")}
        style={({ pressed }) => [
          styles.button,
          !microphone && styles.off,
          { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        ]}
      >
        <BootstrapIcon
          name={microphone ? "mic-fill" : "mic-mute"}
          size={18}
          color={microphone ? "#38BDF8" : "#FF9AA5"}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label}>Microphone</Text>
          <Text style={[styles.state, !microphone && styles.offText]}>
            {microphone ? "On · Tap to mute" : "Muted · Tap to turn on"}
          </Text>
        </View>
      </Pressable>

      {/* Video & Flip Controls */}
      {video ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={camera ? "Turn camera off" : "Turn camera on"}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onAction("camera")}
            style={({ pressed }) => [
              styles.button,
              !camera && styles.off,
              { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
            ]}
          >
            <BootstrapIcon
              name={camera ? "camera-video-fill" : "camera-video-off"}
              size={18}
              color={camera ? "#38BDF8" : "#FF9AA5"}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.label}>Camera</Text>
              <Text style={[styles.state, !camera && styles.offText]}>
                {camera ? "On · Tap to stop" : "Off · Tap to start"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            accessibilityState={{ disabled: disabled || !camera }}
            disabled={disabled || !camera}
            onPress={() => onAction("flip")}
            style={({ pressed }) => [
              styles.flip,
              { opacity: disabled || !camera ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <BootstrapIcon name="arrow-repeat" size={20} color="#FFF" />
            <Text style={styles.state}>Flip</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.audioNote}>
          <BootstrapIcon name="soundwave" size={17} color={c.muted} />
          <Text style={styles.state}>Audio Live</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    width: "100%",
  },
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#112434",
    borderWidth: 1,
    borderColor: "#244258",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  state: {
    color: "#AEBACB",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  off: {
    backgroundColor: "#2A1821",
    borderColor: "#56313F",
  },
  offText: {
    color: "#FFB8BE",
  },
  flip: {
    width: 46,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#161D29",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 2,
  },
  audioNote: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 4,
  },
});
