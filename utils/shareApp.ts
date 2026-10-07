import * as Clipboard from "expo-clipboard";
import { Platform, Share } from "react-native";

export const APP_SHARE_URL = "https://eventis.app";
export const APP_SHARE_MESSAGE =
  "Find concerts, nightlife, and events near you on Eventis.";

export async function shareApp(): Promise<"shared" | "copied" | "dismissed"> {
  const message = `${APP_SHARE_MESSAGE} ${APP_SHARE_URL}`;
  try {
    const result = await Share.share(
      Platform.OS === "ios"
        ? { message: APP_SHARE_MESSAGE, url: APP_SHARE_URL }
        : { title: "Eventis", message },
    );
    if (result.action === Share.dismissedAction) return "dismissed";
    return "shared";
  } catch {
    await Clipboard.setStringAsync(message);
    return "copied";
  }
}
