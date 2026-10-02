import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useChatColors } from "@/hooks/useChatColors";
import type { ChatContact } from "@/services/chatService";

export function ChatListRow({
  contact,
  subtitle,
  time,
  unreadCount = 0,
  muted,
  onPress,
  onLongPress,
}: {
  contact: ChatContact;
  subtitle: string;
  time?: string;
  unreadCount?: number;
  muted?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const colors = useChatColors();
  const date = time ? new Date(time) : null;
  const label =
    date?.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date?.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${contact.name}, ${subtitle}${unreadCount ? `, ${unreadCount} unread` : ""}`}
      accessibilityHint={
        onLongPress ? "Hold to open conversation options" : undefined
      }
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.secondary : colors.background },
      ]}
    >
      <Image
        source={{ uri: contact.avatarUrl }}
        style={[styles.avatar, { backgroundColor: colors.secondary }]}
      />
      <View style={[styles.copy, { borderBottomColor: colors.border }]}>
        <View style={styles.line}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.foreground }]}
          >
            {contact.name}
          </Text>
          {label ? (
            <Text
              style={[
                styles.time,
                {
                  color: unreadCount ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {label}
            </Text>
          ) : null}
        </View>
        <View style={styles.line}>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: colors.mutedForeground }]}
          >
            {contact.blocked ? "Blocked contact" : subtitle}
          </Text>
          {muted ? (
            <Ionicons
              name="notifications-off"
              size={15}
              color={colors.mutedForeground}
            />
          ) : null}
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.count}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    gap: 14,
    minHeight: 82,
  },
  avatar: { width: 53, height: 53, borderRadius: 27 },
  copy: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    justifyContent: "center",
    gap: 7,
    paddingRight: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  time: { fontSize: 11 },
  subtitle: { flex: 1, fontSize: 13, lineHeight: 19 },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
