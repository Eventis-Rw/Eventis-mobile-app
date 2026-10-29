import React, { useEffect, useMemo, useRef } from "react";
import { Track, type Participant } from "livekit-client";
export function BroadcastVideo({ participant, revision }: { participant: Participant; revision: number }) {
  const element = useRef<HTMLVideoElement>(null);
  const camera = useMemo(() => {
    const publication = participant.getTrackPublication(Track.Source.Camera);
    return { track: publication?.track, muted: publication?.isMuted, mirror: participant.isLocal && publication?.track?.mediaStreamTrack.getSettings().facingMode === "user" };
  }, [participant, revision]);
  const track = camera.track;
  useEffect(() => {
    const video = element.current;
    if (!track || !video) return;
    track.attach(video);
    if (participant.isLocal) video.muted = true;
    void video.play().catch(() => {});
    return () => { track.detach(video); };
  }, [track, participant.isLocal]);
  if (!track || camera.muted) return null;
  return <video ref={element} autoPlay playsInline muted={participant.isLocal} aria-label={`${participant.name || "Participant"} camera`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000", transform: camera.mirror ? "scaleX(-1)" : undefined }} />;
}
