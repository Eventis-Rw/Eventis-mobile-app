import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassSurface } from "@/components/GlassSurface";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { APP_SHARE_MESSAGE, APP_SHARE_URL, shareApp } from "@/utils/shareApp";

export default function ShareAppScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const [status, setStatus] = useState("");

  const onShare = async () => {
    const result = await shareApp();
    if (result === "copied") setStatus("Link copied. Paste it anywhere.");
    else if (result === "shared") setStatus("Thanks for spreading Eventis.");
    else setStatus("");
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(`${APP_SHARE_MESSAGE} ${APP_SHARE_URL}`);
    setStatus("Link copied.");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          scheme === "dark"
            ? ["#1A2458", "#070814", "#070814"]
            : ["#D9E6FF", "#E8EEF8", "#F7F4FF"]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          {
            paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 28,
            paddingBottom: Platform.OS === "web" ? 120 : 128,
          },
        ]}
      >
        <GlassSurface style={styles.card}>
          <View style={[styles.logoPlate, { backgroundColor: colors.background }]}>
            <Logo style={styles.logo} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Share Eventis</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Send the app to friends so they can find concerts, nightlife, and events near them.
          </Text>
          <Text style={[styles.link, { color: colors.primary }]}>{APP_SHARE_URL}</Text>
          <Pressable
            onPress={() => void onShare()}
            accessibilityRole="button"
            accessibilityLabel="Share Eventis"
            style={[styles.primary, { backgroundColor: colors.primary }]}
          >
            <Feather name="share-2" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
              Share the app
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void onCopy()}
            accessibilityRole="button"
            accessibilityLabel="Copy Eventis link"
            style={[styles.secondary, { borderColor: colors.border }]}
          >
            <Feather name="link" size={16} color={colors.foreground} />
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>Copy link</Text>
          </Pressable>
          {status ? (
            <Text style={[styles.status, { color: colors.mutedForeground }]}>{status}</Text>
          ) : null}
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  logoPlate: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  link: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  primary: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  secondary: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  status: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
});
