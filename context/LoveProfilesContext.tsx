import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  MOCK_LOVE_PROFILES,
  type LoveConnectionStatus,
  type LoveGender,
  type LoveProfile,
} from "@/constants/loveProfiles";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/apiClient";

interface LoveProfilesContextValue {
  profiles: LoveProfile[];
  isLoading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
  getProfileById: (id: string) => LoveProfile | undefined;
  getConnectionStatus: (id: string) => LoveConnectionStatus;
  sendConnectionRequest: (id: string) => Promise<void>;
}

const LoveProfilesContext = createContext<LoveProfilesContextValue | null>(null);
const PENDING_REQUESTS_KEY = "@eventis_love_pending_requests_v1";
const LOVE_PROFILES_TIMEOUT_MS = 5000;

function withTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    request,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Love Profiles request timed out")), timeoutMs);
    }),
  ]);
}

function normalizeGender(value: unknown): LoveGender {
  const gender = String(value ?? "").toLowerCase();
  if (["he", "man", "male"].includes(gender)) return "He";
  if (["she", "woman", "female"].includes(gender)) return "She";
  return "They";
}

function normalizeProfile(value: unknown): LoveProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = String(source.id ?? source.profileId ?? "");
  if (!id) return null;

  return {
    id,
    userId: String(source.userId ?? source.user_id ?? id),
    name: String(source.name ?? source.displayName ?? source.username ?? "Eventis member"),
    gender: normalizeGender(source.gender ?? source.pronoun),
    age: Number(source.age ?? 18),
    city: String(source.city ?? source.location ?? "Kigali"),
    occupation: String(source.occupation ?? source.jobTitle ?? "Eventis member"),
    bio: String(source.bio ?? source.about ?? "Looking to meet new people and share great experiences."),
    interests: Array.isArray(source.interests) ? source.interests.map(String) : [],
    imageUrl: String(source.imageUrl ?? source.profileImage ?? source.avatarUrl ?? ""),
    active: Boolean(source.active ?? source.isActive ?? true),
    eligible: Boolean(source.eligible ?? source.isEligible ?? true),
    verified: Boolean(source.verified ?? source.isVerified ?? false),
    connectionStatus:
      source.connectionStatus === "pending" || source.connectionStatus === "connected"
        ? source.connectionStatus
        : "none",
  };
}

function readProfilesResponse(value: unknown): LoveProfile[] {
  const source = value as { profiles?: unknown[] } | unknown[];
  const rows = Array.isArray(source) ? source : Array.isArray(source?.profiles) ? source.profiles : [];
  return rows.map(normalizeProfile).filter((profile): profile is LoveProfile => profile !== null);
}

export function LoveProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<LoveProfile[]>(MOCK_LOVE_PROFILES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, LoveConnectionStatus>>({});

  useEffect(() => {
    AsyncStorage.getItem(PENDING_REQUESTS_KEY)
      .then((stored) => {
        if (!stored) return;
        const ids = JSON.parse(stored) as string[];
        setConnectionStatuses(Object.fromEntries(ids.map((id) => [id, "pending"])));
      })
      .catch(() => {});
  }, []);

  const refreshProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await withTimeout(
        api.get<unknown>("/api/v1/love-profiles"),
        LOVE_PROFILES_TIMEOUT_MS,
      );
      setProfiles(readProfilesResponse(response));
    } catch {
      setProfiles(MOCK_LOVE_PROFILES);
      setError("Love Profiles could not be reached. Showing demo profiles for now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
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
    (id: string): LoveConnectionStatus =>
      connectionStatuses[id] ?? getProfileById(id)?.connectionStatus ?? "none",
    [connectionStatuses, getProfileById],
  );

  const sendConnectionRequest = useCallback(async (id: string) => {
    setConnectionStatuses((current) => {
      const next = { ...current, [id]: "pending" as const };
      const pendingIds = Object.entries(next)
        .filter(([, status]) => status === "pending")
        .map(([profileId]) => profileId);
      void AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(pendingIds));
      return next;
    });

    try {
      await api.post(`/api/v1/love-profiles/${id}/connections`);
    } catch {
      setError("Connection request saved on this device. It will sync when the service is available.");
    }
  }, []);

  const value = useMemo(
    () => ({
      profiles: visibleProfiles,
      isLoading,
      error,
      refreshProfiles,
      getProfileById,
      getConnectionStatus,
      sendConnectionRequest,
    }),
    [visibleProfiles, isLoading, error, refreshProfiles, getProfileById, getConnectionStatus, sendConnectionRequest],
  );

  return <LoveProfilesContext.Provider value={value}>{children}</LoveProfilesContext.Provider>;
}

export function useLoveProfiles() {
  const context = useContext(LoveProfilesContext);
  if (!context) throw new Error("useLoveProfiles must be used within LoveProfilesProvider");
  return context;
}
