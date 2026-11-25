import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import {
  registerPushToken,
  removePushToken,
} from "@/services/notificationService";
import { getSessionGeneration, getToken } from "@/utils/apiClient";

const STORAGE_KEY = "eventis_device_push_token";
export const supportsPush =
  (Platform.OS === "ios" || Platform.OS === "android") &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let revision = 0;
let pendingWrite: Promise<void> = Promise.resolve();

export async function syncDevicePush(
  isCurrent: () => boolean,
  askPermission: boolean,
  devicePushToken?: import("expo-notifications").DevicePushToken,
) {
  const start = revision;
  const generation = getSessionGeneration();
  const active = () =>
    isCurrent() && revision === start && generation === getSessionGeneration();
  const authToken = await getToken();
  if (
    !supportsPush ||
    !authToken ||
    authToken.startsWith("demo_token_") ||
    !active()
  )
    return;

  const notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("eventis", {
      name: "Eventis notifications",
      importance: notifications.AndroidImportance.HIGH,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PRIVATE,
      sound: "default",
    });
    await notifications.setNotificationChannelAsync("calls", {
      name: "Calls",
      importance: notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  let permission = await notifications.getPermissionsAsync();
  if (permission.status === "undetermined" && askPermission && active()) {
    permission = await notifications.requestPermissionsAsync();
  }
  if (!active()) return;
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  const token = permission.granted
    ? (
        await notifications.getExpoPushTokenAsync({
          projectId,
          devicePushToken,
        })
      ).data
    : null;

  // Only serialize the account writes. Signing out can proceed while Android or
  // iOS is showing the permission prompt or waiting for a provider token.
  pendingWrite = pendingWrite
    .catch(() => {})
    .then(async () => {
      if (!active()) return;
      const previous = await AsyncStorage.getItem(STORAGE_KEY);
      if (previous && previous !== token) await forgetDeviceToken(previous);
      if (!token || !active()) return;
      await AsyncStorage.setItem(STORAGE_KEY, token);
      await registerPushToken(
        token,
        Platform.OS === "android" ? "ANDROID" : "IOS",
      );
    });
  await pendingWrite;
}

async function forgetDeviceToken(token: string) {
  await removePushToken(token);
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function unregisterDevicePush() {
  revision++;
  await pendingWrite.catch(() => {});
  const token = await AsyncStorage.getItem(STORAGE_KEY);
  if (token) await forgetDeviceToken(token);
}
