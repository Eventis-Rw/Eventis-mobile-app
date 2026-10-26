import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_LOVE_SETTINGS, normalizeLoveSettings, type LoveSettings } from "@/utils/findLoveSettings";

const settingsKey = (userId: string) => `@eventis_findlove_settings_v1_${userId}`;

/**
 * The member's FindLove settings, saved on this device per account. Reloads
 * whenever the screen comes into focus, so Me shows changes made in Settings.
 */
export function useLoveSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<LoveSettings>(DEFAULT_LOVE_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      AsyncStorage.getItem(settingsKey(userId))
        .then((stored) => {
          if (!cancelled) setSettings(normalizeLoveSettings(stored ? JSON.parse(stored) : null));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  const update = useCallback(
    (change: Partial<LoveSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...change };
        if (userId) void AsyncStorage.setItem(settingsKey(userId), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [userId],
  );

  return { settings, update };
}
