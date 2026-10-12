import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  describeProfileError,
  fetchDiscoveryPreferences,
  PROFILE_FEATURES,
  updateDiscoveryPreferences,
  type DiscoveryPreferences,
} from "@/services/profileService";

/** Preferred categories and location. Reloads on focus so Settings reflects edits. */
export function useDiscoveryPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = !!userId && PROFILE_FEATURES.discoveryPreferences;

  const [preferences, setPreferences] = useState<DiscoveryPreferences | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setIsLoading(false);
      return;
    }
    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      setPreferences(await fetchDiscoveryPreferences(userId));
      hasLoaded.current = true;
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your preferences."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Throws with a readable message if the save fails. */
  const save = useCallback(
    async (next: DiscoveryPreferences) => {
      if (!userId) throw new Error("Sign in to save preferences.");
      try {
        const saved = await updateDiscoveryPreferences(userId, next);
        setPreferences(saved);
        return saved;
      } catch (err) {
        throw new Error(describeProfileError(err, "We couldn't save your preferences."));
      }
    },
    [userId],
  );

  return { enabled, preferences, isLoading, error, reload: load, save };
}
