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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

const CAPTION_LIMIT = 100;

// UI only: there is no stories API yet, so sharing is simulated (same as create-event).
export default function CreateStoryScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [pickError, setPickError] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);

  const pickImage = async () => {
    setPickError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch {
      setPickError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const share = async () => {
    if (!imageUri || sharing) return;
    setSharing(true);
    await new Promise((r) => setTimeout(r, 800));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSharing(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PortalScreenHeader title="Create Story" icon="close" disabled={sharing} />

      <View style={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
        {imageUri ? (
          <View style={styles.preview}>
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.previewTop}>
              <Pressable
                onPress={pickImage}
                style={[styles.previewBtn, { backgroundColor: colors.overlay }]}
                accessibilityRole="button"
                accessibilityLabel="Change photo"
              >
                <Ionicons name="images-outline" size={18} color="#fff" />
              </Pressable>
            </View>
            <View style={[styles.captionWrap, { backgroundColor: colors.overlay }]}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption"
                placeholderTextColor="rgba(255,255,255,0.7)"
                maxLength={CAPTION_LIMIT}
                style={styles.caption}
                accessibilityLabel="Story caption"
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo for your story"
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "1F" }]}>
              <Ionicons name="aperture-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Choose a photo</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Stories appear at the top of the home feed. Portrait photos work best.
            </Text>
            {pickError && <Text style={[styles.error, { color: colors.destructive }]}>{pickError}</Text>}
          </Pressable>
        )}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: imageUri && !sharing ? colors.primary : colors.disabled }]}
          onPress={share}
          disabled={!imageUri || sharing}
          accessibilityRole="button"
          accessibilityState={{ disabled: !imageUri || sharing, busy: sharing }}
        >
          {sharing ? <ActivityIndicator color="#fff" /> : <Ionicons name="paper-plane" size={18} color="#fff" />}
          <Text style={styles.primaryBtnText}>{sharing ? "Sharing…" : "Share story"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, padding: 20, gap: 16 },
  preview: { flex: 1, borderRadius: 20, overflow: "hidden", justifyContent: "space-between" },
  previewTop: { flexDirection: "row", justifyContent: "flex-end", padding: 12 },
  previewBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  captionWrap: { margin: 12, borderRadius: 12, paddingHorizontal: 14 },
  caption: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", paddingVertical: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
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
