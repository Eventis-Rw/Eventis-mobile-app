import React, { useId, useState } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const STORY_RING_COLORS = ["#22D3EE", "#2795FF", "#4169F5", "#8B6CEF"] as const;

export function StoryAvatar({ name, uri, size = 58, ring, add = false, surfaceColor }: { name: string; uri?: string; size?: number; ring?: "new" | "watched"; add?: boolean; surfaceColor?: string }) {
  const colors = useColors();
  const gradientId = `story-ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [failedUri, setFailedUri] = useState<string>();
  const separatorColor = surfaceColor ?? colors.background;
  return <View style={{ width: size + 8, height: size + 8 }}>
    <View style={[styles.ring, { width: size + 8, height: size + 8 }]}>
      {ring ? (
        <Svg width={size + 8} height={size + 8} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs><LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {STORY_RING_COLORS.map((color, index) => <Stop key={color} offset={`${index / 3 * 100}%`} stopColor={color} />)}
          </LinearGradient></Defs>
          <Circle cx={(size + 8) / 2} cy={(size + 8) / 2} r={(size + 5) / 2}
            fill="none" stroke={ring === "new" ? `url(#${gradientId})` : "#697586"} strokeWidth={ring === "new" ? 2.5 : 1.5} />
        </Svg>
      ) : null}
      <View style={[styles.separator, { width: size, height: size, borderRadius: size / 2, overflow: "hidden" }]}>
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

