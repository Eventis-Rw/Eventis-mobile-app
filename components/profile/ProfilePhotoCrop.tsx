import { Ionicons } from "@expo/vector-icons";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

type Photo = Pick<ImagePicker.ImagePickerAsset, "uri" | "height" | "width">;

export async function chooseProfilePhoto(): Promise<Photo | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (asset.width && asset.height) return asset;
  const size = await Image.getSize(asset.uri);
  return { uri: asset.uri, ...size };
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function ProfilePhotoCrop({
  photo,
  onSave,
  onCancel,
}: {
  photo: Photo;
  onSave: (uri: string) => void;
  onCancel: () => void;
}) {
  const insets = useAppSafeAreaInsets();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [size, setSize] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const origin = useRef({ x: 0, y: 0 });
  const scale = Math.min(
    stage.width / photo.width,
    stage.height / photo.height,
  );
  const w = photo.width * scale,
    h = photo.height * scale;
  const side = Math.min(w, h) * size;
  const left = (w - side) * position.x,
    top = (h - side) * position.y;
  const current = useRef({ left, top });
  current.current = { left, top };
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          origin.current = { x: current.current.left, y: current.current.top };
        },
        onPanResponderMove: (_, g) =>
          setPosition({
            x: clamp((origin.current.x + g.dx) / Math.max(w - side, 1), 0, 1),
            y: clamp((origin.current.y + g.dy) / Math.max(h - side, 1), 0, 1),
          }),
      }),
    [w, h, side],
  );

  const save = async () => {
    if (!scale || busy) return;
    setBusy(true);
    setError("");
    let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
    try {
      context = ImageManipulator.manipulate(photo.uri);
      const pixels = Math.max(1, Math.round(side / scale));
      context.crop({
        originX: clamp(Math.round(left / scale), 0, photo.width - pixels),
        originY: clamp(Math.round(top / scale), 0, photo.height - pixels),
        width: pixels,
        height: pixels,
      });
      if (pixels > 768) context.resize({ width: 768 });
      const cropped = await context.renderAsync();
      try {
        const result = await cropped.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.85,
        });
        onSave(result.uri);
      } finally {
        cropped.release();
      }
    } catch {
      setError("Couldn’t crop this photo. Try again or choose another photo.");
    } finally {
      context?.release();
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel crop"
            onPress={onCancel}
            disabled={busy}
            hitSlop={10}
          >
            <Ionicons name="close" size={26} color="white" />
          </Pressable>
          <Text style={styles.title}>Crop photo</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void save()}
            disabled={busy || !side}
            style={styles.save}
          >
            {busy ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
        <View
          style={styles.stage}
          onLayout={(e) => setStage(e.nativeEvent.layout)}
        >
          {scale > 0 && (
            <View
              style={{ width: w, height: h, overflow: "hidden" }}
              {...drag.panHandlers}
            >
              <Image
                source={{ uri: photo.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
              />
              <Svg pointerEvents="none" width={w} height={h}>
                <Path
                  fill="rgba(0,0,0,0.62)"
                  fillRule="evenodd"
                  d={`M0 0H${w}V${h}H0Z M${left} ${top + side / 2}a${side / 2} ${side / 2} 0 1 0 ${side} 0a${side / 2} ${side / 2} 0 1 0 ${-side} 0Z`}
                />
                <Circle
                  cx={left + side / 2}
                  cy={top + side / 2}
                  r={side / 2}
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                />
              </Svg>
            </View>
          )}
        </View>
        <Text style={styles.hint}>
          {error || "Drag the circle to frame your photo"}
        </Text>
        <View style={styles.adjust}>
          {([-1, 1] as const).map((direction) => (
            <Pressable
              key={direction}
              style={styles.control}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={
                direction < 0 ? "Smaller crop" : "Larger crop"
              }
              onPress={() => setSize((s) => clamp(s + direction * 0.1, 0.2, 1))}
            >
              <Ionicons
                name={direction < 0 ? "remove" : "add"}
                size={24}
                color="white"
              />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#10141B" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: { color: "white", fontSize: 18, fontWeight: "600" },
  save: {
    minWidth: 64,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3763AD",
  },
  saveText: { color: "white", fontWeight: "700" },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#090B10",
  },
  hint: {
    color: "#E3E8EF",
    textAlign: "center",
    marginHorizontal: 12,
    marginTop: 20,
  },
  adjust: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingTop: 14,
  },
  control: {
    backgroundColor: "#29323F",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
