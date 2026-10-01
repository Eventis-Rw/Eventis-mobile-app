import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { LoveProfile } from "@/constants/loveProfiles";
import { useLoveProfiles } from "@/context/LoveProfilesContext";

export type LoveActivityType = "connection" | "request" | "gift" | "purchase" | "message";

export interface LoveActivity {
  id: string;
  type: LoveActivityType;
  title: string;
  description: string;
  createdAt: string;
}

interface FindLoveDemoContextValue {
  tokenBalance: number;
  connections: LoveProfile[];
  pendingProfiles: LoveProfile[];
  activity: LoveActivity[];
  purchaseTokens: (amount: number, priceLabel: string) => void;
  sendGift: (profile: LoveProfile, amount: number) => boolean;
  recordMessage: (profile: LoveProfile) => void;
}

interface StoredDemoState {
  tokenBalance: number;
  activity: LoveActivity[];
}

const FindLoveDemoContext = createContext<FindLoveDemoContextValue | null>(null);
const DEMO_STATE_KEY = "@eventis_find_love_demo_v1";

const INITIAL_ACTIVITY: LoveActivity[] = [
  {
    id: "activity-connected-amara",
    type: "connection",
    title: "You connected with Amara",
    description: "You can now message each other and send gift tokens.",
    createdAt: "2h ago",
  },
  {
    id: "activity-gift-ethan",
    type: "gift",
    title: "Ethan sent you 20 tokens",
    description: "A little appreciation after the Kigali Jazz Night.",
    createdAt: "Yesterday",
  },
  {
    id: "activity-request-samuel",
    type: "request",
    title: "Connection request pending",
    description: "Samuel has not responded to your request yet.",
    createdAt: "2d ago",
  },
];

export function FindLoveDemoProvider({ children }: { children: React.ReactNode }) {
  const { profiles, getConnectionStatus } = useLoveProfiles();
  const [tokenBalance, setTokenBalance] = useState(120);
  const [activity, setActivity] = useState<LoveActivity[]>(INITIAL_ACTIVITY);

  useEffect(() => {
    AsyncStorage.getItem(DEMO_STATE_KEY)
      .then((stored) => {
        if (!stored) return;
        const state = JSON.parse(stored) as StoredDemoState;
        if (Number.isFinite(state.tokenBalance)) setTokenBalance(state.tokenBalance);
        if (Array.isArray(state.activity)) setActivity(state.activity);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((nextBalance: number, nextActivity: LoveActivity[]) => {
    void AsyncStorage.setItem(
      DEMO_STATE_KEY,
      JSON.stringify({ tokenBalance: nextBalance, activity: nextActivity } satisfies StoredDemoState),
    );
  }, []);

  const purchaseTokens = useCallback((amount: number, priceLabel: string) => {
    const nextBalance = tokenBalance + amount;
    const nextActivity: LoveActivity[] = [
      {
        id: "activity-" + Date.now(),
        type: "purchase",
        title: amount + " tokens added",
        description: "Demo purchase completed for " + priceLabel + ".",
        createdAt: "Just now",
      },
      ...activity,
    ];
    setTokenBalance(nextBalance);
    setActivity(nextActivity);
    persist(nextBalance, nextActivity);
  }, [activity, persist, tokenBalance]);

  const sendGift = useCallback((profile: LoveProfile, amount: number) => {
    if (amount <= 0 || tokenBalance < amount) return false;
    const nextBalance = tokenBalance - amount;
    const nextActivity: LoveActivity[] = [
      {
        id: "activity-" + Date.now(),
        type: "gift",
        title: "You sent " + amount + " tokens to " + profile.name,
        description: "Gift sent from your Find Love token balance.",
        createdAt: "Just now",
      },
      ...activity,
    ];
    setTokenBalance(nextBalance);
    setActivity(nextActivity);
    persist(nextBalance, nextActivity);
    return true;
  }, [activity, persist, tokenBalance]);

  const recordMessage = useCallback((profile: LoveProfile) => {
    const nextActivity: LoveActivity[] = [
      {
        id: "activity-" + Date.now(),
        type: "message",
        title: "You messaged " + profile.name,
        description: "Your demo conversation was updated.",
        createdAt: "Just now",
      },
      ...activity,
    ];
    setActivity(nextActivity);
    persist(tokenBalance, nextActivity);
  }, [activity, persist, tokenBalance]);

  const connections = useMemo(
    () => profiles.filter((profile) => getConnectionStatus(profile.id) === "connected"),
    [profiles, getConnectionStatus],
  );
  const pendingProfiles = useMemo(
    () => profiles.filter((profile) => getConnectionStatus(profile.id) === "pending"),
    [profiles, getConnectionStatus],
  );

  const value = useMemo(
    () => ({ tokenBalance, connections, pendingProfiles, activity, purchaseTokens, sendGift, recordMessage }),
    [tokenBalance, connections, pendingProfiles, activity, purchaseTokens, sendGift, recordMessage],
  );

  return <FindLoveDemoContext.Provider value={value}>{children}</FindLoveDemoContext.Provider>;
}

export function useFindLoveDemo() {
  const context = useContext(FindLoveDemoContext);
  if (!context) throw new Error("useFindLoveDemo must be used within FindLoveDemoProvider");
  return context;
}
