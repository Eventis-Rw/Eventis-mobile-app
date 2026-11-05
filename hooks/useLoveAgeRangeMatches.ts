import { useCallback, useEffect, useState } from "react";

import { fetchLoveProfileIdsInAgeRange } from "@/services/findLoveService";
import { describeError } from "@/services/organiserService";
import type { LoveAgeRange } from "@/utils/findLoveAgeRange";

interface AgeRangeMatches {
  /** Ids of members in the range; null for any age, or before the first answer. */
  ids: Set<string> | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Asks the server who is in the age range (the phone never sees ages). Runs
 * again when the range or country changes, or on retry. Undefined = any age.
 */
export function useLoveAgeRangeMatches(country: string | undefined, range: LoveAgeRange | undefined): AgeRangeMatches {
  const min = range?.min;
  const max = range?.max;
  const key = min === undefined || max === undefined ? "" : `${country ?? ""}:${min}-${max}`;
  const [state, setState] = useState<{ key: string; ids: Set<string> | null; loading: boolean; error: string | null }>({
    key: "",
    ids: null,
    loading: false,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (min === undefined || max === undefined) {
      setState({ key: "", ids: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    // Results for another range would show the wrong people, so they're dropped;
    // a retry of the same range keeps what's on screen meanwhile.
    setState((current) => ({ key, ids: current.key === key ? current.ids : null, loading: true, error: null }));
    fetchLoveProfileIdsInAgeRange(country, { min, max }).then(
      (ids) => {
        if (!cancelled) setState({ key, ids, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) {
          setState((current) => ({ ...current, loading: false, error: describeError(err, "We couldn't search by age. Pull to try again.") }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [country, key, min, max, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ids: state.ids, loading: state.loading, error: state.error, retry };
}
