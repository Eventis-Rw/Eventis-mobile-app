import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  liveDirectoryApi,
  type LiveDirectory,
} from "@/services/liveDirectoryService";

export function useLiveDirectory() {
  const [directory, setDirectory] = useState<LiveDirectory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const next = await liveDirectoryApi.list();
      if (mounted.current) {
        setDirectory(next);
        setError("");
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Live couldn’t refresh.");
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 5000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      mounted.current = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  const now = Date.now();
  return {
    directory,
    rooms:
      directory?.rooms.filter(
        (r) => r.endsAt > now && r.availableUntil > now,
      ) ?? [],
    error,
    loading,
    refresh,
  };
}
