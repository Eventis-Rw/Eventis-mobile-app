import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  align?: "left" | "center" | "right";
};

export const STORY_BACKGROUNDS = [
  { name: "Midnight", color: "#080B10", foreground: "#FFFFFF" },
  { name: "Ocean", color: "#075DA3", foreground: "#FFFFFF" },
  { name: "Slate", color: "#182C43", foreground: "#FFFFFF" },
  { name: "Cloud", color: "#F1F5FA", foreground: "#08111F" },
  { name: "Berry", color: "#7A1F5C", foreground: "#FFFFFF" },
  { name: "Forest", color: "#1F5C3A", foreground: "#FFFFFF" },
  { name: "Sunset", color: "#C2410C", foreground: "#FFFFFF" },
  { name: "Violet", color: "#4C1D95", foreground: "#FFFFFF" },
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
  /** A press without dragging, e.g. to open the text editor. */
  onTapLayer?: (id: string) => void;
  /** When a layer is dragged on the canvas */
  onDragChange?: (dragging: boolean, normX: number, normY: number) => void;
};

function MusicEqualizer() {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(11)).current;
  const bar3 = useRef(new Animated.Value(7)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar1, { toValue: 14, duration: 280, useNativeDriver: false }),
        Animated.timing(bar1, { toValue: 3, duration: 260, useNativeDriver: false }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar2, { toValue: 4, duration: 240, useNativeDriver: false }),
        Animated.timing(bar2, { toValue: 15, duration: 310, useNativeDriver: false }),
      ])
    );
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar3, { toValue: 13, duration: 320, useNativeDriver: false }),
        Animated.timing(bar3, { toValue: 4, duration: 250, useNativeDriver: false }),
      ])
    );
    anim1.start();
    anim2.start();
    anim3.start();
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [bar1, bar2, bar3]);

  return (
    <View style={styles.equalizerRow}>
      <Animated.View style={[styles.equalizerBar, { height: bar1 }]} />
      <Animated.View style={[styles.equalizerBar, { height: bar2 }]} />
      <Animated.View style={[styles.equalizerBar, { height: bar3 }]} />
    </View>
  );
}

