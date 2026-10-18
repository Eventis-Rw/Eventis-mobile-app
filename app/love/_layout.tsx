import { Redirect, Stack } from "expo-router";
import React from "react";

import { useColors } from "@/hooks/useColors";
import { FIND_LOVE_ENABLED } from "@/services/findLoveService";

// Every /love/* screen goes through here, so links cannot open FindLove while it is switched off.
export default function LoveLayout() {
  const colors = useColors();

  if (!FIND_LOVE_ENABLED) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="wallet" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="membership" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
