import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { BookingsProvider } from "@/context/BookingsContext";
import { EventsProvider } from "@/context/EventsContext";
import { FindLoveDemoProvider } from "@/context/FindLoveDemoContext";
import { LoveProfilesProvider } from "@/context/LoveProfilesContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "auth";
    const inSplash =
      !segments[0] ||
      (segments[0] as string) === "presentation-splash" ||
      (segments[0] as string) === "onboarding";

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)" as any);
    } else if (!isAuthenticated && !inAuthGroup && !inSplash) {
      router.replace("/onboarding" as any);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="presentation-splash" options={{ gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="event/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="love/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="love/connections" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="love/wallet" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="love/chat/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="booking/[id]"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="business" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthProvider>
                  <EventsProvider>
                    <LoveProfilesProvider>
                      <FindLoveDemoProvider>
                        <BookingsProvider>
                          <RootLayoutNav />
                        </BookingsProvider>
                      </FindLoveDemoProvider>
                    </LoveProfilesProvider>
                  </EventsProvider>
                </AuthProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
