import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useChatColors } from "@/hooks/useChatColors";

const EMOJIS = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "😊",
  "😎",
  "🥳",
  "🤔",
  "😢",
  "😭",
  "😅",
  "😮",
  "😴",
  "🙌",
  "👏",
  "👍",
  "👎",
  "🙏",
  "💪",
  "👋",
  "❤️",
  "💙",
  "🔥",
  "✨",
  "🎉",
  "🎵",
  "📍",
  "🎟️",
  "🍽️",
  "☕",
  "✅",
  "💯",
];

export function ChatEmojiPicker({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const colors = useChatColors();
  if (!visible) return null;

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.panel,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Emoji</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close emoji picker"
          style={styles.close}
        >
          <Ionicons name="close" size={23} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onSelect(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${emoji}`}
            style={({ pressed }) => [
              styles.emoji,
              pressed && { backgroundColor: colors.secondary },
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    maxHeight: 230,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  header: {
    minHeight: 42,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  close: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 9,
  },
  emoji: {
    width: "12.5%",
    minHeight: 45,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 26 },
});
