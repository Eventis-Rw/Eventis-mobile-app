import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export interface QuickReply {
  id: string;
  text: string;
}

const STORAGE_KEY = "@eventis_quick_replies";

/** Saved canned replies the composer's "Quick Reply" action can insert, kept on-device. */
export function useQuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setReplies(parsed);
      })
      .catch(() => {
        // Corrupt local cache; start with an empty list rather than crash.
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: QuickReply[]) => {
    setReplies(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist([...replies, { id: `qr-${Date.now()}`, text: trimmed }]);
    },
    [replies, persist],
  );

  const updateReply = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist(replies.map((reply) => (reply.id === id ? { ...reply, text: trimmed } : reply)));
    },
    [replies, persist],
  );

  const removeReply = useCallback(
    (id: string) => {
      persist(replies.filter((reply) => reply.id !== id));
    },
    [replies, persist],
  );

  return { replies, addReply, updateReply, removeReply };
}
