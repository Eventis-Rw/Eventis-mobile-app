import { Redirect, Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getOrganiserStep } from "@/hooks/useOrganiserAccess";

export default function BusinessLayout() {
  const { user, isLoading } = useAuth();
  const colors = useColors();
  const step = getOrganiserStep(user);

  // Don't render (or redirect away from) organiser screens until we know who's signed in.
  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading organiser portal" />
      </View>
    );
  }

  // Organiser-only area: the portal and its create/manage screens. Everyone
  // else, including deep links, goes through the Become an Organiser flow.
  if (step !== "ready") {
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
      <Stack.Screen name="(portal)" />
      <Stack.Screen name="create-event" />
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
