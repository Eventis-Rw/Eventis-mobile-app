import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton } from "@/components/SkeletonLoader";
import { ContactNameEditor } from "@/components/ContactNameEditor";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import type { ChatMessage } from "@/services/chatService";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const colors = useColors();
  const outgoing = message.direction === "outgoing";
  return (
    <View style={[styles.messageRow, outgoing ? styles.outgoingRow : styles.incomingRow]}>
      <View
        style={[
          styles.bubble,
          outgoing
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 5 }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 5 },
        ]}
      >
        <Text style={[styles.messageText, { color: outgoing ? colors.primaryForeground : colors.foreground }]}>{message.text}</Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, { color: outgoing ? "rgba(255,255,255,0.72)" : colors.mutedForeground }]}>{formatMessageTime(message.sentAt)}</Text>
          {outgoing ? <Ionicons name={message.status === "pending" ? "time-outline" : message.status === "read" ? "checkmark-done" : "checkmark"} size={13} color="rgba(255,255,255,0.78)" /> : null}
        </View>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { isLoading, getConversation, getContact, messagesByConversation, loadMessages, sendMessage, markConversationRead, updateContactName } = useChat();
  const [composer, setComposer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const conversation = getConversation(id ?? "");
  const contact = conversation ? getContact(conversation.contactId) : undefined;
  const messages = useMemo(() => messagesByConversation[id ?? ""] ?? [], [id, messagesByConversation]);
  const messagesLoaded = Boolean(id && messagesByConversation[id]);

  useEffect(() => {
    if (!id || !conversation) return;
    void loadMessages(id);
    void markConversationRead(id);
  }, [conversation?.id, id, loadMessages, markConversationRead]);

  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  const send = useCallback(async () => {
    const text = composer.trim();
    if (!text || !id || isSending) return;
    setComposer("");
    setIsSending(true);
    try {
      await sendMessage(id, text);
    } finally {
      setIsSending(false);
    }
  }, [composer, id, isSending, sendMessage]);
  const saveContactName = useCallback(async (contactId: string, name: string) => {
    await updateContactName(contactId, name);
  }, [updateContactName]);

  if (isLoading || (conversation && !messagesLoaded)) {
    return (
      <View style={[styles.root, styles.loadingScreen, { backgroundColor: colors.background, paddingTop: insets.top + 18 }]}>
        <View style={styles.loadingHeader}><Skeleton width={42} height={42} borderRadius={21} /><View style={styles.loadingHeaderCopy}><Skeleton width={130} height={17} /><Skeleton width={75} height={10} style={styles.loadingGap} /></View></View>
        <View style={styles.loadingMessages}><Skeleton width="72%" height={58} borderRadius={18} /><Skeleton width="64%" height={70} borderRadius={18} style={styles.loadingOutgoing} /><Skeleton width="56%" height={52} borderRadius={18} /></View>
      </View>
    );
  }

  if (!conversation || !contact) {
    return (
      <View style={[styles.root, styles.notFound, { backgroundColor: colors.background }]}>
        <View style={[styles.notFoundIcon, { backgroundColor: colors.glass }]}><Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} /></View>
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Conversation unavailable</Text>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>This demo conversation could not be found.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.backToChat, { backgroundColor: colors.primary }]}><Text style={styles.backToChatText}>Back to chat</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} style={styles.headerButton}><Ionicons name="chevron-back" size={26} color={colors.foreground} /></Pressable>
        <Pressable onPress={() => setEditingName(true)} accessibilityRole="button" accessibilityLabel={`Open contact details for ${contact.name}`} style={styles.profileButton}>
          <View>
            <Image source={{ uri: contact.avatarUrl }} style={[styles.avatar, { backgroundColor: colors.secondary }]} accessibilityLabel={`Profile photo of ${contact.name}`} />
            {contact.isOnline ? <View style={[styles.headerOnlineDot, { backgroundColor: colors.success, borderColor: colors.surface }]} /> : null}
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{contact.name}</Text>
            <Text style={[styles.presence, { color: contact.isOnline ? colors.success : colors.mutedForeground }]}>{contact.isOnline ? "Online" : "Eventis contact"}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setEditingName(true)} accessibilityRole="button" accessibilityLabel="Edit contact name" style={[styles.headerButton, { backgroundColor: colors.secondary }]}><Ionicons name="ellipsis-horizontal" size={20} color={colors.foreground} /></Pressable>
      </View>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={<View style={styles.dayPill}><Text style={[styles.dayText, { color: colors.mutedForeground, backgroundColor: colors.secondary }]}>Today</Text></View>}
          ListEmptyComponent={<View style={styles.emptyConversation}><View style={[styles.waveIcon, { backgroundColor: colors.glass }]}><Text style={styles.waveEmoji}>👋</Text></View><Text style={[styles.emptyConversationTitle, { color: colors.foreground }]}>Say hello to {contact.name.split(" ")[0]}</Text><Text style={[styles.emptyConversationText, { color: colors.mutedForeground }]}>This is the beginning of your Eventis conversation.</Text></View>}
        />

        <View style={[styles.composerRow, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add attachment" style={styles.composerIcon}><Ionicons name="add" size={25} color={colors.primary} /></Pressable>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            placeholder={`Message ${contact.name.split(" ")[0]}`}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            multiline
            maxLength={1000}
            accessibilityLabel={`Message ${contact.name}`}
          />
          <Pressable onPress={() => void send()} disabled={!composer.trim() || isSending} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !composer.trim() || isSending }} style={[styles.sendButton, { backgroundColor: composer.trim() ? colors.primary : colors.disabled }]}><Ionicons name="arrow-up" size={21} color="#FFFFFF" /></Pressable>
        </View>
      </KeyboardAvoidingView>
      <ContactNameEditor contact={editingName ? contact : null} onClose={() => setEditingName(false)} onSave={saveContactName} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, keyboardView: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 }, headerOnlineDot: { position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  profileButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }, headerCopy: { flex: 1 }, name: { fontFamily: "Inter_700Bold", fontSize: 15 }, presence: { fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 3 },
  messages: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 14, paddingVertical: 16, gap: 7 },
  dayPill: { alignItems: "center", marginBottom: 13 }, dayText: { overflow: "hidden", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5, fontFamily: "Inter_600SemiBold", fontSize: 9 },
  messageRow: { width: "100%", flexDirection: "row" }, outgoingRow: { justifyContent: "flex-end" }, incomingRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", minWidth: 82, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6, borderRadius: 18 }, messageText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 }, messageMeta: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }, messageTime: { fontFamily: "Inter_500Medium", fontSize: 8 },
  composerRow: { minHeight: 64, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth }, composerIcon: { width: 34, height: 43, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 43, maxHeight: 110, borderWidth: 1, borderRadius: 21, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 10, fontFamily: "Inter_400Regular", fontSize: 14 }, sendButton: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyConversation: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 }, waveIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" }, waveEmoji: { fontSize: 27 }, emptyConversationTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 14 }, emptyConversationText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  loadingScreen: { paddingHorizontal: 18 }, loadingHeader: { flexDirection: "row", alignItems: "center", gap: 12 }, loadingHeaderCopy: { flex: 1 }, loadingGap: { marginTop: 7 }, loadingMessages: { marginTop: 90, gap: 16 }, loadingOutgoing: { alignSelf: "flex-end" },
  notFound: { alignItems: "center", justifyContent: "center", padding: 30 }, notFoundIcon: { width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center" }, notFoundTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 16 }, notFoundText: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" }, backToChat: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 }, backToChatText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 },
});
