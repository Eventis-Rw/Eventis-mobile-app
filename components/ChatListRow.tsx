import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useChatColors } from "@/hooks/useChatColors";
import type { ChatContact, ChatMessage } from "@/services/chatService";

export function ChatListRow({
  contact,
  subtitle,
  lastMessageStatus,
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
  lastMessageStatus?: ChatMessage["status"];
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
    contact.isInAddressBook === false && contact.phone
      ? contact.phone
      : contact.name;
  const date = time ? new Date(time) : null;
  const label =
    date?.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date?.toLocaleDateString([], { month: "short", day: "numeric" });
  const isUnread = unreadCount > 0;
  const isMissedCall = !contact.blocked && subtitle.toLowerCase().includes("missed");
  const isVideoMissed = isMissedCall && subtitle.toLowerCase().includes("video");

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${subtitle}${lastMessageStatus && !contact.blocked ? `, ${lastMessageStatus}` : ""}${unreadCount ? `, ${unreadCount} unread` : ""}`}
        accessibilityHint={
          onLongPress ? "Hold to open conversation options" : undefined
        }
        style={({ pressed }) => [
          styles.main,
          pressed && { backgroundColor: colors.secondary },
        ]}
      >
        <View style={styles.avatarWrap}>
          {contact.avatarUrl ? (
            <Image
              source={{ uri: contact.avatarUrl }}
              style={[styles.avatar, { backgroundColor: colors.secondary }]}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
              <Ionicons
                name={contact.isGroup || contact.id.startsWith("group:") ? "people" : "person"}
                size={22}
                color={colors.mutedForeground}
              />
            </View>
          )}
        </View>

        <View style={[styles.copy, { borderBottomColor: colors.border }]}>
          <View style={styles.line}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                {
                  color: colors.foreground,
                  fontFamily: isUnread ? "Inter_700Bold" : "Inter_600SemiBold",
                },
              ]}
            >
              {displayName}
            </Text>
            {label ? (
              <Text
                style={[
                  styles.time,
                  {
                    color: isUnread ? colors.primary : colors.mutedForeground,
                    fontFamily: isUnread ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {label}
              </Text>
            ) : null}
          </View>
          <View style={styles.line}>
            {isMissedCall ? (
              <Ionicons
                name={isVideoMissed ? "videocam" : "call"}
                size={14}
                color="#EF4444"
                style={styles.statusIcon}
              />
            ) : lastMessageStatus && !contact.blocked ? (
              <MaterialCommunityIcons
                name={
                  lastMessageStatus === "pending"
                    ? "clock-outline"
                    : lastMessageStatus === "sent"
                    ? "check"
                    : "check-all"
                }
                size={16}
                color={lastMessageStatus === "read" ? colors.receipt : colors.mutedForeground}
                style={styles.statusIcon}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                {
                  color: isMissedCall
                    ? "#EF4444"
                    : isUnread
                      ? colors.foreground
                      : colors.mutedForeground,
                  fontFamily: isUnread || isMissedCall ? "Inter_500Medium" : "Inter_400Regular",
                },
              ]}
            >
              {contact.blocked ? "Blocked contact" : subtitle}
            </Text>
            {muted ? (
              <Ionicons
                name="notifications-off"
                size={14}
                color={colors.mutedForeground}
                style={styles.muteIcon}
              />
            ) : null}
            {isUnread ? (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
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
    backgroundColor: "transparent",
    width: "100%",
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 13,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  copy: {
    flex: 1,
    minWidth: 0,
    minHeight: 74,
    justifyContent: "center",
    gap: 5,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: 16 },
  time: { fontSize: 12 },
  statusIcon: { marginRight: 2 },
  muteIcon: { marginLeft: 2 },
  subtitle: { flex: 1, fontSize: 14, lineHeight: 19 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  count: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  action: {
    minWidth: 68,
    minHeight: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    paddingHorizontal: 12,
  },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
