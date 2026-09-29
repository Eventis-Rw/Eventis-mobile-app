import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";

const SPLASH_DURATION_MS = 1100;

export default function AppEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;

    async function openApp() {
      const [completed] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION_MS)),
      ]);

      if (mounted) {
        router.replace((completed === "true" ? "/(tabs)" : "/onboarding") as any);
      }
    }

    void openApp();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Eventis logo"
        />
        <Text style={styles.name}>eventis</Text>
        <Text style={styles.tagline}>Where moments happen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { alignItems: "center" },
  logo: { width: 132, height: 132 },
  name: {
    marginTop: 12,
    fontSize: 38,
    letterSpacing: -1.5,
    color: "#1932A6",
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    marginTop: 5,
    color: "#4F4F63",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
