import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const translate = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const conversation = message
    ? chat?.getConversation(message.conversationId)
    : undefined;
  const senderName =
    (message?.senderId
      ? chat?.contacts.find((contact) => contact.id === message.senderId)?.name
      : undefined) ??
    (conversation ? chat?.getContact(conversation.contactId)?.name : undefined);

  const dismiss = message ? chat?.dismissNotification : ctx?.dismissPopup;
  const swipeResponder = useMemo(() => {
    const reset = () => Animated.parallel([swipeX, swipeY].map(value =>
      Animated.spring(value, { toValue: 0, useNativeDriver: true })
    )).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy < -8 || Math.abs(g.dx) > 12,
      onPanResponderMove: (_, g) => {
        swipeX.setValue(g.dx);
        swipeY.setValue(Math.min(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -32 || g.vy < -0.6 || Math.abs(g.dx) > 65 || Math.abs(g.vx) > 0.6) {
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

  useEffect(() => setReply(""), [message?.conversationId, message?.text]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, { toValue: -120, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translate, opacity]);

  if (!ctx && !chat) return null;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Animated.View
        {...swipeResponder.panHandlers}
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.wrap,
          {
            top: insets.top + 8,
            transform: [{ translateY: Animated.add(translate, swipeY) }, { translateX: swipeX }],
            opacity,
          },
        ]}
      >
        {message ? (
          <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...(Platform.OS === "web" ? { boxShadow: "0 8px 24px rgba(0,0,0,0.18)" as any } : { elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }) }]}>
            <Pressable
              style={styles.body}
              onPress={() => {
                const id = message.conversationId;
                chat?.dismissNotification();
                router.push({ pathname: "/chat/[id]", params: { id } });
              }}
            >
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{senderName || "New message"}</Text>
              <Text style={[styles.text, { color: colors.mutedForeground }]} numberOfLines={2}>{message.text}</Text>
            </Pressable>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Reply…"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Reply to message"
              returnKeyType="send"
              style={[styles.reply, { color: colors.foreground, borderColor: colors.border }]}
              onSubmitEditing={() => {
                const text = reply.trim();
                if (!text || sending) return;
                setSending(true);
                void chat?.sendMessage(message.conversationId, text).then(() => setReply("")).catch(() => undefined).finally(() => setSending(false));
              }}
            />
            {reply.trim().length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Send reply" disabled={sending} onPress={() => {
              const text = reply.trim();
              if (!text || sending) return;
              setSending(true);
              void chat?.sendMessage(message.conversationId, text).then(() => setReply("")).catch(() => undefined).finally(() => setSending(false));
            }} style={styles.close}><Ionicons name="send" size={18} color={colors.primary} /></Pressable> : null}
          </Animated.View>
        ) : popup && ctx ? (
          <Pressable
            onPress={() => {
              ctx.dismissPopup();
              router.push("/notifications" as any);
            }}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...(Platform.OS === "web" ? { boxShadow: "0 8px 24px rgba(0,0,0,0.18)" as any } : { elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }),
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="notifications" size={18} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{popup.title}</Text>
              <Text style={[styles.text, { color: colors.mutedForeground }]} numberOfLines={2}>{popup.body}</Text>
            </View>
            <Pressable onPress={ctx.dismissPopup} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  reply: { minWidth: 100, maxWidth: 145, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  close: { padding: 4 },
});
