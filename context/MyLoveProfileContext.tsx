import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { MyLoveProfile, MyLoveProfileInput } from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { describeError } from "@/services/organiserService";
import { fetchMyLoveProfile, saveMyLoveProfile } from "@/services/findLoveService";

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
}

const MyLoveProfileContext = createContext<MyLoveProfileContextValue | null>(null);

export function MyLoveProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [myProfile, setMyProfile] = useState<MyLoveProfile | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // A different account must never see the previous one's profile.
  useEffect(() => {
    if (loadedFor.current && loadedFor.current !== userId) {
      loadedFor.current = null;
      setMyProfile(null);
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
      setMyProfile(await fetchMyLoveProfile(userId));
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

  const value = useMemo(
    () => ({ myProfile, status, error, ensureLoaded, reload, save }),
    [myProfile, status, error, ensureLoaded, reload, save],
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
