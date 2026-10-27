import { Redirect, Stack, useSegments } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

export default function BusinessLayout() {
  const { user, isLoading } = useAuth();
  const palette = useOrganiserPalette();
  const step = getOrganiserStep(user);
  const segments = useSegments() as string[];
  // Someone who paid for a post can publish it without setting up an organisation.
  const quickPost = step === "setup" && (user?.organiserSubscription?.postsRemaining ?? 0) > 0;

  // Don't render (or redirect away from) organiser screens until we know who's signed in.
  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.accent} accessibilityLabel="Loading organiser portal" />
      </View>
    );
  }

  // Organiser-only area: the portal and its create/manage screens. Everyone
  // else, including deep links, goes through the Become an Organiser flow.
  if (quickPost && segments.includes("create-event")) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="create-event" />
      </Stack>
    );
  }
  if (step !== "ready") {
    return (
      <Redirect
        href={{
          pathname: "/organiser" as any,
          params: { from: "create-post" },
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(portal)" />
      <Stack.Screen name="create-event" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="create-story" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="edit-organisation" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
