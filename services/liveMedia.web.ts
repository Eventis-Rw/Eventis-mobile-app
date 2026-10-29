import { RoomEvent, Track, type RemoteTrack, type Room } from "livekit-client";
export function mediaUnavailableReason(): string | null {
  return typeof window !== "undefined" && !window.isSecureContext ? "Open Eventis over HTTPS to use your camera and microphone." : null;
}
export async function prepareLiveMedia() {
  const error = mediaUnavailableReason(); if (error) throw new Error(error);
}
export async function stopLiveMedia() {}
export function attachRoomAudio(room: Room) {
  const elements = new Map<RemoteTrack, HTMLMediaElement>();
  const attach = (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio || elements.has(track)) return;
    const element = track.attach(); element.style.display = "none";
    document.body.appendChild(element); elements.set(track, element);
  };
  const detach = (track: RemoteTrack) => { const element = elements.get(track); if (element) { track.detach(element); element.remove(); elements.delete(track); } };
  room.on(RoomEvent.TrackSubscribed, attach).on(RoomEvent.TrackUnsubscribed, detach);
  return () => { room.off(RoomEvent.TrackSubscribed, attach).off(RoomEvent.TrackUnsubscribed, detach); for (const track of elements.keys()) detach(track); };
}
