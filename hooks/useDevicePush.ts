import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { supportsPush, syncDevicePush } from "@/services/devicePush";
import type { NotificationResponse } from "expo-notifications";

export function useDevicePush(userId?: string) {
  const router = useRouter();
  useEffect(() => {
    if (!supportsPush || !userId) return;
    let active = true;
    const subscriptions: { remove(): void }[] = [];
    const report = () =>
      console.warn("Device notifications could not be registered.");
    const open = (response: NotificationResponse | null) => {
      if (!active || !response) return;
      const data = response.notification.request.content.data;
      if (!data || data.userId !== userId) return;
      if (data.service === "FINDLOVE") {
        router.push(
          data.conversationId ? "/love/(tabs)/messages" : "/love/notifications",
        );
      } else if (typeof data.conversationId === "string") {
        router.push({
          pathname: "/chat/[id]",
          params: { id: data.conversationId },
        });
      } else router.push("/notifications");
    };
    void import("expo-notifications")
      .then((n) => {
        if (!active) return;
        n.setNotificationHandler({
          handleNotification: async (notification) => ({
            shouldShowBanner: notification.request.content.data?.type === "incoming_call",
            shouldShowList: notification.request.content.data?.type === "incoming_call",
            shouldPlaySound: notification.request.content.data?.type === "incoming_call",
            shouldSetBadge: false,
          }),
        });
        let lastId: string | undefined;
        const handle = (response: NotificationResponse | null) => {
          if (!response || lastId === response.notification.request.identifier)
            return;
          if (response.notification.request.content.data?.type === "incoming_call") return;
          lastId = response.notification.request.identifier;
          open(response);
          n.clearLastNotificationResponse();
        };
        subscriptions.push(n.addNotificationResponseReceivedListener(handle));
        handle(n.getLastNotificationResponse());
        const sync = (
          ask: boolean,
          token?: import("expo-notifications").DevicePushToken,
        ) => void syncDevicePush(() => active, ask, token).catch(report);
        subscriptions.push(
          n.addPushTokenListener((token) => sync(false, token)),
        );
        subscriptions.push(
          AppState.addEventListener("change", (state) => {
            if (state === "active") sync(false);
          }),
        );
        sync(true);
      })
      .catch(report);
    return () => {
      active = false;
      subscriptions.forEach((s) => s.remove());
    };
  }, [userId, router]);
}
