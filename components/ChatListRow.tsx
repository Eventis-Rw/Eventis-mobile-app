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
  actionLabel,
  actionDisabled = false,
  onAction,
}: {
  contact: ChatContact;
  subtitle: string;
  time?: string;
  unreadCount?: number;
  muted?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  const colors = useChatColors();
  const displayName =
    contact.isInAddressBook === false ? contact.phone : contact.name;
  const date = time ? new Date(time) : null;
  const label =
    date?.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date?.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: unreadCount > 0 ? colors.glass : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${subtitle}${unreadCount ? `, ${unreadCount} unread` : ""}`}
        accessibilityHint={
          onLongPress ? "Hold to open conversation options" : undefined
        }
        style={({ pressed }) => [
          styles.main,
          pressed && { backgroundColor: colors.secondary },
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
              {displayName}
            </Text>
            {label ? (
              <Text
                style={[
                  styles.time,
                  {
                    color: unreadCount
                      ? colors.primary
                      : colors.mutedForeground,
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
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.count}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${displayName}`}
          accessibilityState={{ disabled: actionDisabled }}
          style={[
            styles.action,
            {
              backgroundColor: actionDisabled ? colors.secondary : colors.glass,
            },
          ]}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: actionDisabled ? colors.mutedForeground : colors.primary,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 82,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  copy: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    justifyContent: "center",
    gap: 7,
    paddingRight: 12,
    borderBottomWidth: 0,
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
  action: {
    minWidth: 68,
    minHeight: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    paddingHorizontal: 12,
  },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
