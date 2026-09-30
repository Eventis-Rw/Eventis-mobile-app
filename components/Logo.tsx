import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

const whiteLogo = require("../assets/images/logo-white.png");
const primaryLogo = require("../assets/images/logo-primary.png");
const vibrantLogo = require("../assets/images/logo-vibrant.png");
const officialLogo = require("../assets/images/logo-official.png");

export interface LogoProps {
  style?: StyleProp<ImageStyle>;
  variant?: "auto" | "white" | "primary" | "vibrant" | "official";
}

export function Logo({ style, variant = "auto" }: LogoProps) {
  const { scheme } = useTheme();
  const source =
    variant === "white"
      ? whiteLogo
      : variant === "primary"
      ? primaryLogo
      : variant === "official"
      ? officialLogo
      : variant === "vibrant"
      ? vibrantLogo
      : scheme === "dark"
      ? vibrantLogo
      : primaryLogo;

  return (
    <Image
      source={source}
      style={style}
      resizeMode="contain"
      accessibilityLabel="Eventis logo"
    />
  );
}
