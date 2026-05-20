import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_CONVERSATIONS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, requestOTP } = useAuth();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const headerTop = Platform.OS === "web" ? 67 : insets.top;
  const isVerified = user?.isPhoneVerified ?? false;

  const openChat = useCallback(
    (convoId: string) => {
      if (!isVerified) {
        router.push({ pathname: "/auth/otp", params: { purpose: "chat" } } as any);
        return;
      }
      setSelectedConvo(convoId);
      setIsOpen(true);
    },
    [isVerified, router]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: headerTop + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        {!isVerified && (
          <View style={[styles.verifyBanner, { backgroundColor: colors.glass, borderColor: colors.primary }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.verifyText, { color: colors.foreground }]}>
              Verify your phone to start chatting
            </Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/auth/otp", params: { purpose: "chat" } } as any)
              }
            >
              <Text style={[styles.verifyAction, { color: colors.primary }]}>
                Verify
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {isVerified ? (
        <FlatList
          data={MOCK_CONVERSATIONS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(index * 80).springify() : undefined}
            >
              <Pressable
                style={[
                  styles.convoItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => openChat(item.id)}
              >
                <View
                  style={[
                    styles.convoAvatar,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="people-outline" size={20} color="#fff" />
                </View>
                <View style={styles.convoContent}>
                  <View style={styles.convoHeader}>
                    <Text
                      style={[styles.convoTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.eventTitle}
                    </Text>
                    <Text
                      style={[styles.convoTime, { color: colors.mutedForeground }]}
                    >
                      {item.lastMessageTime}
                    </Text>
                  </View>
                  <View style={styles.convoFooter}>
                    <Text
                      style={[styles.convoLastMsg, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.participantCount, { color: colors.mutedForeground }]}>
                    {item.participants} participants
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
          scrollEnabled={!!MOCK_CONVERSATIONS.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Book an event to join its group chat
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.lockedState}>
          <View
            style={[styles.lockIcon, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: colors.foreground }]}>
            Phone Verification Required
          </Text>
          <Text style={[styles.lockText, { color: colors.mutedForeground }]}>
            To prevent spam and keep the community safe, chat requires phone verification.
          </Text>
          <Pressable
            style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({ pathname: "/auth/otp", params: { purpose: "chat" } } as any)
            }
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
            <Text style={styles.verifyBtnText}>Verify Phone Number</Text>
          </Pressable>
        </View>
      )}

      {isOpen && selectedConvo && (
        <ChatRoom
          convoId={selectedConvo}
          onClose={() => setIsOpen(false)}
          colors={colors}
        />
      )}
    </View>
  );
}

import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { MOCK_MESSAGES } from "@/constants/mockData";

function ChatRoom({
  convoId,
  onClose,
  colors,
}: {
  convoId: string;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const convo = MOCK_CONVERSATIONS.find((c) => c.id === convoId)!;
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [text, setText] = useState("");

  const send = useCallback(() => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: "current_user",
        senderName: "You",
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
      },
    ]);
    setText("");
  }, [text]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 50 }]}>
      <View
        style={[
          chatStyles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={chatStyles.headerInfo}>
          <Text style={[chatStyles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {convo.eventTitle}
          </Text>
          <Text style={[chatStyles.headerSub, { color: colors.mutedForeground }]}>
            {convo.participants} participants
          </Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={chatStyles.messageList}
          renderItem={({ item }) => (
            <View
              style={[
                chatStyles.bubble,
                item.isOwn ? chatStyles.ownBubble : chatStyles.otherBubble,
                {
                  backgroundColor: item.isOwn ? colors.primary : colors.secondary,
                },
              ]}
            >
              {!item.isOwn && (
                <Text style={[chatStyles.sender, { color: colors.primary }]}>
                  {item.senderName}
                </Text>
              )}
              <Text style={[chatStyles.message, { color: item.isOwn ? "#fff" : colors.foreground }]}>
                {item.content}
              </Text>
              <Text style={[chatStyles.time, { color: item.isOwn ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                {item.timestamp}
              </Text>
            </View>
          )}
          scrollEnabled={!!messages.length}
        />

        <View
          style={[
            chatStyles.inputRow,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <View style={[chatStyles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[chatStyles.inputField, { color: colors.foreground }]}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>
          <Pressable
            style={[
              chatStyles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.border },
            ]}
            onPress={send}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

import { TextInput } from "react-native";

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    gap: 2,
  },
  ownBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  otherBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  message: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  inputField: { fontSize: 15, fontFamily: "Inter_400Regular" },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 14 },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  verifyText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  verifyAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  convoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  convoContent: { flex: 1 },
  convoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convoTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", marginRight: 8 },
  convoTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  convoFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 8,
  },
  convoLastMsg: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  participantCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  lockedState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lockTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  lockText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
