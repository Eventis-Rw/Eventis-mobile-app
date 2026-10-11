import { useCallback, useEffect, useState } from "react";

import type { Event } from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import { describeProfileError, fetchPublisherProfile, type PublisherProfile } from "@/services/profileService";
import {
  fetchPromotions,
  fetchPublisherAnalytics,
  requestPromotion,
  type Promotion,
  type PromotionRequest,
  type PublisherAnalytics,
} from "@/services/publisherService";

/** Contact, social, category and legal details shown on a publisher's Overview. */
export function usePublisherProfile(active: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<PublisherProfile | undefined>();
  const [isLoading, setIsLoading] = useState(active);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !active) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setProfile(await fetchPublisherProfile(userId));
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your profile details."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, active]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, isLoading, error, refresh };
}

/**
 * Business-only analytics and promotions. Loads when `active` (the Analytics
 * tab is open) so other tabs don't pay for it.
 */
export function usePublisherInsights(active: boolean, events: Event[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const [analytics, setAnalytics] = useState<PublisherAnalytics | undefined>();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics only depend on which events exist, not on every field change.
  const eventKey = events.map((e) => e.id).join(",");

  const refresh = useCallback(async () => {
    if (!userId || !active) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextAnalytics, nextPromotions] = await Promise.all([
        fetchPublisherAnalytics(userId, events),
        fetchPromotions(userId),
      ]);
      setAnalytics(nextAnalytics);
      setPromotions(nextPromotions);
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your analytics."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, active, eventKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(
    async (input: PromotionRequest) => {
      if (!userId) throw new Error("Sign in to request a promotion.");
      try {
        const promotion = await requestPromotion(userId, input);
        setPromotions((list) => [promotion, ...list]);
        return promotion;
      } catch (err) {
        throw new Error(describeProfileError(err, "We couldn't send your promotion request."));
      }
    },
    [userId],
  );

  return { analytics, promotions, isLoading, error, refresh, request };
}
