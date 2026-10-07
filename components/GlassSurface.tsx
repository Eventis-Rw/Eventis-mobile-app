import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type GlassSurfaceProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

/** Frosted panel. On web the blur is a CSS backdrop filter; native uses BlurView. */
export function GlassSurface({ children, style, intensity = 48 }: GlassSurfaceProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const webBlur =
    Platform.OS === "web"
      ? ({
          backdropFilter: "blur(22px) saturate(1.4)",
          WebkitBackdropFilter: "blur(22px) saturate(1.4)",
        } as ViewStyle)
      : null;

  return (
    <View
      style={[
        styles.shell,
        webBlur,
        {
          backgroundColor: colors.glass,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {Platform.OS !== "web" ? (
        <BlurView
          intensity={intensity}
          tint={scheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
