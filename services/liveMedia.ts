import Constants, { ExecutionEnvironment } from "expo-constants";
import { NativeModules, Platform } from "react-native";
import type { Room } from "livekit-client";

let registered = false;
export function mediaUnavailableReason(): string | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return "Expo Go does not include Eventis's native WebRTC calling module. Install the Eventis development build to make voice and video calls.";
  }
  if (Platform.OS !== "web" && NativeModules.WebRTCModule == null) {
    return "This Eventis build is missing its native WebRTC module. Install the Eventis development or release APK; Expo Go cannot make in-app calls.";
  }
  return null;
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
