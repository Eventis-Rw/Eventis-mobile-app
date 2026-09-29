import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_bottom" }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
    </Stack>
  );
}
