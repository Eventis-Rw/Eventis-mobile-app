import { Stack } from "expo-router";
import React from "react";

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="register" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-event" />
    </Stack>
  );
}
