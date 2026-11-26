import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Iconic Instagram Sunset Gradient:
 * Yellow-Orange (#FBAA47) -> Coral-Red (#D91A46) -> Fuchsia-Purple (#A60F93) -> Royal Magenta (#8A3AB9)
 */
export const INSTAGRAM_STORY_GRADIENT = [
  "#FBAA47",
  "#D91A46",
  "#A60F93",
  "#8A3AB9",
] as const;

export function StoryAvatar({
  name,
  uri,
  size = 62,
  ring,
  add = false,
  surfaceColor,
}: {
  name: string;
  uri?: string;
  size?: number;
  ring?: "new" | "watched";
  add?: boolean;
  surfaceColor?: string;
}) {
  const colors = useColors();
  const [failedUri, setFailedUri] = useState<string>();
  const separatorColor = surfaceColor ?? colors.background;

  // Proportions matching Instagram: 2.5px gradient ring + 2.5px gap to avatar
  const hasRing = !!ring;
  const outerSize = size + (hasRing ? 10 : 0);
  const separatorSize = size + (hasRing ? 5 : 0);
  const plusSize = Math.max(20, Math.round(size * 0.32));

  return (
    <View style={{ width: outerSize, height: outerSize }}>
      <View style={[styles.ring, { width: outerSize, height: outerSize }]}>
        {/* Unwatched Story Ring (Vibrant Instagram Gradient) */}
        {ring === "new" ? (
          <LinearGradient
            colors={INSTAGRAM_STORY_GRADIENT}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: outerSize / 2 }]}
          />
        ) : ring === "watched" ? (
          /* Watched Story Ring (Muted slate gray border) */
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: outerSize / 2,
                borderWidth: 1.5,
                borderColor: colors.border ?? "rgba(255, 255, 255, 0.25)",
              },
            ]}
          />
        ) : null}

        {/* Gap Separator matching screen background for the clean cutout effect */}
        <View
          style={[
            styles.separator,
            {
              backgroundColor: separatorColor,
              width: separatorSize,
              height: separatorSize,
              borderRadius: separatorSize / 2,
              overflow: "hidden",
            },
          ]}
        >
          {uri && failedUri !== uri ? (
            <Image
              source={{ uri }}
              onError={() => setFailedUri(uri)}
              style={{ width: size, height: size, borderRadius: size / 2 }}
            />
          ) : (
            <View
              style={[
                styles.fallback,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: colors.card ?? "#1C1D2D",
                },
              ]}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: size * 0.38,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {name.charAt(0).toUpperCase() || "E"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Instagram-style Blue Plus Badge */}
      {add ? (
        <View
          style={[
            styles.plusBadge,
            {
              width: plusSize,
              height: plusSize,
              borderRadius: plusSize / 2,
              borderColor: separatorColor,
            },
          ]}
        >
          <Ionicons name="add" size={plusSize * 0.72} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0095F6", // Instagram electric blue
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
