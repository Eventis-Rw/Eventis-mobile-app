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
  StyleSheet,
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
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Edit Profile
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}
          style={[styles.avatarSection]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLetter}>
              {(username || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            {user?.email}
          </Text>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(120).springify() : undefined}
          style={styles.fields}
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
            hintColor={user?.isPhoneVerified ? colors.success : colors.accent}
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
  hintColor,
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
  hintColor?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {hint && (
          <Text style={[styles.fieldHint, { color: hintColor }]}>{hint}</Text>
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMulti,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    gap: 24,
  },
  avatarSection: { alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fields: { gap: 20 },
  fieldBlock: { gap: 8 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldHint: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMulti: {
    height: 96,
    textAlignVertical: "top",
  },
});
