import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

export type StoryOverlay = {
  id: string;
  text: string;
  kind: "text" | "sticker";
  x: number;
  y: number;
  color: string;
  style: "bold" | "classic" | "label";
  size: number;
};

export const STORY_BACKGROUNDS = [
  { name: "Midnight", color: "#080B10", foreground: "#FFFFFF" },
  { name: "Ocean", color: "#075DA3", foreground: "#FFFFFF" },
  { name: "Slate", color: "#182C43", foreground: "#FFFFFF" },
  { name: "Cloud", color: "#F1F5FA", foreground: "#08111F" },
] as const;

type CanvasProps = {
  media?: React.ReactNode;
  onImageLoad?: () => void;
  onImageError?: () => void;
  image?: ImageSourcePropType;
  background: string;
  fit: "cover" | "contain";
  overlays: StoryOverlay[];
  selectedId?: string;
  editable?: boolean;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
};

function StoryLayer({
  overlay,
  width,
  height,
  selected,
  editable,
  onSelect,
  onMove,
}: {
  overlay: StoryOverlay;
  width: number;
  height: number;
  selected: boolean;
  editable: boolean;
  onSelect?: CanvasProps["onSelect"];
  onMove?: CanvasProps["onMove"];
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const translation = useRef(new Animated.ValueXY()).current;
  const latest = useRef({ overlay, width, height, editable, onSelect, onMove, size });
  latest.current = { overlay, width, height, editable, onSelect, onMove, size };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.editable,
    onPanResponderGrant: () => latest.current.onSelect?.(latest.current.overlay.id),
    onPanResponderMove: (_, gesture) => {
      const current = latest.current;
      const minX = current.size.width / 2 - current.overlay.x * current.width;
      const maxX = current.width - current.size.width / 2 - current.overlay.x * current.width;
      const minY = current.size.height / 2 - current.overlay.y * current.height;
      const maxY = current.height - current.size.height / 2 - current.overlay.y * current.height;
      translation.setValue({
        x: Math.max(minX, Math.min(maxX, gesture.dx)),
        y: Math.max(minY, Math.min(maxY, gesture.dy)),
      });
    },
    onPanResponderRelease: (_, gesture) => {
      const current = latest.current;
      const x = Math.max(current.size.width / 2, Math.min(current.width - current.size.width / 2, current.overlay.x * current.width + gesture.dx));
      const y = Math.max(current.size.height / 2, Math.min(current.height - current.size.height / 2, current.overlay.y * current.height + gesture.dy));
      current.onMove?.(current.overlay.id, x / Math.max(1, current.width), y / Math.max(1, current.height));
      translation.setValue({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => translation.setValue({ x: 0, y: 0 }),
  }), [translation]);

  return (
    <Animated.View
      {...(editable ? responder.panHandlers : {})}
      onLayout={(event) => {
        const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
        setSize((previous) => previous.width === nextWidth && previous.height === nextHeight ? previous : { width: nextWidth, height: nextHeight });
      }}
      accessible={editable}
      accessibilityRole={editable ? "button" : undefined}
      accessibilityLabel={`${overlay.kind}: ${overlay.text}`}
      accessibilityHint={editable ? "Drag to reposition. Select to edit or remove." : undefined}
      onAccessibilityTap={() => onSelect?.(overlay.id)}
      style={[
        styles.layer,
        {
          maxWidth: width * 0.88,
          left: Math.max(0, Math.min(width - size.width, overlay.x * width - size.width / 2)),
          top: Math.max(0, Math.min(height - size.height, overlay.y * height - size.height / 2)),
          borderColor: selected && editable ? "#70BDF5" : "transparent",
          transform: translation.getTranslateTransform(),
        },
      ]}
    >
      <Text
        numberOfLines={overlay.kind === "text" ? 10 : 2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[
          styles.layerText,
          {
            color: overlay.color,
            fontSize: overlay.size,
            fontFamily: overlay.style === "classic" ? "Inter_500Medium" : "Inter_700Bold",
          },
          overlay.style === "label"
            ? [styles.labelText, { backgroundColor: overlay.color === "#08111F" ? "#FFFFFF" : "#08111F" }]
            : styles.shadowText,
        ]}
      >
        {overlay.text}
      </Text>
    </Animated.View>
  );
}

/** A portrait canvas; normalized positions stay consistent in the larger preview. */
export function StoryCanvas({ image, background, fit, overlays, selectedId, editable = false, onSelect, onMove, media, onImageLoad, onImageError }: CanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={[styles.canvas, { backgroundColor: background }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      }}
    >
      {media ?? (image ? <Image source={image} style={styles.photo} resizeMode={fit} accessibilityLabel="Story photo" onLoad={onImageLoad} onError={onImageError} /> : (
        <View pointerEvents="none" style={styles.backgroundDecor}>
          <View style={styles.ring} />
          <View style={styles.smallRing} />
        </View>
      ))}
      {size.width > 0 ? overlays.map((overlay) => (
        <StoryLayer
          key={overlay.id}
          overlay={{ ...overlay, size: overlay.size * (size.width / 320) }}
          width={size.width}
          height={size.height}
          selected={selectedId === overlay.id}
          editable={editable}
          onSelect={onSelect}
          onMove={onMove}
        />
      )) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: "100%", aspectRatio: 9 / 16, overflow: "hidden", borderRadius: 22 },
  photo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  backgroundDecor: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden" },
  ring: { position: "absolute", width: 420, height: 420, borderRadius: 210, borderWidth: 1, borderColor: "rgba(112,189,245,0.14)", right: -170, top: -80 },
  smallRing: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: "rgba(112,189,245,0.14)", left: -160, bottom: -50 },
  layer: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, padding: 5 },
  layerText: { textAlign: "center", paddingHorizontal: 7, paddingVertical: 5 },
  shadowText: { textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  labelText: { backgroundColor: "#FFFFFF", borderRadius: 9, overflow: "hidden" },
});
