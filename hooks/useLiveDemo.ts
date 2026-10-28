import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { createLiveState, readLiveState, reduceLive, refreshLiveSamples, tickLiveState, type LiveAction, type LivePerson, type LiveState } from "@/services/liveState";

/** Mounted inside an account-keyed screen. Writes are serialized and committed only after storage succeeds. */
export function useLiveDemo(accountId: string) {
  const key = `@eventis_live_demo_v1:${accountId}`;
  const current = useRef<LiveState | null>(null);
  const pending = useRef(Promise.resolve());
  const alive = useRef(false);
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false; alive.current = true;
    setLoading(true); setError(null);
    void AsyncStorage.getItem(key).then(async raw => {
      if (cancelled) return;
      const reopenedAt = Date.now();
      const saved = refreshLiveSamples(readLiveState(raw, reopenedAt), reopenedAt);
      // A reload disconnects the local viewer; hosting can be resumed until its wall-clock expiry.
      saved.rooms = saved.rooms.map(room => ({ ...room, audience: room.audience.filter(p => p.id !== accountId), guests: room.guests.filter(p => p.id !== accountId), requests: room.requests.filter(p => p.id !== accountId), invitations: room.invitations.filter(p => p.id !== accountId) }));
      await AsyncStorage.setItem(key, JSON.stringify(saved));
      if (!cancelled) { current.current = saved; setState(saved); setNow(reopenedAt); }
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Live could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const timer = setInterval(() => { if (!cancelled) setNow(Date.now()); }, 1000);
    let backgrounded = false;
    const appState = AppState.addEventListener("change", next => {
      if (next === "background") backgrounded = true;
      if (next !== "active" || !backgrounded) return;
      backgrounded = false;
      const refresh = pending.current.then(async () => {
        if (cancelled || !current.current) return;
        const reopenedAt = Date.now();
        const saved = refreshLiveSamples(current.current, reopenedAt);
        await AsyncStorage.setItem(key, JSON.stringify(saved));
        if (!cancelled) { current.current = saved; setState(saved); setNow(reopenedAt); }
      });
      pending.current = refresh.catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Demo previews could not be refreshed."); });
    });
    return () => { cancelled = true; alive.current = false; clearInterval(timer); appState.remove(); };
  }, [key, accountId, reload]);
  const act = (actor: LivePerson, action: LiveAction): Promise<LiveState> => {
    const result = pending.current.then(async () => {
      if (!alive.current || !current.current) throw new Error("Live is still loading. Try again.");
      const next = reduceLive(current.current, actor, action);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (alive.current) { current.current = next; setState(next); }
      return next;
    });
    pending.current = result.then(() => {}, () => {});
    return result;
  };
  const reset = () => {
    const result = pending.current.then(async () => {
      const next = createLiveState();
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (alive.current) { current.current = next; setState(next); setError(null); }
    });
    pending.current = result.then(() => {}, () => {});
    return result;
  };
  return { state: state ? tickLiveState(state, now) : null, now, loading, error, act, reset, retry: () => setReload(n => n + 1) };
}
