import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/constants/mockData";
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
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="border-b border-border px-5 pb-4 dark:border-border-dark"
        style={{ paddingTop: headerTop + 8 }}
      >
        <Text className="mb-3.5 text-[28px] font-bold text-foreground dark:text-foreground-dark">
          Messages
        </Text>
        {!isVerified && (
          <View className="flex-row items-center gap-2.5 rounded-xl border border-primary bg-glass p-3 dark:bg-glass-dark">
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text className="flex-1 text-[13px] font-sans text-foreground dark:text-foreground-dark">
              Verify your phone to start chatting
            </Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/auth/otp", params: { purpose: "chat" } } as any)
              }
            >
              <Text className="text-[13px] font-semibold text-primary">Verify</Text>
            </Pressable>
          </View>
        )}
      </View>

      {isVerified ? (
        <FlatList
          data={MOCK_CONVERSATIONS}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pt-4"
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(index * 80).springify() : undefined}
            >
              <Pressable
                className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark"
                onPress={() => openChat(item.id)}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
                  <Ionicons name="people-outline" size={20} color="#fff" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="mr-2 flex-1 text-[15px] font-semibold text-foreground dark:text-foreground-dark"
                      numberOfLines={1}
                    >
                      {item.eventTitle}
                    </Text>
                    <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
                      {item.lastMessageTime}
                    </Text>
                  </View>
                  <View className="mt-[3px] flex-row items-center gap-2">
                    <Text
                      className="flex-1 text-[13px] font-sans text-muted-foreground dark:text-muted-foreground-dark"
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View className="h-5 min-w-[20px] items-center justify-center rounded-[10px] bg-primary px-1.5">
                        <Text className="text-[11px] font-bold text-primary-foreground">
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-0.5 text-[11px] font-sans text-muted-foreground dark:text-muted-foreground-dark">
                    {item.participants} participants
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
          scrollEnabled={!!MOCK_CONVERSATIONS.length}
          ListEmptyComponent={
            <View className="items-center gap-3 pt-[60px]">
              <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                No conversations yet
              </Text>
              <Text className="px-10 text-center text-sm font-sans text-muted-foreground dark:text-muted-foreground-dark">
                Book an event to join its group chat
              </Text>
            </View>
          }
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="mb-2 h-20 w-20 items-center justify-center rounded-full bg-secondary dark:bg-secondary-dark">
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text className="text-center text-[22px] font-bold text-foreground dark:text-foreground-dark">
            Phone Verification Required
          </Text>
          <Text className="text-center text-[15px] font-sans leading-6 text-muted-foreground dark:text-muted-foreground-dark">
            To prevent spam and keep the community safe, chat requires phone verification.
          </Text>
          <Pressable
            className="mt-2 flex-row items-center gap-2 rounded-[14px] bg-primary px-7 py-3.5"
            onPress={() =>
              router.push({ pathname: "/auth/otp", params: { purpose: "chat" } } as any)
            }
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
            <Text className="text-base font-semibold text-primary-foreground">
              Verify Phone Number
            </Text>
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
    <View className="absolute inset-0 z-50 bg-background dark:bg-background-dark">
      <View
        className="flex-row items-center gap-3 border-b border-border bg-card px-4 pb-3 dark:border-border-dark dark:bg-card-dark"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-foreground dark:text-foreground-dark"
            numberOfLines={1}
          >
            {convo.eventTitle}
          </Text>
          <Text className="text-xs font-sans text-muted-foreground dark:text-muted-foreground-dark">
            {convo.participants} participants
          </Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-2 p-4"
          renderItem={({ item }) => (
            <View
              className={`max-w-[80%] gap-0.5 rounded-2xl p-3 ${
                item.isOwn
                  ? "self-end rounded-br-sm bg-primary"
                  : "self-start rounded-bl-sm bg-secondary dark:bg-secondary-dark"
              }`}
            >
              {!item.isOwn && (
                <Text className="mb-0.5 text-xs font-semibold text-primary">
                  {item.senderName}
                </Text>
              )}
              <Text
                className={`text-[15px] font-sans leading-[22px] ${
                  item.isOwn
                    ? "text-primary-foreground"
                    : "text-foreground dark:text-foreground-dark"
                }`}
              >
                {item.content}
              </Text>
              <Text
                className={`self-end text-[11px] font-sans ${
                  item.isOwn
                    ? "text-primary-foreground/60"
                    : "text-muted-foreground dark:text-muted-foreground-dark"
                }`}
              >
                {item.timestamp}
              </Text>
            </View>
          )}
          scrollEnabled={!!messages.length}
        />

        <View
          className="flex-row items-end gap-2.5 border-t border-border bg-card p-3 dark:border-border-dark dark:bg-card-dark"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="max-h-[120px] flex-1 rounded-[22px] border border-border bg-input px-4 py-2.5 dark:border-border-dark dark:bg-input-dark">
            <TextInput
              className="text-[15px] font-sans text-foreground dark:text-foreground-dark"
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>
          <Pressable
            className={`h-[42px] w-[42px] items-center justify-center rounded-full ${
              text.trim() ? "bg-primary" : "bg-border dark:bg-border-dark"
            }`}
            onPress={send}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
