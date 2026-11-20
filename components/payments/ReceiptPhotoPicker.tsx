import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Colors = {
  card: string;
  border: string;
  success: string;
  secondary: string;
  mutedForeground: string;
  primary: string;
  foreground: string;
};

/**
 * Take-or-choose picker for one payment receipt screenshot, with a live
 * preview and a retake action. Mirrors app/love/verify.tsx's PhotoSlot
 * (front/back ID photos); a payment receipt only ever needs the one image,
 * so this is the simpler single-image version. Theme-agnostic: pass whichever
 * color hook the screen already uses (useColors() or useOrganiserColors()
 * return the same shape).
 */
export function ReceiptPhotoPicker({
  uri,
  onPicked,
  onError,
  colors,
}: {
  uri?: string;
  onPicked: (uri: string) => void;
  onError: (message: string) => void;
  colors: Colors;
}) {
  const take = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onError("Allow camera access to photograph your payment screenshot, or choose one from your photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("We couldn't open the camera. Try choosing a photo instead.");
    }
  };

  const choose = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) onPicked(result.assets[0].uri);
    } catch {
      onError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  return (
    <View style={[styles.slot, { backgroundColor: colors.card, borderColor: uri ? colors.success : colors.border }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" accessibilityLabel="Payment screenshot" />
      ) : (
        <View style={[styles.preview, styles.placeholder, { backgroundColor: colors.secondary }]}>
          <Ionicons name="image-outline" size={28} color={colors.mutedForeground} />
          <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>Add your payment screenshot</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() => void take()}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={uri ? "Retake payment screenshot" : "Take photo of payment screenshot"}
        >
          <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>{uri ? "Retake" : "Camera"}</Text>
        </Pressable>
        <Pressable
          onPress={() => void choose()}
          style={[styles.button, { backgroundColor: colors.secondary }]}
          accessibilityRole="button"
          accessibilityLabel="Choose payment screenshot from photos"
        >
          <Ionicons name="images-outline" size={16} color={colors.foreground} />
          <Text style={[styles.buttonText, { color: colors.foreground }]}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { borderRadius: 16, borderWidth: 1.5, padding: 10, gap: 10 },
  preview: { width: "100%", aspectRatio: 1.1, borderRadius: 12 },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  placeholderText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  actions: { flexDirection: "row", gap: 8 },
  button: { flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 11 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
