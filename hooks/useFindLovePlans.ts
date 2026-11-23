import { useCallback, useEffect, useState } from "react";
import {
  apiFetchInstallmentPlans,
  type ApiInstallmentPlan,
} from "@/services/findLoveApi";

export function useFindLovePlans(enabled: boolean) {
  const [plans, setPlans] = useState<ApiInstallmentPlan[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.all([
      apiFetchInstallmentPlans("public"),
      apiFetchInstallmentPlans("private"),
    ])
      .then((results) => {
        if (active) setPlans(results.flat());
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Membership prices could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, attempt]);
  return { plans, loading, error, retry };
}
