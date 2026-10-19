import { Redirect } from "expo-router";
import React from "react";

import { useAuth } from "@/context/AuthContext";

/** Keep existing welcome links working without showing the retired intro page. */
export default function WelcomeScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/auth/login"} />;
}
