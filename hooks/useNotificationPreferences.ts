import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  describeProfileError,
  fetchNotificationPreferences,
  PROFILE_FEATURES,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/services/profileService";

export type NotificationKey = keyof NotificationPreferences;

/**
 * Notification toggles that save as soon as they change. Each toggle flips
 * immediately, then rolls back with an error message if the save fails.
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = !!userId && PROFILE_FEATURES.notificationPreferences;

  const [preferences, setPreferences] = useState<NotificationPreferences | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState<NotificationKey[]>([]);
  // Latest confirmed values, so overlapping saves roll back to the right state.
  const confirmed = useRef<NotificationPreferences | undefined>(undefined);

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const next = await fetchNotificationPreferences(userId);
      confirmed.current = next;
      setPreferences(next);
    } catch (err) {
      setLoadError(describeProfileError(err, "We couldn't load your notification settings."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (key: NotificationKey, value: boolean) => {
      if (!userId || !preferences) return;
      setSaveError(null);
      setPreferences((p) => p && { ...p, [key]: value });
      setPending((keys) => [...keys, key]);
      try {
        const saved = await updateNotificationPreferences(userId, { [key]: value });
        confirmed.current = { ...confirmed.current!, [key]: saved[key] };
      } catch (err) {
        const previous = confirmed.current?.[key] ?? !value;
        setPreferences((p) => p && { ...p, [key]: previous });
        setSaveError(describeProfileError(err, "We couldn't save that change. Please try again."));
      } finally {
        setPending((keys) => keys.filter((k) => k !== key));
      }
    },
    [userId, preferences],
  );

  return {
    enabled,
    preferences,
    isLoading,
    loadError,
    saveError,
    reload: load,
    toggle,
    isPending: (key: NotificationKey) => pending.includes(key),
  };
}
