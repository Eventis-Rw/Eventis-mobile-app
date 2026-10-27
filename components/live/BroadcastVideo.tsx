import React from "react";
import type { Participant } from "livekit-client";

export function BroadcastVideo({ participant }: { participant: Participant }) {
  // This component only mounts after prepareLiveMedia succeeds; Expo Go never loads native WebRTC.
  const { VideoTrack } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  const publication = participant.getTrackPublication("camera" as import("livekit-client").Track.Source);
  if (!publication?.track || publication.isMuted) return null;
  return <VideoTrack trackRef={{ participant, publication, source: publication.source }} style={{ width: "100%", height: 240 }} objectFit="contain" mirror={participant.isLocal} />;
}
