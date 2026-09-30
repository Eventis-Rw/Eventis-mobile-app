import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/constants/mockData";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EVENT_IMAGES: Record<string, number> = {
  concert: require("../assets/images/banner-concert.png"),
  tech: require("../assets/images/banner-tech.png"),
  food: require("../assets/images/banner-food.png"),
};

function getEventImage(image: string) {
  return EVENT_IMAGES[image] ?? EVENT_IMAGES["concert"];
}

interface EventCardProps {
  event: Event;
  variant?: "featured" | "standard" | "compact";
}

export function EventCard({ event, variant = "standard" }: EventCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { user, toggleSaveEvent } = useAuth();
  const scale = useSharedValue(1);
  const isSaved = user?.savedEvents.includes(event.id) ?? false;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    router.push(`/event/${event.id}`);
  }, [router, event.id]);

  const handleSave = useCallback(
    (e: any) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleSaveEvent(event.id);
    },
    [toggleSaveEvent, event.id]
  );

  const priceLabel =
    event.price === 0
      ? "Free"
      : `${event.currency === "GBP" ? "£" : "$"}${event.price}`;

  if (variant === "featured") {
    return (
      <AnimatedPressable
        className="mr-3.5 h-[200px] w-[300px] overflow-hidden rounded-2xl"
        style={animatedStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <ImageBackground
          source={getEventImage(event.image)}
          className="flex-1 justify-end"
          imageStyle={{ borderRadius: 20 }}
        >
          <View className="absolute inset-0 bg-overlay opacity-40 dark:bg-overlay-dark" />
          {event.isSponsored && (
            <View className="absolute left-3 top-3 rounded-md bg-accent px-2 py-[3px]">
              <Text className="font-semibold text-[11px] text-accent-foreground dark:text-accent-foreground-dark">
                Sponsored
              </Text>
            </View>
          )}
          <Pressable
            className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
            onPress={handleSave}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={isSaved ? colors.primary : colors.foreground}
            />
          </Pressable>
          <View className="p-3.5">
            <View className="mb-1.5 self-start rounded-md border border-white/20 bg-glass px-2 py-[3px] dark:bg-glass-dark">
              <Text className="font-semibold text-[11px] text-white">
                {event.category}
              </Text>
            </View>
            <Text
              className="mb-2 font-bold text-[17px] leading-[22px] text-white"
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <View className="mb-2.5 gap-1">
              <View className="flex-row items-center gap-[5px]">
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text className="font-sans text-xs text-white/80">
                  {formatDate(event.date)} · {event.time}
                </Text>
              </View>
              <View className="flex-row items-center gap-[5px]">
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text className="font-sans text-xs text-white/80" numberOfLines={1}>
                  {event.city} · {event.distance}km away
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text className="font-sans text-xs text-white/70">
                  {event.attendees.toLocaleString()} attending
                </Text>
              </View>
              <View
                className={`rounded-[20px] px-2.5 py-1 ${
                  event.price === 0 ? "bg-success" : "bg-primary"
                }`}
              >
                <Text className="font-bold text-xs text-white">{priceLabel}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </AnimatedPressable>
    );
  }

  if (variant === "compact") {
    return (
      <AnimatedPressable
        className="mr-3 w-40 overflow-hidden rounded-xl bg-card dark:bg-card-dark"
        style={animatedStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <ImageBackground
          source={getEventImage(event.image)}
          className="h-[110px] w-full"
          imageStyle={{
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        />
        <View className="gap-0.5 p-2.5">
          <Text className="font-semibold text-[11px] text-primary">
            {event.category}
          </Text>
          <Text
            className="font-semibold text-[13px] leading-[18px] text-foreground dark:text-foreground-dark"
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
            {formatDate(event.date)}
          </Text>
          <Text
            className={`mt-0.5 font-bold text-xs ${
              event.price === 0 ? "text-success" : "text-accent"
            }`}
          >
            {priceLabel}
          </Text>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      className="mb-3.5 overflow-hidden rounded-xl border border-border bg-card dark:border-border-dark dark:bg-card-dark"
      style={animatedStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <ImageBackground
        source={getEventImage(event.image)}
        className="h-[150px] justify-end"
        imageStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <View className="absolute inset-0 bg-overlay opacity-25 dark:bg-overlay-dark" />
        <Pressable
          className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          onPress={handleSave}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={16}
            color={isSaved ? colors.primary : colors.foreground}
          />
        </Pressable>
        <View
          className={`absolute bottom-2.5 left-2.5 rounded-[20px] px-2.5 py-1 ${
            event.price === 0 ? "bg-success" : "bg-primary"
          }`}
        >
          <Text className="font-bold text-xs text-white">{priceLabel}</Text>
        </View>
      </ImageBackground>
      <View className="gap-1 p-3.5">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-xs text-primary">
            {event.category}
          </Text>
          <View className="flex-row items-center gap-[3px]">
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text className="font-medium text-xs text-muted-foreground dark:text-muted-foreground-dark">
              {event.rating}
            </Text>
          </View>
        </View>
        <Text
          className="font-semibold text-base leading-[22px] text-foreground dark:text-foreground-dark"
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <View className="flex-row items-center gap-[5px]">
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text className="font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark">
            {formatDate(event.date)} · {event.time}
          </Text>
        </View>
        <View className="flex-row items-center gap-[5px]">
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text
            className="font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark"
            numberOfLines={1}
          >
            {event.city} · {event.distance}km
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
