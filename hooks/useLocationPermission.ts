import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

// "Not now" on our explainer counts as a denial, so the prompt never comes back on its own.
const DECLINED_KEY = "@eventis_location_declined";

export type LocationPermissionStatus = "checking" | "undetermined" | "granted" | "denied";

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>("checking");
  // Whether the OS will still show its dialog; once it won't, only Settings can grant access.
  const [canAskAgain, setCanAskAgain] = useState(true);

  const check = useCallback(async () => {
    try {
      const [permission, declined] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        AsyncStorage.getItem(DECLINED_KEY),
      ]);
      setCanAskAgain(permission.canAskAgain);
      if (permission.granted) setStatus("granted");
      else if (permission.status === "denied" || declined) setStatus("denied");
      else setStatus("undetermined");
    } catch {
      // Location is an enhancement; if it can't be checked the page falls back to All Events.
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    check();
    // Picks up access the user turned on in Settings while the app was in the background.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  const request = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(permission.canAskAgain);
      if (permission.granted) {
        setStatus("granted");
        return true;
      }
    } catch {}
    setStatus("denied");
    AsyncStorage.setItem(DECLINED_KEY, "1").catch(() => {});
    return false;
  }, []);

  const decline = useCallback(() => {
    setStatus("denied");
    AsyncStorage.setItem(DECLINED_KEY, "1").catch(() => {});
  }, []);

  return { status, canAskAgain, request, decline };
}
