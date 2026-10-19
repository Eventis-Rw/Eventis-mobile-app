import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { MyLoveProfile, MyLoveProfileInput } from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { describeError } from "@/services/organiserService";
import {
  buyPrivateMembership,
  fetchAgeVerification,
  fetchMyLoveProfile,
  resetDemoAgeVerification,
  saveMyLoveProfile,
  submitAgeVerification,
  type AgeVerificationInput,
  type LoveCheckoutResult,
  type LoveDemoOutcome,
  type LoveDemoVerificationOutcome,
  type LovePaymentMethod,
} from "@/services/findLoveService";
import { AGE_VERIFICATION_NOT_STARTED, type AgeVerification } from "@/utils/findLoveAgeVerification";
import { activeAccountType, type LoveAccountType } from "@/utils/findLoveMembership";

type Status = "idle" | "loading" | "ready" | "error";

interface MyLoveProfileContextValue {
  /** null once loaded means the member has not created a FindLove profile yet. */
  myProfile: MyLoveProfile | null;
  status: Status;
  error: string | null;
  /** Starts the first load. Safe to call repeatedly. */
  ensureLoaded: () => void;
  reload: () => Promise<void>;
  /** Creates or updates the profile. Throws so the form can show the error. */
  save: (input: MyLoveProfileInput) => Promise<MyLoveProfile>;
  /** What the member actually has now: Private only with an active, paid membership. */
  accountType: LoveAccountType;
  /** Pays for Private, then reloads the profile so the membership comes from the server. */
  buyPrivate: (
    input: { paymentMethod: LovePaymentMethod; payerPhone: string },
    demoOutcome?: LoveDemoOutcome,
  ) => Promise<LoveCheckoutResult>;
  /** The ID age check, as the server reports it. Comes first: no profile until "verified". */
  verification: AgeVerification;
  /** Sends the ID photos; resolves with the new status. Throws on network errors. */
  submitVerification: (input: AgeVerificationInput, demoOutcome?: LoveDemoVerificationOutcome) => Promise<AgeVerification>;
  /** Re-reads only the ID check status. */
  refreshVerification: () => Promise<void>;
  /** Demo only: start the ID check again. */
  resetDemoVerification: () => Promise<void>;
}

const MyLoveProfileContext = createContext<MyLoveProfileContextValue | null>(null);

export function MyLoveProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [myProfile, setMyProfile] = useState<MyLoveProfile | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<AgeVerification>(AGE_VERIFICATION_NOT_STARTED);
  const loadedFor = useRef<string | null>(null);

  // A different account must never see the previous one's profile.
  useEffect(() => {
    if (loadedFor.current && loadedFor.current !== userId) {
      loadedFor.current = null;
      setMyProfile(null);
      setVerification(AGE_VERIFICATION_NOT_STARTED);
      setStatus("idle");
      setError(null);
    }
  }, [userId]);

  const reload = useCallback(async () => {
    if (!userId) return;
    loadedFor.current = userId;
    setStatus("loading");
    setError(null);
    try {
      // The ID check belongs to the account and comes before the profile exists.
      const [profile, ageCheck] = await Promise.all([fetchMyLoveProfile(userId), fetchAgeVerification(userId)]);
      setVerification(ageCheck);
      setMyProfile(profile);
      setStatus("ready");
    } catch (err) {
      setError(describeError(err, "We couldn't load your FindLove profile. Please try again."));
      setStatus("error");
    }
  }, [userId]);

  const ensureLoaded = useCallback(() => {
    if (userId && loadedFor.current !== userId) void reload();
  }, [userId, reload]);

  const save = useCallback(
    async (input: MyLoveProfileInput) => {
      if (!userId) throw new Error("Sign in to create your FindLove profile.");
      const saved = await saveMyLoveProfile(userId, input, myProfile === null);
      setMyProfile(saved);
      setStatus("ready");
      return saved;
    },
    [userId, myProfile],
  );

  const buyPrivate = useCallback(
    async (input: { paymentMethod: LovePaymentMethod; payerPhone: string }, demoOutcome?: LoveDemoOutcome) => {
      if (!userId) throw new Error("Sign in to use FindLove.");
      const result = await buyPrivateMembership(userId, input, demoOutcome);
      if (result.status === "succeeded" || result.status === "pending") {
        try {
          setMyProfile(await fetchMyLoveProfile(userId));
        } catch {
          // The payment result stands; the next reload picks up the membership.
        }
      }
      return result;
    },
    [userId],
  );

  const submitVerification = useCallback(
    async (input: AgeVerificationInput, demoOutcome?: LoveDemoVerificationOutcome) => {
      if (!userId) throw new Error("Sign in to use FindLove.");
      const next = await submitAgeVerification(userId, input, demoOutcome);
      setVerification(next);
      return next;
    },
    [userId],
  );

  const refreshVerification = useCallback(async () => {
    if (!userId) return;
    setVerification(await fetchAgeVerification(userId));
  }, [userId]);

  const resetDemoVerification = useCallback(async () => {
    if (!userId) return;
    await resetDemoAgeVerification(userId);
    setVerification(await fetchAgeVerification(userId));
  }, [userId]);

  const accountType = activeAccountType(myProfile?.membership);

  const value = useMemo(
    () => ({
      myProfile,
      status,
      error,
      ensureLoaded,
      reload,
      save,
      accountType,
      buyPrivate,
      verification,
      submitVerification,
      refreshVerification,
      resetDemoVerification,
    }),
    [myProfile, status, error, ensureLoaded, reload, save, accountType, buyPrivate, verification, submitVerification, refreshVerification, resetDemoVerification],
  );

  return <MyLoveProfileContext.Provider value={value}>{children}</MyLoveProfileContext.Provider>;
}

/** For FindLove screens: loads the member's profile the first time one of them opens. */
export function useMyLoveProfile() {
  const context = useContext(MyLoveProfileContext);
  if (!context) throw new Error("useMyLoveProfile must be used within MyLoveProfileProvider");
  const { ensureLoaded } = context;
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return context;
}
