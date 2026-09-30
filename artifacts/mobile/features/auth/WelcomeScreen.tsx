import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

const { width, height } = Dimensions.get("window");

const FEATURES = [
  { icon: "location-outline", text: "Discover events near you" },
  { icon: "ticket-outline", text: "Instant digital tickets" },
  { icon: "chatbubbles-outline", text: "Connect with attendees" },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)" as any);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View className="flex-1 bg-[#0c0c1a]">
      <ImageBackground
        source={require("../../assets/images/banner-concert.png")}
        className="absolute inset-0"
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(12,12,26,0.3)", "rgba(12,12,26,0.65)", "rgba(12,12,26,0.97)"]}
          className="absolute inset-0"
        />
      </ImageBackground>

      <View
        className="flex-1 justify-end gap-6 px-6"
        style={{ paddingBottom: insets.bottom + 24, paddingTop: insets.top + 20 }}
      >
        {/* Logo */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeIn.delay(100) : undefined}
          className="mb-2 items-center gap-2.5"
        >
          <Animated.View
            className="h-16 w-16 items-center justify-center rounded-full bg-primary"
            style={pulseStyle}
          >
            <Ionicons name="musical-notes" size={28} color="#fff" />
          </Animated.View>
          <Text className="font-bold text-[36px] tracking-[-1px] text-white">
            eventis
          </Text>
          <Text className="font-sans text-[15px] text-white/60">
            Where moments happen
          </Text>
        </Animated.View>

        {/* Features */}
        <View className="gap-2.5">
          {FEATURES.map((feat, i) => (
            <Animated.View
              key={feat.icon}
              entering={Platform.OS !== "web" ? FadeInDown.delay(200 + i * 100).springify() : undefined}
              className="flex-row items-center gap-3.5 rounded-[14px] border border-white/12 bg-white/8 p-3.5"
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-primary">
                <Ionicons name={feat.icon as any} size={18} color="#fff" />
              </View>
              <Text className="font-sans text-[15px] text-white">{feat.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA Buttons */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(600).springify() : undefined}
          className="gap-3"
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-[18px]"
            onPress={() => router.replace("/(tabs)" as any)}
          >
            <Text className="font-bold text-[17px] text-primary-foreground">
              Explore Events
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          <Pressable
            className="items-center justify-center rounded-2xl border border-white/30 py-4"
            onPress={() => router.push("/auth/register" as any)}
          >
            <Text className="font-semibold text-[17px] text-white">
              Sign In / Register
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={Platform.OS !== "web" ? FadeIn.delay(800) : undefined}
          className="text-center font-sans text-xs leading-[18px] text-white/40"
        >
          By continuing, you agree to our{" "}
          <Text className="text-white/70">Terms</Text> &{" "}
          <Text className="text-white/70">Privacy Policy</Text>
        </Animated.Text>
      </View>
    </View>
  );
}