function StoryLayer({
  overlay,
  width,
  height,
  selected,
  editable,
  onSelect,
  onMove,
  onTap,
  onDragChange,
}: {
  overlay: StoryOverlay;
  width: number;
  height: number;
  selected: boolean;
  editable: boolean;
  onSelect?: CanvasProps["onSelect"];
  onMove?: CanvasProps["onMove"];
  onTap?: CanvasProps["onTapLayer"];
  onDragChange?: CanvasProps["onDragChange"];
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const translation = useRef(new Animated.ValueXY()).current;
  const latest = useRef({ overlay, width, height, editable, onSelect, onMove, onTap, onDragChange, size });
  latest.current = { overlay, width, height, editable, onSelect, onMove, onTap, onDragChange, size };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.editable,
    onPanResponderGrant: () => {
      latest.current.onSelect?.(latest.current.overlay.id);
      latest.current.onDragChange?.(true, latest.current.overlay.x, latest.current.overlay.y);
    },
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
      const normX = Math.max(0, Math.min(1, (current.overlay.x * current.width + gesture.dx) / Math.max(1, current.width)));
      const normY = Math.max(0, Math.min(1, (current.overlay.y * current.height + gesture.dy) / Math.max(1, current.height)));
      current.onDragChange?.(true, normX, normY);
    },
    onPanResponderRelease: (_, gesture) => {
      const current = latest.current;
      const normX = Math.max(0, Math.min(1, (current.overlay.x * current.width + gesture.dx) / Math.max(1, current.width)));
      const normY = Math.max(0, Math.min(1, (current.overlay.y * current.height + gesture.dy) / Math.max(1, current.height)));
      current.onDragChange?.(false, normX, normY);

      if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
        translation.setValue({ x: 0, y: 0 });
        current.onTap?.(current.overlay.id);
        return;
      }
      const x = Math.max(current.size.width / 2, Math.min(current.width - current.size.width / 2, current.overlay.x * current.width + gesture.dx));
      const y = Math.max(current.size.height / 2, Math.min(current.height - current.size.height / 2, current.overlay.y * current.height + gesture.dy));
      current.onMove?.(current.overlay.id, x / Math.max(1, current.width), y / Math.max(1, current.height));
      translation.setValue({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => {
      latest.current.onDragChange?.(false, 0, 0);
      translation.setValue({ x: 0, y: 0 });
    },
  }), [translation]);

  // Instagram Badge Detection
  const text = overlay.text.trim();
  const isLocation = text.startsWith("📍");
  const isMusic = text.startsWith("🎵") || text.startsWith("🎶");
  const isTicket = text.startsWith("🎟️") || text.startsWith("⚡");
  const isPureEmoji = !isLocation && !isMusic && !isTicket && text.length <= 4 && !/[a-zA-Z0-9]/.test(text);
  const cleanBadgeText = text.replace(/^[📍🎵🎶🎟️⚡]\s*/, "");

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
          maxWidth: width * 0.9,
          left: Math.max(0, Math.min(width - size.width, overlay.x * width - size.width / 2)),
          top: Math.max(0, Math.min(height - size.height, overlay.y * height - size.height / 2)),
          borderColor: selected && editable ? "#70BDF5" : "transparent",
          transform: translation.getTranslateTransform(),
        },
      ]}
    >
      {isMusic ? (
        <View style={styles.musicBadgePill}>
          <Ionicons name="musical-notes" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.musicBadgeText} numberOfLines={1}>
            {cleanBadgeText || "Song · Artist"}
          </Text>
          <MusicEqualizer />
        </View>
      ) : isLocation ? (
        <View style={styles.locationBadgePill}>
          <Ionicons name="location-sharp" size={17} color="#E1306C" style={{ marginRight: 5 }} />
          <Text style={styles.locationBadgeText} numberOfLines={1}>
            {cleanBadgeText}
          </Text>
        </View>
      ) : isTicket ? (
        <View style={styles.ticketBadgePill}>
          <Ionicons name="ticket" size={17} color="#FACC15" style={{ marginRight: 6 }} />
          <Text style={styles.ticketBadgeText} numberOfLines={1}>
            {cleanBadgeText}
          </Text>
        </View>
      ) : isPureEmoji ? (
        <Text style={[styles.pureEmojiText, { fontSize: Math.max(34, overlay.size * 1.3) }]}>
          {text}
        </Text>
      ) : (
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
              textAlign: overlay.align || "center",
            },
            overlay.style === "label"
              ? [styles.labelText, { backgroundColor: overlay.color === "#08111F" ? "#FFFFFF" : "#08111F" }]
              : styles.shadowText,
          ]}
        >
          {overlay.text}
        </Text>
      )}
    </Animated.View>
  );
}

/** A portrait canvas; normalized positions stay consistent in the larger preview. */
export function StoryCanvas({
  image,
  background,
  fit,
  overlays,
  selectedId,
  editable = false,
  onSelect,
  onMove,
  onTapLayer,
  onDragChange,
  media,
  onImageLoad,
  onImageError,
}: CanvasProps) {
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
          onTap={onTapLayer}
          onDragChange={onDragChange}
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
  layer: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, padding: 4 },
  layerText: { textAlign: "center", paddingHorizontal: 7, paddingVertical: 5 },
  shadowText: { textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  labelText: { backgroundColor: "#FFFFFF", borderRadius: 9, overflow: "hidden" },

  // Instagram Interactive Badges
  musicBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 24, 38, 0.88)",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  musicBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginRight: 8,
    maxWidth: 160,
  },
  equalizerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 16,
    gap: 2,
    marginLeft: 2,
  },
  equalizerBar: {
    width: 3,
    backgroundColor: "#00A3FF",
    borderRadius: 1.5,
  },
  locationBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  locationBadgeText: {
    color: "#08111F",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    maxWidth: 180,
  },
  ticketBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.5)",
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  ticketBadgeText: {
    color: "#FACC15",
    fontSize: 13.5,
    fontFamily: "Inter_700Bold",
    maxWidth: 180,
  },
  pureEmojiText: {
    textAlign: "center",
    padding: 2,
  },
});
