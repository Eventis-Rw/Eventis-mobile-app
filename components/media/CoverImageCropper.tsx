import { Ionicons } from "@expo/vector-icons";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { InlineError } from "@/components/profile/ProfileSection";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserColors } from "@/hooks/useOrganiserPalette";

const MAX_ZOOM = 4;
const OUTPUT_LONG_EDGE = 1350;

function clampValue(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function computeMaxPan(displaySize: number, frameSize: number) {
  "worklet";
  return Math.max(0, (displaySize - frameSize) / 2);
}

export interface CoverImageCropResult {
  uri: string;
  mimeType: string;
  fileName: string;
}

export interface CoverImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  aspect?: [number, number];
  onCancel: () => void;
  onConfirm: (result: CoverImageCropResult) => void;
}

export function CoverImageCropper({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspect = [4, 5],
  onCancel,
  onConfirm,
}: CoverImageCropperProps) {
  const colors = useOrganiserColors();
  const insets = useAppSafeAreaInsets();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [processing, setProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startZoom = useSharedValue(1);

  const aspectRatio = aspect[0] / aspect[1];

  const layout = useMemo(() => {
    const availableWidth = winWidth - 48;
    const availableHeight = winHeight * 0.6;
    let frameWidth = availableWidth;
    let frameHeight = frameWidth / aspectRatio;
    if (frameHeight > availableHeight) {
      frameHeight = availableHeight;
      frameWidth = frameHeight * aspectRatio;
    }
    const safeImageWidth = imageWidth || 1;
    const safeImageHeight = imageHeight || 1;
    const baseScale = Math.max(frameWidth / safeImageWidth, frameHeight / safeImageHeight);
    const baseDisplayWidth = safeImageWidth * baseScale;
    const baseDisplayHeight = safeImageHeight * baseScale;
    const outputHeight = aspectRatio <= 1 ? OUTPUT_LONG_EDGE : Math.round(OUTPUT_LONG_EDGE * aspectRatio);
    const outputWidth = aspectRatio <= 1 ? Math.round(OUTPUT_LONG_EDGE * aspectRatio) : OUTPUT_LONG_EDGE;
    return { frameWidth, frameHeight, baseScale, baseDisplayWidth, baseDisplayHeight, outputWidth, outputHeight };
  }, [winWidth, winHeight, aspectRatio, imageWidth, imageHeight]);

  useEffect(() => {
    if (!visible) return;
    translateX.value = 0;
    translateY.value = 0;
    zoom.value = 1;
    setCropError(null);
  }, [visible, imageUri, translateX, translateY, zoom]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const maxX = computeMaxPan(layout.baseDisplayWidth * zoom.value, layout.frameWidth);
      const maxY = computeMaxPan(layout.baseDisplayHeight * zoom.value, layout.frameHeight);
      translateX.value = clampValue(startX.value + e.translationX, -maxX, maxX);
      translateY.value = clampValue(startY.value + e.translationY, -maxY, maxY);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const nextZoom = clampValue(startZoom.value * e.scale, 1, MAX_ZOOM);
      zoom.value = nextZoom;
      const maxX = computeMaxPan(layout.baseDisplayWidth * nextZoom, layout.frameWidth);
      const maxY = computeMaxPan(layout.baseDisplayHeight * nextZoom, layout.frameHeight);
      translateX.value = clampValue(translateX.value, -maxX, maxX);
      translateY.value = clampValue(translateY.value, -maxY, maxY);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoom.value },
    ],
  }));

  function handleReset() {
    translateX.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
    zoom.value = withTiming(1, { duration: 180 });
  }

  async function handleConfirm() {
    if (!imageUri || processing) return;
    setProcessing(true);
    setCropError(null);
    try {
      const displayScale = layout.baseScale * zoom.value;
      const cropWidth = layout.frameWidth / displayScale;
      const cropHeight = layout.frameHeight / displayScale;
      const centerX = imageWidth / 2 - translateX.value / displayScale;
      const centerY = imageHeight / 2 - translateY.value / displayScale;
      const originX = Math.max(0, Math.min(centerX - cropWidth / 2, imageWidth - cropWidth));
      const originY = Math.max(0, Math.min(centerY - cropHeight / 2, imageHeight - cropHeight));

      const context = ImageManipulator.manipulate(imageUri);
      context.crop({
        originX: Math.round(originX),
        originY: Math.round(originY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });
      context.resize({ width: layout.outputWidth, height: layout.outputHeight });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
      onConfirm({
        uri: saved.uri,
        mimeType: "image/jpeg",
        fileName: `event-cover-${Date.now()}.jpg`,
      });
    } catch {
      setCropError("We couldn't crop that photo. Try repositioning it or choose another.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel} presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.root, { backgroundColor: "#05070F", paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} disabled={processing} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.headerAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Move &amp; Zoom</Text>
            <Pressable onPress={handleConfirm} disabled={processing || !imageUri} hitSlop={10} accessibilityRole="button" accessibilityLabel="Use photo">
              {processing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.headerAction, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>Use Photo</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.stage}>
            {imageUri ? (
              <GestureDetector gesture={composedGesture}>
                <View
                  style={[
                    styles.frame,
                    { width: layout.frameWidth, height: layout.frameHeight },
                  ]}
                >
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      {
                        width: layout.baseDisplayWidth,
                        height: layout.baseDisplayHeight,
                        left: (layout.frameWidth - layout.baseDisplayWidth) / 2,
                        top: (layout.frameHeight - layout.baseDisplayHeight) / 2,
                      },
                      styles.image,
                      imageAnimatedStyle,
                    ]}
                  />
                </View>
              </GestureDetector>
            ) : null}
          </View>

          <View style={styles.footer}>
            {cropError ? <InlineError message={cropError} /> : null}
            <Text style={styles.hint}>Drag to reposition · Pinch to zoom</Text>
            <Pressable onPress={handleReset} disabled={processing} style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="refresh" size={16} color="#C7D0E0" />
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  headerAction: { color: "#C7D0E0", fontSize: 15, fontFamily: "Inter_500Medium" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  image: { position: "absolute" },
  footer: { paddingHorizontal: 20, paddingTop: 10, gap: 10, alignItems: "center" },
  hint: { color: "#8893A8", fontSize: 12, fontFamily: "Inter_400Regular" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  resetText: { color: "#C7D0E0", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
