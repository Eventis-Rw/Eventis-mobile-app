import React, { useEffect, useRef } from "react";
import { Track, type Participant } from "livekit-client";
export function BroadcastVideo({ participant }: { participant: Participant }) {
  const element = useRef<HTMLVideoElement>(null);
  const publication = participant.getTrackPublication(Track.Source.Camera);
  const track = publication?.track;
  useEffect(() => {
    const video = element.current;
    if (!track || !video) return;
    track.attach(video);
    if (participant.isLocal) video.muted = true;
    void video.play().catch(() => {});
    return () => { track.detach(video); };
  }, [track, participant.isLocal]);
  if (!track || publication?.isMuted) return null;
  return <video ref={element} autoPlay playsInline muted={participant.isLocal} aria-label={`${participant.name || "Participant"} camera`} style={{ width: "100%", height: 240, objectFit: "contain", background: "#000" }} />;
}
