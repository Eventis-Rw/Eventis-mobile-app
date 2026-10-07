import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useAuth, type User } from "@/context/AuthContext";

/**
 * intro  – regular user, show what organiser access is and the subscription.
 * setup  – subscription is active but the organisation hasn't been set up yet.
 * ready  – organiser access granted.
 */
export type OrganiserStep = "intro" | "setup" | "ready";

export function getOrganiserStep(user: User | null): OrganiserStep {
  if (user?.isBusinessAccount) return "ready";
  if (user?.organiserSubscription?.status === "active") return "setup";
  return "intro";
}

/** Single place that decides where "Create Post" and "Become an organiser" lead. */
export function useOrganiserAccess() {
  const { user } = useAuth();
  const router = useRouter();
  const step = getOrganiserStep(user);

  const openOrganiserFlow = useCallback(
    (from?: "create-post") => {
      if (step === "ready") {
        router.push("/business/dashboard" as any);
        return;
      }
      router.push({
        pathname: (step === "setup" ? "/organiser/setup" : "/organiser") as any,
        params: from ? { from } : {},
      });
    },
    [router, step],
  );

  // Non-organisers are sent into onboarding instead of the create screen.
  const openCreatePost = useCallback(() => {
    if (step === "ready") router.push("/business/create-event" as any);
    else openOrganiserFlow("create-post");
  }, [router, step, openOrganiserFlow]);

  return { step, hasOrganiserAccess: step === "ready", openOrganiserFlow, openCreatePost };
}
