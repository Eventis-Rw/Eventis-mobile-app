import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
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
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const callMode = mode === "call";
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalized = useDeferredValue(query.trim().toLowerCase());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [lookup, setLookup] = useState<{
    query: string;
    result: PhoneLookupResult;
  } | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<ChatContact[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directoryHasMore, setDirectoryHasMore] = useState(false);
  const [directoryRetry, setDirectoryRetry] = useState(0);
  const directoryPage = useRef(1);
  const directoryRequest = useRef(0);
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
  useEffect(() => {
    if (callMode || chat.isDemoMode || (normalized.replace(/^@+/, "").length === 1)) {
      directoryRequest.current += 1;
      setDirectoryUsers([]);
      setDirectoryError(null);
      setDirectoryHasMore(false);
      setDirectoryLoading(false);
      directoryPage.current = 1;
      return;
    }
    const requestId = ++directoryRequest.current;
    const timer = setTimeout(() => {
      setDirectoryLoading(true);
      setDirectoryError(null);
      directoryPage.current = 1;
      void chat.searchUsers(normalized, 1).then((result) => {
        if (requestId !== directoryRequest.current) return;
        setDirectoryUsers(result.items);
        setDirectoryHasMore(result.hasMore);
        directoryPage.current = 1;
      }).catch((cause: unknown) => {
        if (requestId !== directoryRequest.current) return;
        setDirectoryUsers([]);
        setDirectoryHasMore(false);
        setDirectoryError(cause instanceof Error ? cause.message : "Eventis users could not be loaded.");
      }).finally(() => {
        if (requestId === directoryRequest.current) setDirectoryLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [normalized, callMode, chat.isDemoMode, chat.searchUsers, directoryRetry]);

  const loadMoreUsers = async () => {
    if (directoryLoading || !directoryHasMore) return;
    setDirectoryLoading(true);
    setDirectoryError(null);
    const nextPage = directoryPage.current + 1;
    const requestId = directoryRequest.current;
    try {
      const result = await chat.searchUsers(normalized, nextPage);
      if (requestId !== directoryRequest.current) return;
      setDirectoryUsers((current) => {
        const known = new Set(current.map((contact) => contact.id));
        return [...current, ...result.items.filter((contact) => !known.has(contact.id))];
      });
      directoryPage.current = nextPage;
      setDirectoryHasMore(result.hasMore);
    } catch (cause) {
      if (requestId !== directoryRequest.current) return;
      setDirectoryError(cause instanceof Error ? cause.message : "More Eventis users could not be loaded.");
    } finally {
      if (requestId === directoryRequest.current) setDirectoryLoading(false);
    }
  };
  const rows = useMemo(() => {
    const result: SearchRow[] = [];
    const digits = normalized.replace(/\D/g, "");
    const directoryById = new Map(directoryUsers.map((contact) => [contact.id, contact]));
    const addressBook = chat.contacts.map((contact) => {
      const serverProfile = directoryById.get(contact.id);
      return serverProfile ? { ...contact, username: serverProfile.username, headline: serverProfile.headline } : contact;
    });
    const addressBookIds = new Set(addressBook.filter((contact) => contact.isEventisUser).map((contact) => contact.id));
    const serverOnly = directoryUsers.filter((contact) => !addressBookIds.has(contact.id));
    const contacts = addressBook
      .filter(
        (contact) =>
          !normalized ||
          `${contact.name} ${contact.username ?? ""} ${contact.headline} ${contact.phone}`
            .toLowerCase()
            .includes(normalized) ||
          (digits.length >= 3 &&
            /^[+\d\s()-]+$/.test(normalized) &&
            contact.phone.replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const groupInfo of [
      { id: "phone-members", title: "Phone contacts on Eventis", contacts: contacts.filter((contact) => contact.isEventisUser) },
      { id: "directory", title: "Eventis users", contacts: serverOnly },
      { id: "invites", title: "Invite to Eventis", contacts: contacts.filter((contact) => !contact.isEventisUser) },
    ]) {
      const group = groupInfo.contacts;
      if (!group.length) continue;
      result.push({
        kind: "heading",
        id: groupInfo.id,
        title: groupInfo.title,
      });
      result.push(
        ...group.map((contact) => ({
          kind: "contact" as const,
          id: contact.id,
          contact,
        })),
      );
    }
    if (normalized && !callMode) {
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
  }, [chat.contacts, chat.conversations, chat.allMessages, normalized, callMode, directoryUsers]);

  function openContact(contact: ChatContact) {
    if (callMode) {
      Keyboard.dismiss();
      void run(() => Linking.openURL(`tel:${contact.phone.replace(/\s/g, "")}`));
      return;
    }
    if (!contact.isEventisUser) {
      Keyboard.dismiss();
      router.push({
        pathname: "/chat/contact/[id]",
        params: { id: contact.id },
      });
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
          <View
            style={[
              styles.search,
              {
                backgroundColor: colors.secondary,
                borderColor: focused ? colors.primary : colors.border,
                borderWidth: focused ? 1 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Pressable
              style={styles.searchBack}
              accessibilityRole="button"
              accessibilityLabel="Back to chats"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/chat")
              }
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color={colors.foreground}
              />
            </Pressable>
            <Ionicons
              name={callMode ? "call-outline" : "search-outline"}
              size={20}
              color={colors.mutedForeground}
            />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={
                callMode ? "Search a contact to call" : "Search chats or username"
              }
              accessibilityLabel={
                callMode
                  ? "Search a contact to call"
                  : "Search contacts, messages, or Eventis username"
              }
              returnKeyType="search"
              autoCorrect={false}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  outlineColor: "transparent",
                  outlineWidth: 0,
                },
              ]}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.clear}
                onPress={() => setQuery("")}
              >
                <Ionicons name="close" size={21} color={colors.foreground} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {busy || chat.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.notice} />
        ) : null}
        {directoryLoading ? (
          <View style={styles.directoryNotice}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground }}>Searching Eventis users…</Text>
          </View>
        ) : null}
        {directoryError ? (
          <Pressable onPress={() => setDirectoryRetry((count) => count + 1)} style={styles.notice}>
            <Text style={{ color: colors.destructive }}>{directoryError} Tap to retry.</Text>
          </Pressable>
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
                      ? item.contact.isInAddressBook === false
                        ? "Registered Eventis user · Tap to message"
                        : item.contact.headline
                      : item.contact.invited
                        ? "Invitation ready to share"
                        : "Invite to Eventis"
                  }
                  onPress={() => openContact(item.contact)}
                  actionLabel={item.contact.isEventisUser ? "Message" : item.contact.invited ? "Invited" : "Invite"}
                  actionDisabled={item.contact.invited}
                  onAction={item.contact.isEventisUser
                    ? () => openContact(item.contact)
                    : () => void run(() => chat.inviteContact(item.contact.id))}
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
            !chat.isLoading && !directoryLoading ? (
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
                  {callMode
                    ? "Search for a saved contact, then tap their name to call."
                    : "Search saved contacts and messages, or enter an Eventis username to find registered users."}
                </Text>
                {!chat.isDemoMode && !callMode ? (
                  <Pressable
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Sync phone contacts"
                    onPress={() => void run(chat.syncDeviceContacts)}
                    style={[styles.lookup, { backgroundColor: colors.secondary }]}
                  >
                    <Ionicons name="sync-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary }}>
                      Sync phone contacts
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : undefined
          }
          ListFooterComponent={
            <View>
            {directoryHasMore && normalized.length >= 2 && !callMode ? (
              <Pressable disabled={directoryLoading} onPress={() => void loadMoreUsers()} style={[styles.lookup, { backgroundColor: colors.secondary, marginHorizontal: 18, marginTop: 12 }]}>
                {directoryLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="people-outline" size={18} color={colors.primary} />}
                <Text style={{ color: colors.primary }}>Load more Eventis users</Text>
              </Pressable>
            ) : null}
            {phoneQuery ? (
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
                    {chat.isDemoMode
                      ? "This number isn't in the local demo contacts."
                      : "No Eventis account uses this number yet."}
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
                    actionLabel={
                      lookupResult.kind === "invite"
                        ? (
                            chat.getContact(lookupResult.contact.id) ??
                            lookupResult.contact
                          ).invited
                          ? "Invited"
                          : "Invite"
                        : undefined
                    }
                    actionDisabled={
                      (
                        chat.getContact(lookupResult.contact.id) ??
                        lookupResult.contact
                      ).invited
                    }
                    onAction={
                      lookupResult.kind === "invite"
                        ? () =>
                            void run(() =>
                              chat.inviteContact(lookupResult.contact.id),
                            )
                        : undefined
                    }
                  />
                ) : null}
              </View>
            ) : null}
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    paddingBottom: 8,
  },
  searchBack: {
    width: 34,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    height: 50,
    marginHorizontal: 18,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 15,
    paddingHorizontal: 0,
  },
  clear: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  notice: { padding: 16 },
  directoryNotice: { paddingHorizontal: 18, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 9 },
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
