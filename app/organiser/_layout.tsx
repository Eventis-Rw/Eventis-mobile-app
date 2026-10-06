import { Stack } from "expo-router";
import React from "react";

// Become an Organiser: About -> Subscription -> Organisation setup.
export default function OrganiserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="subscribe" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}
