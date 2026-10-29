import React, { useMemo } from "react";
import type { Participant } from "livekit-client";
import { StyleSheet } from "react-native";

export function BroadcastVideo({ participant, revision }: { participant: Participant; revision: number }) {
  // This component only mounts after prepareLiveMedia succeeds; Expo Go never loads native WebRTC.
  const { VideoTrack } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  const camera = useMemo(() => {
    const publication = participant.getTrackPublication("camera" as import("livekit-client").Track.Source);
    return { publication, available: !!publication?.track && !publication.isMuted, mirror: participant.isLocal && publication?.track?.mediaStreamTrack.getSettings().facingMode === "user" };
  }, [participant, revision]);
  if (!camera.publication || !camera.available) return null;
  return <VideoTrack trackRef={{ participant, publication: camera.publication, source: camera.publication.source }} style={StyleSheet.absoluteFill} objectFit="cover" mirror={camera.mirror} />;
}
