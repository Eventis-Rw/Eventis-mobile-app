import Constants, { ExecutionEnvironment } from "expo-constants";
import type { Room } from "livekit-client";

let registered = false;
export function mediaUnavailableReason(): string | null {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? "Real streaming needs an Eventis development build. Expo Go can still run the local Live demo."
    : null;
}
export async function prepareLiveMedia() {
  const unavailable = mediaUnavailableReason();
  if (unavailable) throw new Error(unavailable);
  const sdk = require("@livekit/react-native") as typeof import("@livekit/react-native");
  if (!registered) { sdk.registerGlobals(); registered = true; }
  await sdk.AudioSession.startAudioSession();
}
export async function stopLiveMedia() {
  if (!registered) return;
  const { AudioSession } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  await AudioSession.stopAudioSession();
}
export function attachRoomAudio(_room: Room) { return () => {}; }
