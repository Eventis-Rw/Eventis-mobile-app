import { Redirect, Stack } from "expo-router";
import React from "react";

import { useAuth } from "@/context/AuthContext";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";

export default function BusinessLayout() {
  const { user, isLoading } = useAuth();
  const step = getOrganiserStep(user);

  // Organiser-only area: Create Post/Event and the dashboard. Everyone else,
  // including deep links, goes through the Become an Organiser flow.
  if (!isLoading && step !== "ready") {
    return (
      <Redirect
        href={{
          pathname: (step === "setup" ? "/organiser/setup" : "/organiser") as any,
          params: { from: "create-post" },
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="register" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-event" />
    </Stack>
  );
}
