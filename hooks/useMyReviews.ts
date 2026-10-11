import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  deleteReview,
  describeProfileError,
  fetchMyReviews,
  PROFILE_FEATURES,
  submitReview,
  type Review,
  type ReviewInput,
} from "@/services/profileService";

/** Reviews the signed-in customer has written, with submit and delete. */
export function useMyReviews({ active = true }: { active?: boolean } = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = active && !!userId && PROFILE_FEATURES.reviews;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setReviews([]);
      setIsLoading(false);
      return;
    }
    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      setReviews(await fetchMyReviews(userId));
      hasLoaded.current = true;
    } catch (err) {
      setError(describeProfileError(err, "We couldn't load your reviews."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  /** Creates or replaces the review for an event. Throws with a readable message on failure. */
  const submit = useCallback(
    async (input: ReviewInput) => {
      if (!userId) throw new Error("Sign in to review events.");
      try {
        const review = await submitReview(userId, input);
        setReviews((list) => [review, ...list.filter((r) => r.eventId !== review.eventId)]);
        return review;
      } catch (err) {
        throw new Error(describeProfileError(err, "We couldn't save your review."));
      }
    },
    [userId],
  );

  const remove = useCallback(
    async (reviewId: string) => {
      if (!userId) return;
      try {
        await deleteReview(userId, reviewId);
        setReviews((list) => list.filter((r) => r.id !== reviewId));
      } catch (err) {
        throw new Error(describeProfileError(err, "We couldn't delete this review."));
      }
    },
    [userId],
  );

  return { enabled, reviews, isLoading, error, refresh, submit, remove };
}
