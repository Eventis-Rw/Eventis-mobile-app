import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { notificationPalette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useNotificationsOptional } from "@/context/NotificationsContext";
import { useChatOptional } from "@/context/ChatContext";

export function NotificationPopupHost() {
  const ctx = useNotificationsOptional();
  const chat = useChatOptional();
  const popup = ctx?.popup;
  const message = chat?.notification;
  const visible = Boolean(message || popup);
  const colors = useColors();
  const { scheme } = useTheme();
  const palette = notificationPalette[scheme];
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const translate = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [failedReply, setFailedReply] = useState<typeof message>(null);
  const pendingReply = useRef(false);
  const conversation = message
    ? chat?.getConversation(message.conversationId)
    : undefined;
  const senderPhoto = chat?.contacts.find(c => c.id === (message?.senderId ?? conversation?.contactId))?.avatarUrl;
  const senderName =
    (message?.senderId
      ? chat?.contacts.find((contact) => contact.id === message.senderId)?.name
      : undefined) ??
    (conversation ? chat?.getContact(conversation.contactId)?.name : undefined);

  const dismiss = message ? chat?.dismissNotification : ctx?.dismissPopup;
  const swipeResponder = useMemo(() => {
    const reset = () =>
      Animated.parallel(
        [swipeX, swipeY].map((value) =>
          Animated.spring(value, { toValue: 0, useNativeDriver: true }),
        ),
      ).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.dy < -8 || Math.abs(g.dx) > 12,
      onPanResponderMove: (_, g) => {
        swipeX.setValue(g.dx);
        swipeY.setValue(Math.min(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (
          g.dy < -32 ||
          g.vy < -0.6 ||
          Math.abs(g.dx) > 65 ||
          Math.abs(g.vx) > 0.6
        ) {
          dismiss?.();
        } else reset();
      },
      onPanResponderTerminate: reset,
    });
  }, [dismiss, swipeX, swipeY]);

  useEffect(() => {
    swipeX.setValue(0);
    swipeY.setValue(0);
  }, [message, popup, swipeX, swipeY]);

  useEffect(() => setReply(""), [message?.conversationId]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, {
          toValue: -120,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translate, opacity]);

  const sendReply = () => {
    const text = reply.trim();
    if (!message || !text || pendingReply.current || !chat) return;
    pendingReply.current = true;
    setFailedReply(null);
    setSending(true);
    void chat.markConversationRead(message.conversationId).catch(() => undefined);
    void chat
      .sendMessage(message.conversationId, text)
      .then(() => {
        setReply(current => current.trim() === text ? "" : current);
        chat.dismissNotification(message);
      })
      .catch(() => setFailedReply(message))
      .finally(() => {
        pendingReply.current = false;
        setSending(false);
      });
  };

  if (!ctx && !chat) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
    >
      <Animated.View
        {...swipeResponder.panHandlers}
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.wrap,
          {
            top: insets.top + 8,
            transform: [
              { translateY: Animated.add(translate, swipeY) },
              { translateX: swipeX },
            ],
            opacity,
          },
        ]}
      >
        {message || popup ? (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: palette.input }]}>
                {message && senderPhoto ? <Image source={{ uri: senderPhoto }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Ionicons
                  name={
                    message ? "chatbubble-ellipses" : "notifications-outline"
                  }
                  size={20}
                  color={colors.primary}
                />}
              </View>
              <Pressable
                accessibilityRole="button"
                style={styles.body}
                onPress={() => {
                  dismiss?.();
                  if (message)
                    router.navigate({
                      pathname: "/chat/[id]",
                      params: { id: message.conversationId },
                    });
                  else router.push("/notifications");
                }}
              >
                <Text
                  style={[styles.title, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {message ? senderName || "New message" : popup?.title}
                </Text>
                <Text
                  style={[styles.text, { color: colors.mutedForeground }]}
                  numberOfLines={3}
                >
                  {message ? message.previews?.join("\n") ?? message.text : popup?.body}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
                onPress={() => dismiss?.()}
                style={styles.close}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            {message && failedReply === message && (
              <Text accessibilityLiveRegion="polite" style={{ color: colors.destructive }}>Reply couldn’t send. Try again.</Text>
            )}
            {message ? (
              <View
                style={[styles.replyRow, { backgroundColor: palette.input }]}
              >
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Reply to message…"
                  placeholderTextColor={colors.mutedForeground}
                  accessibilityLabel="Reply to message"
                  returnKeyType="send"
                  style={[styles.reply, { color: colors.foreground }]}
                  onSubmitEditing={sendReply}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send reply"
                  disabled={sending || !reply.trim()}
                  onPress={sendReply}
                  style={[
                    styles.send,
                    {
                      backgroundColor: colors.primary,
                      opacity: sending || !reply.trim() ? 0.4 : 1,
                    },
                  ]}
                >
                  <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }
      : {
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }),
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4, paddingTop: 1 },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 5,
    gap: 8,
  },
  reply: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  text: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  close: {
    width: 32,
    height: 40,
    marginRight: -6,
    alignItems: "center",
    justifyContent: "center",
  },
});
