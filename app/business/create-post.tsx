import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

const CAPTION_LIMIT = 2200;

// UI only: there is no posts API yet, so publishing is simulated (same as create-event).
export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const orgName = user?.organisation?.name ?? user?.businessName ?? "Your organisation";

  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
  const [publishing, setPublishing] = useState(false);

  const canPublish = caption.trim().length > 0 && !publishing;

  const pickImage = async () => {
    setImageError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch {
      setImageError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    await new Promise((r) => setTimeout(r, 800));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPublishing(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PortalScreenHeader title="Create Post" disabled={publishing} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.author}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {user?.organisation?.logoUrl ? (
              <Image source={{ uri: user.organisation.logoUrl }} style={styles.fill} />
            ) : (
              <Text style={styles.avatarLetter}>{orgName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.authorName, { color: colors.foreground }]}>{orgName}</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Posting as your organisation</Text>
          </View>
        </View>

        <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="What's happening? Share an update with your audience…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={CAPTION_LIMIT}
            textAlignVertical="top"
            style={[styles.input, { color: colors.foreground }]}
            accessibilityLabel="Post text"
          />
          <Text style={[styles.hint, styles.count, { color: colors.mutedForeground }]}>
            {caption.length}/{CAPTION_LIMIT}
          </Text>
        </View>

        {imageUri ? (
          <View style={[styles.imageWrap, { borderColor: colors.border }]}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <Pressable
              onPress={() => setImageUri(undefined)}
              style={[styles.removeBtn, { backgroundColor: colors.overlay }]}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.card }]}
            accessibilityRole="button"
          >
            <Ionicons name="image-outline" size={22} color={colors.primary} />
            <Text style={[styles.addPhotoText, { color: colors.foreground }]}>Add a photo (optional)</Text>
          </Pressable>
        )}
        {imageError && <Text style={[styles.error, { color: colors.destructive }]}>{imageError}</Text>}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: canPublish ? colors.primary : colors.disabled }]}
          onPress={publish}
          disabled={!canPublish}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPublish, busy: publishing }}
        >
          {publishing ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          <Text style={styles.primaryBtnText}>{publishing ? "Publishing…" : "Publish post"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  fill: { width: "100%", height: "100%" },
  content: { padding: 20, gap: 16 },
  author: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLetter: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  authorName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inputWrap: { borderRadius: 16, borderWidth: 1, padding: 14 },
  input: { minHeight: 140, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  count: { alignSelf: "flex-end" },
  imageWrap: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 4 / 3 },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addPhotoText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  error: { fontSize: 12, fontFamily: "Inter_500Medium" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
