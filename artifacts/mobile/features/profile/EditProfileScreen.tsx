import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      Alert.alert("Invalid name", "Username must be at least 2 characters.");
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({
        username: trimmed,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        className="flex-row items-center gap-3 border-b border-border px-4 pb-3.5 dark:border-border-dark"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-foreground dark:text-foreground-dark">
          Edit Profile
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="min-w-[64px] items-center rounded-[10px] bg-primary px-[18px] py-2"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-primary-foreground">Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-[60px] pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}
          className="mb-2 items-center gap-2.5"
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Text className="text-[34px] font-bold text-primary-foreground">
              {(username || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-[13px] font-sans text-muted-foreground dark:text-muted-foreground-dark">
            {user?.email}
          </Text>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(120).springify() : undefined}
          className="gap-5"
        >
          <FieldBlock
            label="Username"
            icon="person-outline"
            value={username}
            onChangeText={setUsername}
            placeholder="Your display name"
            autoCapitalize="none"
            maxLength={50}
            colors={colors}
          />
          <FieldBlock
            label="Bio"
            icon="create-outline"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others a bit about yourself"
            multiline
            maxLength={200}
            colors={colors}
          />
          <FieldBlock
            label="Phone Number"
            icon="phone-portrait-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="+44 7700 900000"
            keyboardType="phone-pad"
            maxLength={20}
            colors={colors}
            hint={user?.isPhoneVerified ? "Verified" : "Not verified"}
            hintVariant={user?.isPhoneVerified ? "success" : "accent"}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldBlock({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  maxLength,
  colors,
  hint,
  hintVariant,
}: {
  label: string;
  icon: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  maxLength?: number;
  colors: ReturnType<typeof useColors>;
  hint?: string;
  hintVariant?: "success" | "accent";
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text className="flex-1 text-[13px] font-semibold text-muted-foreground dark:text-muted-foreground-dark">
          {label}
        </Text>
        {hint && (
          <Text
            className={`text-xs font-semibold ${
              hintVariant === "success" ? "text-success" : "text-accent"
            }`}
          >
            {hint}
          </Text>
        )}
      </View>
      <TextInput
        className={`rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] font-sans text-foreground dark:border-border-dark dark:bg-card-dark dark:text-foreground-dark ${
          multiline ? "h-24" : ""
        }`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        maxLength={maxLength}
        autoCorrect={false}
      />
    </View>
  );
}
