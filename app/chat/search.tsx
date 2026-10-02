import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatActionSheet } from "@/components/ChatActionSheet";
import { ChatListRow } from "@/components/ChatListRow";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import type {
  ChatContact,
  ChatMessage,
  PhoneLookupResult,
} from "@/services/chatService";

type SearchRow =
  | { kind: "heading"; id: string; title: string }
  | { kind: "contact"; id: string; contact: ChatContact }
  | { kind: "message"; id: string; message: ChatMessage; contact: ChatContact };

export default function ChatSearchScreen() {
  const chat = useChat();
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const normalized = useDeferredValue(query.trim().toLowerCase());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [inviting, setInviting] = useState<ChatContact | null>(null);
  const [lookup, setLookup] = useState<{
    query: string;
    result: PhoneLookupResult;
  } | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const rows = useMemo(() => {
    const result: SearchRow[] = [];
    const digits = normalized.replace(/\D/g, "");
    const contacts = chat.contacts
      .filter(
        (contact) =>
          !normalized ||
          `${contact.name} ${contact.headline} ${contact.phone}`
            .toLowerCase()
            .includes(normalized) ||
          (digits.length >= 3 &&
            /^[+\d\s()-]+$/.test(normalized) &&
            contact.phone.replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const isMember of [true, false]) {
      const group = contacts.filter(
        (contact) => contact.isEventisUser === isMember,
      );
      if (!group.length) continue;
      result.push({
        kind: "heading",
        id: isMember ? "contacts" : "invites",
        title: isMember ? "Contacts" : "Invite to Eventis",
      });
      result.push(
        ...group.map((contact) => ({
          kind: "contact" as const,
          id: contact.id,
          contact,
        })),
      );
    }
    if (normalized) {
      const byConversation = new Map(
        chat.conversations.map((conversation) => [
          conversation.id,
          conversation.contactId,
        ]),
      );
      const byContact = new Map(
        chat.contacts.map((contact) => [contact.id, contact]),
      );
      const matches: SearchRow[] = [];
      for (const message of [...chat.allMessages].reverse()) {
        const contact = byContact.get(
          byConversation.get(message.conversationId) ?? "",
        );
        if (contact && message.text.toLowerCase().includes(normalized))
          matches.push({ kind: "message", id: message.id, message, contact });
      }
      if (matches.length)
        result.push(
          { kind: "heading", id: "messages", title: "Messages" },
          ...matches,
        );
    }
    return result;
  }, [chat.contacts, chat.conversations, chat.allMessages, normalized]);

  function openContact(contact: ChatContact) {
    if (!contact.isEventisUser) {
      setInviting(contact);
      return;
    }
    if (contact.blocked) {
      Keyboard.dismiss();
      router.push({
        pathname: "/chat/contact/[id]",
        params: { id: contact.id },
      });
      return;
    }
    void run(async () => {
      const conversation = await chat.startConversation(contact.id);
      Keyboard.dismiss();
      router.push({ pathname: "/chat/[id]", params: { id: conversation.id } });
    });
  }
  const phoneQuery =
    /^[+\d\s()-]+$/.test(query.trim()) && query.replace(/\D/g, "").length >= 9;
  const lookupResult = lookup?.query === query ? lookup.result : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.workspace}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 4, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            style={styles.icon}
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/chat")
            }
          >
            <Ionicons name="chevron-back" size={27} color={colors.foreground} />
          </Pressable>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, number or message"
            accessibilityLabel="Search name, number or message"
            returnKeyType="search"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              { color: colors.foreground, outlineColor: colors.primary },
            ]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.icon}
              onPress={() => setQuery("")}
            >
              <Ionicons name="close" size={23} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>
        {busy || chat.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.notice} />
        ) : null}
        {error || chat.error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading contacts"
            onPress={() => void run(chat.refresh)}
            style={styles.notice}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive }}
            >
              {error ?? chat.error} Tap to retry.
            </Text>
          </Pressable>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 12,
          }}
          renderItem={({ item }) => {
            if (item.kind === "heading")
              return (
                <Text style={[styles.section, { color: colors.primary }]}>
                  {item.title}
                </Text>
              );
            if (item.kind === "contact")
              return (
                <ChatListRow
                  contact={item.contact}
                  subtitle={
                    item.contact.isEventisUser
                      ? item.contact.headline
                      : item.contact.invited
                        ? "Invitation saved locally"
                        : "Invite to Eventis"
                  }
                  onPress={() => openContact(item.contact)}
                />
              );
            return (
              <ChatListRow
                contact={item.contact}
                subtitle={item.message.text}
                time={item.message.sentAt}
                onPress={() => {
                  Keyboard.dismiss();
                  router.push({
                    pathname: "/chat/[id]",
                    params: {
                      id: item.message.conversationId,
                      messageId: item.message.id,
                    },
                  });
                }}
              />
            );
          }}
          ListEmptyComponent={
            !chat.isLoading ? (
              <View style={styles.empty}>
                <Ionicons
                  name="search-outline"
                  size={40}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {query ? "No results found" : "No contacts yet"}
                </Text>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Search by a saved name, phone number or words in a message.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            phoneQuery ? (
              <View style={styles.notice}>
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Look up phone number"
                  style={[styles.lookup, { backgroundColor: colors.secondary }]}
                  onPress={() =>
                    void run(async () =>
                      setLookup({
                        query,
                        result: await chat.lookupPhone(query),
                      }),
                    )
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.primary }}>
                    Look up {query.trim()}
                  </Text>
                </Pressable>
                {lookupResult?.kind === "not_found" ? (
                  <Text
                    style={[styles.hint, { color: colors.mutedForeground }]}
                  >
                    This number isn't in the local demo contacts.
                  </Text>
                ) : lookupResult ? (
                  <ChatListRow
                    contact={
                      chat.getContact(lookupResult.contact.id) ??
                      lookupResult.contact
                    }
                    subtitle={
                      lookupResult.kind === "eventis"
                        ? "Tap to message"
                        : "Tap to invite"
                    }
                    onPress={() =>
                      openContact(
                        chat.getContact(lookupResult.contact.id) ??
                          lookupResult.contact,
                      )
                    }
                  />
                ) : null}
              </View>
            ) : null
          }
        />
      </View>
      <ChatActionSheet
        visible={Boolean(inviting)}
        title={`Invite ${inviting?.name ?? "contact"}`}
        subtitle="This demo saves the invitation on this device. It does not send an SMS."
        actions={
          inviting && !inviting.invited
            ? [
                {
                  label: "Save demo invitation",
                  icon: "person-add-outline",
                  onPress: () =>
                    void run(() => chat.inviteContact(inviting.id)),
                },
              ]
            : []
        }
        onClose={() => setInviting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 15,
    paddingHorizontal: 6,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  notice: { padding: 16 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 14,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 20 },
  hint: { fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 10 },
  lookup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 24,
  },
});
