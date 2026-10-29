import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { LivePerson } from "@/services/liveState";

export const liveColors = { bg: "#060A17", panel: "#0F172A", raised: "rgba(255,255,255,0.08)", line: "rgba(255,255,255,0.14)", text: "#F4F7FF", muted: "#A7B0C9", blue: "#38BDF8", red: "#EF4444", redButton: "#EF4444", redSoft: "#FF9AA5", redSurface: "#3B1D27", danger: "#FF7A87" };
export function LiveAvatar({ person, size = 44 }: { person: LivePerson; size?: number }) {
  const [failed, setFailed] = useState(false);
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: liveColors.raised, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: liveColors.blue, fontSize: size * .35, fontWeight: "700" }}>{person.name.slice(0, 1).toUpperCase()}</Text>
    {person.avatar && !failed ? <Image source={{ uri: person.avatar }} onError={() => setFailed(true)} style={{ position: "absolute", width: size, height: size }} /> : null}
  </View>;
}
export function LiveButton({ label, onPress, icon, secondary, disabled, danger, compact, tone = "blue" }: {
  label: string; onPress: () => void; icon?: React.ComponentProps<typeof Ionicons>["name"]; secondary?: boolean; disabled?: boolean; danger?: boolean; compact?: boolean; tone?: "blue" | "live";
}) {
  const color = secondary ? danger ? liveColors.danger : liveColors.text : danger ? liveColors.bg : tone === "live" ? "#FFFFFF" : liveColors.bg;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [liveStyles.button, { minHeight: compact ? 40 : 52, paddingHorizontal: compact ? 13 : 20, backgroundColor: secondary ? liveColors.raised : danger ? liveColors.danger : tone === "live" ? liveColors.redButton : liveColors.blue, opacity: disabled ? .4 : pressed ? .72 : 1 }]}>
    {icon ? <Ionicons name={icon} size={compact ? 17 : 21} color={color} /> : null}<Text style={{ color, fontWeight: "700", fontSize: compact ? 13 : 15 }}>{label}</Text>
  </Pressable>;
}
export function LiveIcon({ name, label, onPress }: { name: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={liveStyles.icon}><Ionicons name={name} size={23} color={liveColors.text} /></Pressable>;
}
/** Compact controls that stay legible over moving video. */
export function LiveOverlayAction({ name, label, caption, onPress, active, disabled, badge }: {
  name: React.ComponentProps<typeof Ionicons>["name"]; label: string; caption?: string;
  onPress: () => void; active?: boolean; disabled?: boolean; badge?: number;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!active }} disabled={disabled} hitSlop={4} onPress={onPress}
    style={({ pressed }) => ({ alignItems: "center", gap: 4, opacity: disabled ? .4 : pressed ? .6 : 1 })}>
    <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(239,68,68,.92)" : "rgba(8,12,22,.44)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)" }}>
      <Ionicons name={name} size={22} color="#FFF" />
      {badge ? <View style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: liveColors.red, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>{badge}</Text></View> : null}
    </View>
    {caption ? <Text style={{ color: "#FFF", fontSize: 10, fontFamily: "Inter_600SemiBold", textShadowColor: "#0009", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>{caption}</Text> : null}
  </Pressable>;
}
export function LiveSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const insets = useAppSafeAreaInsets();
  return <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={{ flex: 1, backgroundColor: "#000A", justifyContent: "flex-end", paddingTop: insets.top + 30 }}>
      <Pressable accessibilityLabel="Close panel" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={{ maxHeight: "92%", backgroundColor: liveColors.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
        <View style={[liveStyles.row, { justifyContent: "space-between", marginBottom: 14 }]}><Text style={[liveStyles.heading, { flex: 1 }]}>{title}</Text><LiveIcon name="close" label="Close panel" onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export const liveStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: { borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  heading: { color: liveColors.text, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -.4 },
  title: { color: liveColors.text, fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -.5 },
  body: { color: liveColors.muted, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  label: { color: liveColors.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  eyebrow: { color: liveColors.blue, fontSize: 11, fontWeight: "700", letterSpacing: 1.7 },
  card: { backgroundColor: liveColors.panel, borderWidth: 1, borderColor: liveColors.line, borderRadius: 22, padding: 18, gap: 12 },
  input: { color: liveColors.text, backgroundColor: liveColors.raised, borderRadius: 16, padding: 15, fontSize: 16, minHeight: 52 },
  error: { color: liveColors.danger, fontSize: 14, lineHeight: 20 },
  pill: { color: liveColors.blue, backgroundColor: "#12334A", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, overflow: "hidden", fontSize: 11, fontWeight: "700" },
  livePill: { color: "#FFFFFF", backgroundColor: liveColors.red },
});
