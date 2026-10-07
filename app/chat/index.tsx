import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { ChatListRow } from "@/components/ChatListRow";
import {
  ChatPopupMenu,
  type ChatMenuAnchor,
} from "@/components/ChatPopupMenu";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import type { ChatConversation } from "@/services/chatService";

export default function ChatScreen() {
  const colors = useChatColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const chat = useChat();
  const menuButton = useRef<View>(null);
  const appleHeader = Platform.OS !== "android";
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [options, setOptions] = useState<ChatConversation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatConversation | null>(
    null,
  );
  const [about, setAbout] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ChatMenuAnchor>();
  const [actionError, setActionError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Please try again.",
      );
    }
  };
  const conversations = chat.conversations.filter(
    (item) => !unreadOnly || item.unreadCount > 0,
  );
  const search = () => router.push("/chat/search");
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");
  const openMenu = () => {
    if (!menuButton.current) {
      setAbout(true);
      return;
    }
    menuButton.current.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setAbout(true);
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.workspace}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          {appleHeader ? (
            <>
              <View style={styles.appleActions}>
                <Pressable
                  ref={menuButton}
                  accessibilityRole="button"
                  accessibilityLabel="Chat options"
                  onPress={openMenu}
                  style={[
                    styles.appleCircle,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={25}
                    color={colors.foreground}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="New chat"
                  onPress={search}
                  style={[
                    styles.appleCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.appleTitleRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Return to Eventis"
                  onPress={back}
                  style={styles.appleBack}
                >
                  <Ionicons
                    name="chevron-back"
                    size={29}
                    color={colors.foreground}
                  />
                </Pressable>
                <View style={styles.titleBlock}>
                  <Text style={[styles.appleTitle, { color: colors.foreground }]}>
                    Chats
                  </Text>
                  <Text style={[styles.appleSubtitle, { color: colors.mutedForeground }]}>
                    Plans, people, and the group after the show.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to Eventis"
                style={styles.icon}
                onPress={back}
              >
                <Ionicons
                  name="chevron-back"
                  size={27}
                  color={colors.foreground}
                />
              </Pressable>
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  Chats
                </Text>
                <Text style={[styles.appleSubtitle, { color: colors.mutedForeground }]}>
                  Plans, people, and the group after the show.
                </Text>
              </View>
              <Pressable
                ref={menuButton}
                accessibilityRole="button"
                accessibilityLabel="Chat options"
                onPress={openMenu}
                style={styles.icon}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={23}
                  color={colors.foreground}
                />
              </Pressable>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search contacts and messages"
            onPress={search}
            style={[
              styles.search,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <Text
              numberOfLines={1}
              style={[styles.searchText, { color: colors.mutedForeground }]}
            >
              Search chats
            </Text>
          </Pressable>
        </View>
        <View style={styles.filters}>
          {[false, true].map((unread) => (
            <Pressable
              key={String(unread)}
              onPress={() => setUnreadOnly(unread)}
              accessibilityRole="button"
              accessibilityState={{ selected: unreadOnly === unread }}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    unreadOnly === unread ? colors.glass : colors.secondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      unreadOnly === unread
                        ? colors.primary
                        : colors.mutedForeground,
                  },
                ]}
              >
                {unread ? "Unread" : "All"}
              </Text>
            </Pressable>
          ))}
          <Text style={[styles.demoLabel, { color: colors.mutedForeground }]}>
            Local demo
          </Text>
        </View>
        {actionError || chat.error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading chats"
            onPress={() => void run(chat.refresh)}
            style={styles.notice}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive }}
            >
              {actionError ?? chat.error} Tap to retry.
            </Text>
          </Pressable>
        ) : null}
        {chat.isLoading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: insets.bottom + 92,
              flexGrow: 1,
            }}
            renderItem={({ item }) => {
              const contact = chat.getContact(item.contactId);
              if (!contact) return null;
              return (
                <ChatListRow
                  contact={contact}
                  subtitle={item.lastMessage || "Start a conversation"}
                  time={item.lastMessageAt}
                  unreadCount={item.unreadCount}
                  muted={item.muted}
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[id]",
                      params: { id: item.id },
                    })
                  }
                  onLongPress={() => setOptions(item)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name={
                    unreadOnly
                      ? "checkmark-done-outline"
                      : "chatbubbles-outline"
                  }
                  size={44}
                  color={colors.primary}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {unreadOnly ? "You're all caught up" : "Start a conversation"}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  {unreadOnly
                    ? "Your unread chats will appear here."
                    : "Find a contact and say hello."}
                </Text>
                <Pressable
                  onPress={search}
                  accessibilityRole="button"
                  style={styles.notice}
                >
                  <Text style={{ color: colors.primary }}>Find a contact</Text>
                </Pressable>
              </View>
            }
          />
        )}
        {appleHeader ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New chat"
            onPress={search}
            style={[
              styles.newChat,
              { backgroundColor: colors.primary, bottom: insets.bottom + 18 },
            ]}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
      <ChatPopupMenu
        visible={about}
        anchor={menuAnchor}
        align={appleHeader ? "left" : "right"}
        actions={[
          { label: "New chat", icon: "chatbubble-outline", onPress: search },
          { label: "Search", icon: "search-outline", onPress: search },
        ]}
        onClose={() => setAbout(false)}
      />
      <ChatPopupMenu
        visible={Boolean(options)}
        actions={
          options
            ? [
                {
                  label: options.muted ? "Unmute" : "Mute",
                  icon: "notifications-off-outline",
                  onPress: () =>
                    void run(() => chat.setMuted(options.id, !options.muted)),
                },
                {
                  label: "Receive a demo message",
                  icon: "flask-outline",
                  onPress: () =>
                    void run(() => chat.simulateIncoming(options.id)),
                },
                {
                  label: "Delete conversation",
                  icon: "trash-outline",
                  destructive: true,
                  onPress: () => setConfirmDelete(options),
                },
              ]
            : []
        }
        onClose={() => setOptions(null)}
      />
      <ChatConfirmDialog
        visible={Boolean(confirmDelete)}
        title="Delete conversation?"
        description="This removes the chat and messages from this device. You can still start a new conversation with this contact."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const selected = confirmDelete;
          setConfirmDelete(null);
          if (selected)
            void run(() => chat.clearConversation(selected.id, true));
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    paddingBottom: 6,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  appleActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  appleCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  appleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  appleBack: {
    width: 38,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
  },
  appleTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    lineHeight: 44,
  },
  appleSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  icon: {
    width: 46,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginLeft: 4,
  },
  search: {
    height: 48,
    marginHorizontal: 18,
    marginTop: 2,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15 },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 16,
    minHeight: 38,
    justifyContent: "center",
    borderRadius: 24,
  },
  chipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  demoLabel: { marginLeft: "auto", fontSize: 11 },
  notice: { padding: 16 },
  loading: { marginTop: 50 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    textAlign: "center",
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  newChat: {
    position: "absolute",
    right: 20,
    height: 56,
    width: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    boxShadow: "0 3px 9px rgba(0,0,0,0.16)",
  },
});
