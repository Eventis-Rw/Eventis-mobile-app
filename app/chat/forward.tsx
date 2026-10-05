import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { ChatListRow } from "@/components/ChatListRow";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

export default function ForwardMessageScreen() {
  const { conversationId, messageId } = useLocalSearchParams<{
    conversationId: string;
    messageId: string;
  }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const message =
    chat.allMessages.find(
      (item) => item.id === messageId && item.conversationId === conversationId,
    ) ??
    chat.messagesByConversation[conversationId]?.find(
      (item) => item.id === messageId,
    );
  const contacts = useMemo(
    () =>
      chat.contacts.filter(
        (contact) =>
          contact.isEventisUser &&
          !contact.blocked &&
          `${contact.name} ${contact.phone}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [chat.contacts, query],
  );
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");
  async function forward(contactId: string) {
    if (!message || sendingId) return;
    setSendingId(contactId);
    setError("");
    try {
      const target = await chat.startConversation(contactId);
      await chat.sendMessage(target.id, message.text, {
        forwarded: true,
        imageUri: message.imageUri,
        audioUri: message.audioUri,
        audioDurationMs: message.audioDurationMs,
      });
      router.dismissTo({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not forward this message.",
      );
    } finally {
      setSendingId(null);
    }
  }
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.workspace, { paddingTop: insets.top + 4 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.icon}
          >
            <Ionicons name="chevron-back" size={27} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Forward to
          </Text>
        </View>
        <View style={[styles.search, { backgroundColor: colors.input }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search contacts"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}
        {!message ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.foreground }}>
              This message is no longer available.
            </Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <ChatListRow
                contact={item}
                subtitle={item.headline}
                onPress={() => void forward(item.id)}
                actionLabel={sendingId === item.id ? "Sending" : "Send"}
                actionDisabled={Boolean(sendingId)}
                onAction={() => void forward(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: colors.mutedForeground }}>
                  No contacts found.
                </Text>
              </View>
            }
          />
        )}
        {sendingId ? (
          <ActivityIndicator color={colors.primary} style={styles.busy} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 19 },
  search: {
    margin: 12,
    minHeight: 46,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
  },
  input: { flex: 1, minWidth: 0, fontSize: 15 },
  error: { paddingHorizontal: 18, paddingBottom: 8 },
  empty: { padding: 40, alignItems: "center" },
  busy: { position: "absolute", top: 70, right: 24 },
});
