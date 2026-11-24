import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { FINDLOVE_ONBOARDING_KEY } from "./onboarding";
import { FindLoveSplash } from "@/components/love/FindLoveSplash";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";

/**
 * Entry router for /love:
 * 1. Plays the Twitter/X-style 2-second heart splash (Eventis Blue -> Pink squeeze & punch-through).
 * 2. In parallel, checks whether the user has completed onboarding and created a profile.
 * 3. Once the splash completes (or is tapped), seamlessly transitions to:
 *    - /love/onboarding (if first-time visitor or no profile yet)
 *    - /love/(tabs) (if profile exists and onboarding was seen)
 */
export default function LoveIndex() {
  const router = useRouter();
  const { myProfile, status } = useMyLoveProfile();
  const [resolvedDestination, setResolvedDestination] = useState<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const navigatedRef = useRef(false);

  // Resolve next screen in background while splash animation runs
  useEffect(() => {
    let mounted = true;

    const checkDestination = async () => {
      try {
        const seen = await AsyncStorage.getItem(FINDLOVE_ONBOARDING_KEY);
        if (!mounted) return;
        if (seen === "true" && myProfile) {
          setResolvedDestination("/love/(tabs)");
        } else {
          setResolvedDestination("/love/onboarding");
        }
      } catch {
        if (mounted) {
          setResolvedDestination(myProfile ? "/love/(tabs)" : "/love/onboarding");
        }
      }
    };

    if (status !== "loading") {
      void checkDestination();
    }

    return () => {
      mounted = false;
    };
  }, [myProfile, status]);

  // Navigate once splash is finished and destination is determined
  useEffect(() => {
    if (!splashDone || navigatedRef.current) return;

    // If destination is resolved, navigate; otherwise if profile check took longer than 2s,
    // determine safe default
    const destination =
      resolvedDestination || (status !== "loading" ? (myProfile ? "/love/(tabs)" : "/love/onboarding") : null);

    if (destination) {
      navigatedRef.current = true;
      router.replace(destination as any);
    }
  }, [splashDone, resolvedDestination, status, myProfile, router]);

  const handleSplashDone = () => {
    setSplashDone(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#070814" }}>
      <FindLoveSplash onDone={handleSplashDone} />
    </View>
  );
}
