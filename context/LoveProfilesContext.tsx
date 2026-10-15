import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { LoveConnectionStatus, LoveProfile } from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { describeError } from "@/services/organiserService";
import { fetchLoveProfiles, requestLoveConnection } from "@/services/findLoveService";

interface LoveProfilesContextValue {
  profiles: LoveProfile[];
  isLoading: boolean;
  error: string | null;
  /** Starts the first load. Safe to call repeatedly. */
  ensureLoaded: () => void;
  refreshProfiles: () => Promise<void>;
  getProfileById: (id: string) => LoveProfile | undefined;
  getConnectionStatus: (id: string) => LoveConnectionStatus;
  sendConnectionRequest: (id: string) => Promise<void>;
}

const LoveProfilesContext = createContext<LoveProfilesContextValue | null>(null);

export function LoveProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<LoveProfile[]>([]);
  // True until the first load finishes, so screens show loading, not "unavailable".
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadStarted = useRef(false);

  const refreshProfiles = useCallback(async () => {
    loadStarted.current = true;
    setIsLoading(true);
    setError(null);
    try {
      setProfiles(await fetchLoveProfiles());
    } catch (err) {
      setError(describeError(err, "FindLove could not be reached. Pull to try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Nothing loads at app start; the first FindLove screen to open triggers it.
  const ensureLoaded = useCallback(() => {
    if (!loadStarted.current) void refreshProfiles();
  }, [refreshProfiles]);

  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.active && profile.eligible && profile.userId !== user?.id),
    [profiles, user?.id],
  );

  const getProfileById = useCallback(
    (id: string) => visibleProfiles.find((profile) => profile.id === id),
    [visibleProfiles],
  );

  const getConnectionStatus = useCallback(
    (id: string): LoveConnectionStatus => getProfileById(id)?.connectionStatus ?? "none",
    [getProfileById],
  );

  const setStatus = useCallback((id: string, status: LoveConnectionStatus) => {
    setProfiles((current) =>
      current.map((profile) => (profile.id === id ? { ...profile, connectionStatus: status } : profile)),
    );
  }, []);

  const sendConnectionRequest = useCallback(async (id: string) => {
    setError(null);
    setStatus(id, "pending");
    try {
      setStatus(id, await requestLoveConnection(id));
    } catch (err) {
      setStatus(id, "none");
      setError(describeError(err, "Your request was not sent. Please try again."));
    }
  }, [setStatus]);

  const value = useMemo(
    () => ({
      profiles: visibleProfiles,
      isLoading,
      error,
      ensureLoaded,
      refreshProfiles,
      getProfileById,
      getConnectionStatus,
      sendConnectionRequest,
    }),
    [visibleProfiles, isLoading, error, ensureLoaded, refreshProfiles, getProfileById, getConnectionStatus, sendConnectionRequest],
  );

  return <LoveProfilesContext.Provider value={value}>{children}</LoveProfilesContext.Provider>;
}

/** Profile state without triggering a load, for providers that derive from it. */
export function useLoveProfilesState() {
  const context = useContext(LoveProfilesContext);
  if (!context) throw new Error("useLoveProfiles must be used within LoveProfilesProvider");
  return context;
}

/** For FindLove screens: loads profiles the first time one of them opens. */
export function useLoveProfiles() {
  const context = useLoveProfilesState();
  const { ensureLoaded } = context;
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return context;
}
