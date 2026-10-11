import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  describeProfileError,
  fetchSavedOrganisers,
  PROFILE_FEATURES,
  removeSavedOrganiser,
  saveOrganiser,
  type SavedOrganiser,
} from "@/services/profileService";

/**
 * The signed-in user's saved organisers. This is a private bookmark list, not a
 * follow: organisers never see who saved them and there are no counts.
 *
 * Reloads whenever the screen regains focus, so saving on an event page shows
 * up on the profile without a shared store. Toggles are optimistic and roll
 * back if the save fails.
 */
export function useSavedOrganisers({ active = true }: { active?: boolean } = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = active && !!userId && PROFILE_FEATURES.savedOrganisers;

  const [organisers, setOrganisers] = useState<SavedOrganiser[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setOrganisers([]);
      setIsLoading(false);
      return;
    }
    // Only the first load shows a spinner; focus reloads update in place.
    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      setOrganisers(await fetchSavedOrganisers(userId));
      hasLoaded.current = true;
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your saved organisers."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const isSaved = useCallback((id: string) => organisers.some((o) => o.id === id), [organisers]);

  /** Saves or removes an organiser. Resolves to an error message, or null on success. */
  const toggle = useCallback(
    async (organiser: Omit<SavedOrganiser, "savedAt">): Promise<string | null> => {
      if (!userId || !enabled) return "Sign in to save organisers.";
      const previousEntry = organisers.find((o) => o.id === organiser.id);
      const wasSaved = !!previousEntry;

      setPendingIds((ids) => [...ids, organiser.id]);
      setOrganisers((list) =>
        wasSaved
          ? list.filter((o) => o.id !== organiser.id)
          : [{ ...organiser, savedAt: new Date().toISOString() }, ...list],
      );
      try {
        if (wasSaved) {
          await removeSavedOrganiser(userId, organiser.id);
        } else {
          const saved = await saveOrganiser(userId, organiser);
          setOrganisers((list) => list.map((o) => (o.id === saved.id ? saved : o)));
        }
        return null;
      } catch (err) {
        // Roll back only this organiser so other toggles in flight aren't undone.
        setOrganisers((list) =>
          wasSaved
            ? list.some((o) => o.id === organiser.id)
              ? list
              : [previousEntry!, ...list]
            : list.filter((o) => o.id !== organiser.id),
        );
        return describeProfileError(
          err,
          wasSaved ? "We couldn't remove this organiser." : "We couldn't save this organiser.",
        );
      } finally {
        setPendingIds((ids) => ids.filter((id) => id !== organiser.id));
      }
    },
    [userId, enabled, organisers],
  );

  return {
    enabled,
    organisers,
    isLoading,
    error,
    refresh,
    isSaved,
    isPending: (id: string) => pendingIds.includes(id),
    toggle,
  };
}
