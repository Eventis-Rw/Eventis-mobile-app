import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useChatColors } from "@/hooks/useChatColors";

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

const BAR_HEIGHTS = [10, 18, 13, 23, 15, 27, 11, 21, 16, 25, 12, 19, 14, 24];

export function VoiceNoteBubble({
  uri,
  durationMs = 0,
}: {
  uri: string;
  durationMs?: number;
}) {
  const colors = useChatColors();
  const player = useAudioPlayer(uri, { updateInterval: 150 });
  const status = useAudioPlayerStatus(player);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const duration = status.duration || durationMs / 1000;
  const progress = duration ? Math.min(1, status.currentTime / duration) : 0;

  const togglePlayback = async () => {
    try {
      setPlaybackError(null);
      if (status.playing) {
        player.pause();
        return;
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      if (status.didJustFinish || (duration && status.currentTime >= duration)) {
        await player.seekTo(0);
      }
      player.play();
    } catch (error) {
      console.warn("Voice message playback failed:", error);
      setPlaybackError("Voice message could not be played.");
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => void togglePlayback()}
        accessibilityRole="button"
        accessibilityLabel={
          status.playing ? "Pause voice message" : "Play voice message"
        }
        style={[styles.play, { backgroundColor: colors.primary }]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={20}
          color="#FFFFFF"
        />
      </Pressable>
      <View style={styles.track}>
        <View style={styles.waveform}>
          {BAR_HEIGHTS.map((height, index) => {
            const active = index / BAR_HEIGHTS.length <= progress;
            return (
              <View
                key={`${height}-${index}`}
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: active
                      ? colors.primary
                      : colors.mutedForeground,
                  },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.duration, { color: colors.mutedForeground }]}>
          {playbackError || status.error ? "Could not play voice message" : formatDuration(status.playing ? status.currentTime : duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: 220,
    maxWidth: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  track: { flex: 1, minWidth: 0 },
  waveform: {
    height: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
  bar: { width: 3, borderRadius: 2, opacity: 0.9 },
  duration: { marginTop: 1, fontSize: 10 },
});
