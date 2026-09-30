import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, type EventCategory } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

const NON_ALL_CATEGORIES = CATEGORIES.filter((c) => c !== "All") as Exclude<EventCategory, "All">[];

interface FormState {
  title: string;
  description: string;
  category: Exclude<EventCategory, "All"> | "";
  location: string;
  date: string;
  time: string;
  capacity: string;
  isPaid: boolean;
  price: string;
  websiteUrl: string;
}

const INITIAL: FormState = {
  title: "",
  description: "",
  category: "",
  location: "",
  date: "",
  time: "",
  capacity: "",
  isPaid: false,
  price: "",
  websiteUrl: "",
};

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
        {label}
        {required && <Text className="text-primary"> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function CreateEventScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isValid =
    form.title.trim() &&
    form.description.trim() &&
    form.category &&
    form.location.trim() &&
    form.date.trim() &&
    form.time.trim() &&
    form.capacity.trim();

  async function handleSubmit() {
    if (!isValid || submitting) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    router.replace("/business/dashboard" as any);
  }

  const inputClassName =
    "rounded-xl border border-border bg-input px-3.5 py-3 text-[15px] font-sans text-foreground dark:border-border-dark dark:bg-input-dark dark:text-foreground-dark";

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-3 dark:border-border-dark"
        style={{ paddingTop: topPad + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-foreground dark:text-foreground-dark">
          Create Event
        </Text>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pt-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic info */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
            className="gap-4 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="text-base font-bold text-foreground dark:text-foreground-dark">
              Basic Info
            </Text>

            <Field label="Event Title" required>
              <TextInput
                className={inputClassName}
                placeholder="e.g. Summer Jazz Night"
                placeholderTextColor={colors.mutedForeground}
                value={form.title}
                onChangeText={(v) => set("title", v)}
              />
            </Field>

            <Field label="Description" required>
              <TextInput
                className={`${inputClassName} h-[100px] pt-3`}
                placeholder="Tell attendees what to expect..."
                placeholderTextColor={colors.mutedForeground}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Category" required>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-0.5"
              >
                {NON_ALL_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    className={`rounded-[20px] border px-3.5 py-2 ${
                      form.category === cat
                        ? "border-primary bg-primary"
                        : "border-border bg-secondary dark:border-border-dark dark:bg-secondary-dark"
                    }`}
                    onPress={() => set("category", cat)}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        form.category === cat
                          ? "text-primary-foreground"
                          : "text-muted-foreground dark:text-muted-foreground-dark"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Field>
          </Animated.View>

          {/* Location & time */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
            className="gap-4 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="text-base font-bold text-foreground dark:text-foreground-dark">
              Location &amp; Time
            </Text>

            <Field label="Venue / Address" required>
              <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                <TextInput
                  className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                  placeholder="e.g. Roundhouse, Camden"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.location}
                  onChangeText={(v) => set("location", v)}
                />
              </View>
            </Field>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label="Date" required>
                  <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                    <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.date}
                      onChangeText={(v) => set("date", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Start Time" required>
                  <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                    <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                      placeholder="19:00"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.time}
                      onChangeText={(v) => set("time", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </Field>
              </View>
            </View>

            <Field label="Capacity" required>
              <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                <Ionicons name="people-outline" size={18} color={colors.mutedForeground} />
                <TextInput
                  className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.capacity}
                  onChangeText={(v) => set("capacity", v)}
                  keyboardType="number-pad"
                />
              </View>
            </Field>
          </Animated.View>

          {/* Ticketing */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
            className="gap-4 rounded-2xl border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="text-base font-bold text-foreground dark:text-foreground-dark">
              Ticketing
            </Text>

            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                  Paid Event
                </Text>
                <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                  Customers pay on your website
                </Text>
              </View>
              <Switch
                value={form.isPaid}
                onValueChange={(v) => set("isPaid", v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            {form.isPaid && (
              <>
                <Field label="Ticket Price (GBP)">
                  <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                    <Text className="text-base font-medium text-muted-foreground dark:text-muted-foreground-dark">
                      £
                    </Text>
                    <TextInput
                      className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.price}
                      onChangeText={(v) => set("price", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </Field>

                <Field label="Booking / Payment URL" required>
                  <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark">
                    <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      className="flex-1 text-[15px] font-sans text-foreground dark:text-foreground-dark"
                      placeholder="https://yourticketing.com/event"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.websiteUrl}
                      onChangeText={(v) => set("websiteUrl", v)}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>
                </Field>

                <View className="flex-row items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text className="flex-1 text-[13px] font-sans leading-5 text-muted-foreground dark:text-muted-foreground-dark">
                    Eventis redirects customers to your URL for payment. We do not process payments directly.
                  </Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Submit */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}
          >
            <Pressable
              className={`flex-row items-center justify-center gap-2.5 rounded-2xl py-[18px] ${
                isValid ? "bg-primary" : "bg-border dark:bg-border-dark"
              } ${submitting ? "opacity-75" : ""}`}
              onPress={handleSubmit}
              disabled={!isValid || submitting}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text className="text-[17px] font-bold text-primary-foreground">
                {submitting ? "Publishing..." : "Publish Event"}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
