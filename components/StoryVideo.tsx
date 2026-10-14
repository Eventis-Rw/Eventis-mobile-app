import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

type Props = {
  uri: string; paused: boolean; muted?: boolean; fit?: "cover" | "contain";
  onReady?: (ready: boolean) => void; onError?: () => void;
  onProgress?: (value: number) => void; onEnd?: () => void;
};
/** One player per mounted story; useVideoPlayer releases it on navigation. */
export function StoryVideo({ uri, paused, muted = true, fit = "contain", ...callbacks }: Props) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(uri, (video) => {
    video.loop = false;
    video.muted = muted;
    video.timeUpdateEventInterval = 0.05;
  });
  useEffect(() => {
    const report = (status = player.status) => {
      const loaded = status === "readyToPlay";
      setReady(loaded);
      latest.current.onReady?.(loaded);
      if (status === "error") latest.current.onError?.();
    };
    const status = player.addListener("statusChange", (event) => report(event.status));
    const source = player.addListener("sourceLoad", () => report());
    const progress = player.addListener("timeUpdate", ({ currentTime }) => {
      if (player.duration > 0) latest.current.onProgress?.(Math.min(1, currentTime / player.duration));
    });
    const end = player.addListener("playToEnd", () => latest.current.onEnd?.());
    report();
    return () => {
      status.remove(); source.remove(); progress.remove(); end.remove();
      if (Platform.OS === "web") { player.pause(); player.timeUpdateEventInterval = 0; }
    };
  }, [player]);
  useEffect(() => {
    player.muted = muted;
    if (paused || !ready) player.pause(); else player.play();
  }, [player, paused, ready, muted]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={fit}
    nativeControls={false} surfaceType="textureView" allowsPictureInPicture={false} />;
}

