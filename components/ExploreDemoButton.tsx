import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function ExploreDemoButton() {
  const { exploreDemo } = useAuth();
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openDemo() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // The authentication navigator opens Home once the session is saved.
      await exploreDemo();
    } catch {
      setError("Couldn't open the demo. Please try again.");
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: 16, gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}
        disabled={busy} onPress={openDemo}
        style={{ minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: colors.primary }}>
        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
          {busy ? "Opening demo…" : "Explore demo"}
        </Text>
      </Pressable>
      <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 12 }}>
        Browse with a local demo account. No sign-in required.
      </Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</Text> : null}
    </View>
  );
}
