import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const STORY_RING_COLORS = ["#22D3EE", "#2795FF", "#4169F5", "#8B6CEF"] as const;

export function StoryAvatar({ name, uri, size = 58, ring, add = false, surfaceColor }: { name: string; uri?: string; size?: number; ring?: "new" | "watched"; add?: boolean; surfaceColor?: string }) {
  const colors = useColors();
  const [failedUri, setFailedUri] = useState<string>();
  const separatorColor = surfaceColor ?? colors.background;
  return <View style={{ width: size + 8, height: size + 8 }}>
    <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: ring === "watched" ? "#697586" : "transparent" }]}>
      {ring === "new" ? (
        <LinearGradient
          colors={STORY_RING_COLORS}
          locations={[0, 0.32, 0.68, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: (size + 8) / 2 }]}
          pointerEvents="none"
        />
      ) : null}
      <View style={[styles.separator, { width: size + 3, height: size + 3, borderRadius: (size + 3) / 2, backgroundColor: ring ? separatorColor : "transparent" }]}>
        {uri && failedUri !== uri ? <Image source={{ uri }} onError={() => setFailedUri(uri)} style={{ width: size, height: size, borderRadius: size / 2 }} />
          : <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={{ color: "#DAEAFF", fontSize: size * 0.36, fontFamily: "Inter_700Bold" }}>{name.charAt(0).toUpperCase() || "E"}</Text></View>}
      </View>
    </View>
    {add ? <View style={[styles.plus, { borderColor: separatorColor }]}><Text style={styles.plusText}>+</Text></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  ring: { alignItems: "center", justifyContent: "center" },
  separator: { alignItems: "center", justifyContent: "center" },
  fallback: { backgroundColor: "#223654", alignItems: "center", justifyContent: "center" },
  plus: { position: "absolute", bottom: 0, right: 0, width: 21, height: 21, borderRadius: 11, backgroundColor: "#397EEB", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  plusText: { color: "white", fontSize: 15, fontWeight: "700", lineHeight: 17 },
});

