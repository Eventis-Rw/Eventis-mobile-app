import { Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();
  // The root auth guard owns the transition. Never remount an empty login
  // form while it replaces this navigator after successful authentication.
  if (isLoading || isAuthenticated) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} accessibilityLabel={isAuthenticated ? "Opening Home" : "Loading account"} />
    </View>;
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="welcome" options={{ animation: "none" }} />
      <Stack.Screen name="terms" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
