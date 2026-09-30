import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

const lightLogo = require("../assets/images/icon.png");
const darkLogo = require("../assets/images/icon-dark.png");

export function Logo({ style }: { style?: StyleProp<ImageStyle> }) {
  const { scheme } = useTheme();
  return (
    <Image
      source={scheme === "dark" ? darkLogo : lightLogo}
      style={style}
      resizeMode="contain"
      accessibilityLabel="Eventis logo"
    />
  );
}
