import { Redirect, Stack } from "expo-router";
import React from "react";

import { LoveExitProvider } from "@/components/love/LoveHeader";
import { ColorScopeContext, useColors } from "@/hooks/useColors";
import { FIND_LOVE_ENABLED } from "@/services/findLoveService";

// Every /love/* screen goes through here, so links cannot open FindLove while it is switched off.
// FindLove runs as its own section on top of Eventis: own tabs, pink accent.
export default function LoveLayout() {
  if (!FIND_LOVE_ENABLED) return <Redirect href="/(tabs)" />;

  return (
    <ColorScopeContext.Provider value="love">
      <LoveExitProvider>
        <LoveStack />
      </LoveExitProvider>
    </ColorScopeContext.Provider>
  );
}

// Inside the provider so the screens' background picks up the FindLove palette.
function LoveStack() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="wallet" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="membership" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
