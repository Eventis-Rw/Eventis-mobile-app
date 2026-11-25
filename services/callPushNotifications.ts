import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/utils/apiClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for "incoming call" push alerts and sends the token
 * to the backend. Best-effort: calls still ring live over the socket while
 * the app is foregrounded, this only reaches a backgrounded app.
 */
export async function registerForCallPushToken(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("calls", {
        name: "Calls",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    let settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) settings = await Notifications.requestPermissionsAsync();
    if (!settings.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!token) return;
    await api.post("/api/v1/me/push-tokens", {
      token,
      platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    });
  } catch {
    // Best-effort — calls still ring live while the app is foregrounded.
  }
}
