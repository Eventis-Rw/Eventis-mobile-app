import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type AccountType = "business" | "individual";

export default function BusinessRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, registerBusiness } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.isBusinessAccount) {
    router.replace("/business/dashboard" as any);
    return null;
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    await registerBusiness({ businessName, type: accountType, website: website || undefined });
    setLoading(false);
    router.replace("/business/dashboard" as any);
  };

  const TYPES: { type: AccountType; icon: string; title: string; desc: string }[] = [
    {
      type: "individual",
      icon: "person-outline",
      title: "Individual Poster",
      desc: "Freelancers, community organizers, artists & influencers",
    },
    {
      type: "business",
      icon: "business-outline",
      title: "Business Account",
      desc: "Companies, brands, clubs, venues & professional organizers",
    },
  ];

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-3 dark:border-border-dark"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-foreground dark:text-foreground-dark">
          List Events
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}>
          <Text className="mb-2 text-[26px] font-bold text-foreground dark:text-foreground-dark">
            Start Posting Events
          </Text>
          <Text className="text-[15px] font-sans leading-6 text-muted-foreground dark:text-muted-foreground-dark">
            Choose how you want to list events on Eventis and reach thousands of attendees.
          </Text>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}>
          <Text className="mb-2.5 text-[15px] font-semibold text-foreground dark:text-foreground-dark">
            Account Type
          </Text>
          <View className="flex-row gap-3">
            {TYPES.map((t) => (
              <Pressable
                key={t.type}
                className={`relative flex-1 gap-2 rounded-[18px] bg-card p-4 dark:bg-card-dark ${
                  accountType === t.type
                    ? "border-2 border-primary"
                    : "border border-border dark:border-border-dark"
                }`}
                onPress={() => setAccountType(t.type)}
              >
                <View
                  className={`mb-1 h-11 w-11 items-center justify-center rounded-xl ${
                    accountType === t.type
                      ? "bg-primary"
                      : "bg-secondary dark:bg-secondary-dark"
                  }`}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={22}
                    color={accountType === t.type ? "#fff" : colors.mutedForeground}
                  />
                </View>
                <Text className="text-sm font-bold text-foreground dark:text-foreground-dark">
                  {t.title}
                </Text>
                <Text className="text-xs font-sans leading-[18px] text-muted-foreground dark:text-muted-foreground-dark">
                  {t.desc}
                </Text>
                {accountType === t.type && (
                  <View className="absolute right-3 top-3 h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}>
          <Text className="mb-2.5 text-[15px] font-semibold text-foreground dark:text-foreground-dark">
            {accountType === "business" ? "Business Name" : "Your Name / Brand"}
          </Text>
          <View className="flex-row items-center gap-3 rounded-[14px] border border-border bg-input px-3.5 py-3.5 dark:border-border-dark dark:bg-input-dark">
            <Ionicons
              name={accountType === "business" ? "business-outline" : "person-outline"}
              size={18}
              color={colors.mutedForeground}
            />
            <TextInput
              className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
              placeholder={accountType === "business" ? "e.g. Pulse Events Ltd" : "e.g. Alex Johnson"}
              placeholderTextColor={colors.mutedForeground}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}>
          <Text className="mb-2.5 text-[15px] font-semibold text-foreground dark:text-foreground-dark">
            Website{" "}
            <Text className="text-muted-foreground dark:text-muted-foreground-dark">
              (required for paid events)
            </Text>
          </Text>
          <View className="flex-row items-center gap-3 rounded-[14px] border border-border bg-input px-3.5 py-3.5 dark:border-border-dark dark:bg-input-dark">
            <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
              placeholder="https://yourwebsite.com"
              placeholderTextColor={colors.mutedForeground}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </Animated.View>

        {/* Paid event requirements */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(320).springify() : undefined}
          className="gap-2 rounded-2xl border border-border bg-glass p-4 dark:border-border-dark dark:bg-glass-dark"
        >
          <Text className="mb-1 text-sm font-bold text-foreground dark:text-foreground-dark">
            For Paid Events
          </Text>
          {[
            "Business registration documents",
            "Legal business name",
            "Website URL for payment processing",
            "Tax/business identification (if applicable)",
          ].map((item) => (
            <View key={item} className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
              <Text className="flex-1 text-[13px] font-sans leading-5 text-muted-foreground dark:text-muted-foreground-dark">
                {item}
              </Text>
            </View>
          ))}
          <Text className="mt-1 text-xs font-sans italic leading-[18px] text-muted-foreground dark:text-muted-foreground-dark">
            Eventis does not process payments directly. Customers are redirected to your website.
          </Text>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(380).springify() : undefined}>
          <Pressable
            className={`flex-row items-center justify-center gap-2.5 rounded-2xl py-[18px] ${
              businessName.trim() ? "bg-primary" : "bg-border dark:bg-border-dark"
            } ${loading ? "opacity-75" : ""}`}
            onPress={handleSubmit}
            disabled={!businessName.trim() || loading}
          >
            <Ionicons name="rocket-outline" size={20} color="#fff" />
            <Text className="text-[17px] font-bold text-primary-foreground">
              {loading ? "Creating account..." : "Start Posting Events"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
