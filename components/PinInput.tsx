import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function PinInput({ value, onChangeText, error }: { value: string; onChangeText: (value: string) => void; error?: string }) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.foreground }]}>5 digit PIN</Text>
      <View style={[styles.field, { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
        <TextInput value={value} onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, 5))}
          secureTextEntry={!visible} keyboardType="number-pad" maxLength={5} autoCorrect={false}
          autoComplete="off" accessibilityLabel="5 digit PIN" placeholder="Enter your PIN"
          placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
        <Pressable onPress={() => setVisible(!visible)} accessibilityRole="button" accessibilityLabel={visible ? "Hide PIN" : "Show PIN"} style={styles.toggle}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.destructive }}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 8 }, label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  field: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingLeft: 14, gap: 12, minHeight: 56 },
  input: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 14 },
  toggle: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
