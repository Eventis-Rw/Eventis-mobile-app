import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { LoveConnectionStatus, LoveProfile } from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfileState } from "@/context/MyLoveProfileContext";
import { describeError } from "@/services/organiserService";
import {
  cancelLoveConnection,
  fetchLoveProfiles,
  MembershipRequiredError,
  requestLoveConnection,
  respondToLoveConnection,
} from "@/services/findLoveService";
import { inCountry } from "@/utils/findLoveDiscovery";

/** "upgrade_required": the server says this connection needs a Private membership. */
export type LoveConnectResult = "sent" | "upgrade_required" | "failed";

interface LoveProfilesContextValue {
  profiles: LoveProfile[];
  isLoading: boolean;
  error: string | null;
  /** Starts the first load. Safe to call repeatedly. */
  ensureLoaded: () => void;
  refreshProfiles: () => Promise<void>;
  getProfileById: (id: string) => LoveProfile | undefined;
  getConnectionStatus: (id: string) => LoveConnectionStatus;
  /** `message` is the one note allowed with a request. To someone who asked first, this accepts. */
  sendConnectionRequest: (id: string, message?: string) => Promise<LoveConnectResult>;
  /** Accept or decline a request this member received. False if it failed (error is set). */
  respondToRequest: (id: string, accept: boolean) => Promise<boolean>;
  /** Withdraw a request this member sent. False if it failed (error is set). */
  cancelRequest: (id: string) => Promise<boolean>;
}

const LoveProfilesContext = createContext<LoveProfilesContextValue | null>(null);

export function LoveProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Members only discover people from the country on their FindLove profile.
  const country = useMyLoveProfileState().myProfile?.country;
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
      setProfiles(await fetchLoveProfiles(country));
    } catch (err) {
      setError(describeError(err, "FindLove could not be reached. Pull to try again."));
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  // A new country means a different list; reload if one was already shown.
  useEffect(() => {
    if (loadStarted.current) void refreshProfiles();
  }, [refreshProfiles]);

  // Nothing loads at app start; the first FindLove screen to open triggers it.
  const ensureLoaded = useCallback(() => {
    if (!loadStarted.current) void refreshProfiles();
  }, [refreshProfiles]);

  const visibleProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          // Public and Private members are both discoverable; membership only limits connecting.
          profile.active &&
          profile.eligible &&
          profile.userId !== user?.id &&
          inCountry(profile, country),
      ),
    [profiles, user?.id, country],
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

  const sendConnectionRequest = useCallback(async (id: string, message?: string): Promise<LoveConnectResult> => {
    setError(null);
    const before = profiles.find((profile) => profile.id === id)?.connectionStatus ?? "none";
    setStatus(id, before === "received" ? "connected" : "pending");
    try {
      setStatus(id, await requestLoveConnection(id, user?.id, message));
      return "sent";
    } catch (err) {
      setStatus(id, before);
      if (err instanceof MembershipRequiredError) return "upgrade_required";
      setError(describeError(err, "Your request was not sent. Please try again."));
      return "failed";
    }
  }, [profiles, setStatus, user?.id]);

  // Not optimistic: the request leaves its list only once the server agrees.
  const respondToRequest = useCallback(async (id: string, accept: boolean) => {
    setError(null);
    try {
      setStatus(id, await respondToLoveConnection(id, accept));
      return true;
    } catch (err) {
      setError(describeError(err, accept ? "We couldn't accept this request. Please try again." : "We couldn't decline this request. Please try again."));
      return false;
    }
  }, [setStatus]);

  const cancelRequest = useCallback(async (id: string) => {
    setError(null);
    try {
      await cancelLoveConnection(id);
      setStatus(id, "none");
      return true;
    } catch (err) {
      setError(describeError(err, "We couldn't cancel this request. Please try again."));
      // It may have been accepted meanwhile; show what the server has now.
      void refreshProfiles();
      return false;
    }
  }, [refreshProfiles, setStatus]);

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
      respondToRequest,
      cancelRequest,
    }),
    [
      visibleProfiles,
      isLoading,
      error,
      ensureLoaded,
      refreshProfiles,
      getProfileById,
      getConnectionStatus,
      sendConnectionRequest,
      respondToRequest,
      cancelRequest,
    ],
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
