import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatActionSheet, type ChatAction } from "@/components/ChatActionSheet";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import { useChatBottomInset } from "@/hooks/useChatBottomInset";
import type { ChatMessage } from "@/services/chatService";

function dayLabel(value: string) {
  const date = new Date(value);
  if (date.toDateString() === new Date().toDateString()) return "Today";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MessageBubble({
  message,
  previous,
  onActions,
  onImage,
  highlighted,
  onReply,
  replyEnabled,
  contactName,
}: {
  message: ChatMessage;
  previous?: ChatMessage;
  onActions: () => void;
  onImage: (uri: string) => void;
  highlighted: boolean;
  onReply: () => void;
  replyEnabled: boolean;
  contactName: string;
}) {
  const colors = useChatColors();
  const swipe = useRef<SwipeableMethods>(null);
  const own = message.direction === "outgoing";
  const sameDay =
    previous && dayLabel(previous.sentAt) === dayLabel(message.sentAt);
  const grouped =
    sameDay &&
    previous.direction === message.direction &&
    Date.parse(message.sentAt) - Date.parse(previous.sentAt) < 300000;
  return (
    <View>
      {!sameDay ? (
        <View style={styles.day}>
          <Text
            style={[
              styles.dayText,
              {
                color: colors.mutedForeground,
                backgroundColor: colors.secondary,
              },
            ]}
          >
            {dayLabel(message.sentAt)}
          </Text>
        </View>
      ) : null}
      <ReanimatedSwipeable
        ref={swipe}
        enabled={replyEnabled}
        friction={2}
        leftThreshold={32}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() => (
          <View style={styles.swipeReply}>
            <Ionicons
              name="arrow-undo"
              size={23}
              color={colors.mutedForeground}
            />
          </View>
        )}
        onSwipeableOpen={() => {
          swipe.current?.close();
          onReply();
        }}
      >
        <View
          style={[
            styles.messageRow,
            {
              justifyContent: own ? "flex-end" : "flex-start",
              marginTop: grouped ? 3 : 8,
            },
          ]}
        >
          <Pressable
            onLongPress={onActions}
            onPress={
              message.imageUri
                ? () => onImage(message.imageUri!)
                : Platform.OS === "web"
                  ? onActions
                  : undefined
            }
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityLabel={`${own ? "You" : contactName}: ${message.text || "Photo"}`}
            accessibilityHint="Long press for message actions"
            onAccessibilityTap={onActions}
            accessibilityActions={[
              { name: "activate", label: "Message actions" },
            ]}
            onAccessibilityAction={onActions}
            style={[
              styles.bubble,
              {
                backgroundColor: highlighted
                  ? colors.highlight
                  : own
                    ? colors.outgoing
                    : colors.incoming,
                borderTopRightRadius: own && !grouped ? 2 : 9,
                borderTopLeftRadius: !own && !grouped ? 2 : 9,
              },
            ]}
          >
            {message.forwarded ? (
              <Text
                style={[styles.smallText, { color: colors.mutedForeground }]}
              >
                ↪ Forwarded
              </Text>
            ) : null}
            {message.replyTo ? (
              <View
                style={[
                  styles.quote,
                  {
                    backgroundColor: colors.glass,
                    borderLeftColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.quoteAuthor, { color: colors.primary }]}>
                  {message.replyTo.direction === "outgoing"
                    ? "You"
                    : contactName}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.smallText, { color: colors.foreground }]}
                >
                  {message.replyTo.text || "Photo"}
                </Text>
              </View>
            ) : null}
            {message.imageUri ? (
              <Image
                source={{ uri: message.imageUri }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : null}
            {message.text ? (
              <Text style={[styles.messageText, { color: colors.foreground }]}>
                {message.text}
              </Text>
            ) : null}
            <View style={styles.meta}>
              {message.editedAt ? (
                <Text
                  style={[styles.timestamp, { color: colors.mutedForeground }]}
                >
                  edited
                </Text>
              ) : null}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: colors.mutedForeground,
                  },
                ]}
              >
                {new Date(message.sentAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {own ? (
                <Ionicons
                  accessibilityLabel={`Demo status: ${message.status}`}
                  name={
                    message.status === "pending"
                      ? "time-outline"
                      : ["delivered", "read"].includes(message.status)
                        ? "checkmark-done"
                        : "checkmark"
                  }
                  size={14}
                  color={
                    message.status === "read"
                      ? colors.receipt
                      : colors.mutedForeground
                  }
                />
              ) : null}
            </View>
          </Pressable>
        </View>
      </ReanimatedSwipeable>
    </View>
  );
}

export default function ConversationScreen() {
  const { id, messageId } = useLocalSearchParams<{
    id: string;
    messageId?: string;
  }>();
  const router = useRouter();
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const { viewport, measureViewport, bottomInset } =
    useChatBottomInset(keyboardVisible);
  const chat = useChat();
  const conversation = chat.getConversation(id ?? "");
  const contact = conversation
    ? chat.getContact(conversation.contactId)
    : undefined;
  const allMessages = chat.messagesByConversation[id] ?? [];
  const list = useRef<FlatList<ChatMessage>>(null);
  const jumpRetry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpAttempts = useRef(0);
  const nearBottom = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const input = useRef<TextInput>(null);
  const [composer, setComposer] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState(false);
  const [forward, setForward] = useState<ChatMessage | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [focusedMessageId, setFocusedMessageId] = useState(messageId);
  const messages = useMemo(() => [...allMessages].reverse(), [allMessages]);
  const matches = useMemo(
    () =>
      query.trim()
        ? messages.filter((message) =>
            message.text.toLowerCase().includes(query.trim().toLowerCase()),
          )
        : [],
    [messages, query],
  );
  const highlightedId = query.trim()
    ? matches[Math.min(matchIndex, Math.max(0, matches.length - 1))]?.id
    : focusedMessageId;
  const targetIndex = messages.findIndex(
    (message) => message.id === highlightedId,
  );
  const jumpToTarget = useCallback(() => {
    if (targetIndex >= 0) {
      nearBottom.current = false;
      list.current?.scrollToIndex({
        index: targetIndex,
        viewPosition: 0.5,
        animated: false,
      });
    }
  }, [targetIndex]);
  useEffect(() => setFocusedMessageId(messageId), [id, messageId]);
  useEffect(() => {
    jumpAttempts.current = 0;
    const timer = setTimeout(jumpToTarget, 100);
    return () => {
      clearTimeout(timer);
      if (jumpRetry.current) clearTimeout(jumpRetry.current);
    };
  }, [jumpToTarget, highlightedId]);
  const showNewest = () => {
    setFocusedMessageId(undefined);
    nearBottom.current = true;
    setShowLatest(false);
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };
  const { loadMessages, markConversationRead, setActiveConversation } = chat;
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      setActiveConversation(id);
      if (id && conversation?.id) {
        void Promise.all([loadMessages(id), markConversationRead(id)]).catch(
          () => setError("Could not load this conversation. Try again."),
        );
      }
      return () => setActiveConversation(null);
    }, [
      id,
      conversation?.id,
      loadMessages,
      markConversationRead,
      setActiveConversation,
    ]),
  );

  useEffect(() => {
    let active = true;
    setDraftReady(false);
    AsyncStorage.getItem(`@eventis_chat_draft_${id}`)
      .then((value) => {
        if (active) setComposer(value ?? "");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!draftReady || editing) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(`@eventis_chat_draft_${id}`, composer).catch(
        () => {},
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      void AsyncStorage.setItem(`@eventis_chat_draft_${id}`, composer).catch(
        () => {},
      );
    };
  }, [composer, draftReady, editing, id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function send() {
    if ((!composer.trim() && !photo) || busy || !contact || contact.blocked)
      return;
    const text = composer.trim();
    setBusy(true);
    setError(null);
    try {
      if (editing) await chat.editMessage(id, editing.id, text);
      else
        await chat.sendMessage(id, text, {
          imageUri: photo ?? undefined,
          replyTo: reply
            ? { id: reply.id, text: reply.text, direction: reply.direction }
            : undefined,
        });
      setComposer("");
      setReply(null);
      setEditing(null);
      setPhoto(null);
      await AsyncStorage.removeItem(`@eventis_chat_draft_${id}`);
      nearBottom.current = true;
      showNewest();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Message could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    await run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error("This photo could not be opened.");
      // Small self-contained demo photos remain usable after reload; real service uploads replace this URI.
      if (asset.base64.length > 700000)
        throw new Error(
          "Choose a smaller photo (under 500 KB after compression) for this local demo.",
        );
      setPhoto(`data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`);
    });
  }

  const messageActions: ChatAction[] = selected
    ? [
        {
          label: "Reply",
          icon: "arrow-undo-outline",
          onPress: () => {
            setReply(selected);
            setEditing(null);
            input.current?.focus();
          },
        },
        ...(selected.text
          ? [
              {
                label: "Copy text",
                icon: "copy-outline" as const,
                onPress: () =>
                  void run(async () => {
                    await Clipboard.setStringAsync(selected.text);
                    setNotice("Message copied");
                  }),
              },
            ]
          : []),
        {
          label: "Forward",
          icon: "arrow-redo-outline",
          onPress: () => setForward(selected),
        },
        ...(selected.text
          ? [
              {
                label: "Share text",
                icon: "share-outline" as const,
                onPress: () =>
                  void run(() => Share.share({ message: selected.text })),
              },
            ]
          : []),
        ...(selected.direction === "outgoing" && selected.text
          ? [
              {
                label: "Edit message",
                icon: "pencil-outline" as const,
                onPress: () => {
                  setEditing(selected);
                  setReply(null);
                  setComposer(selected.text);
                  input.current?.focus();
                },
              },
            ]
          : []),
        {
          label: "Delete for me",
          icon: "trash-outline",
          destructive: true,
          onPress: () =>
            setConfirm({
              title: "Delete this message?",
              description: "This removes it from your local conversation only.",
              action: () => chat.deleteMessage(id, selected.id),
            }),
        },
        {
          label: "Report message",
          icon: "flag-outline",
          onPress: () =>
            setConfirm({
              title: "Save a report?",
              description:
                "The report stays on this device. It will not reach a moderation team until a backend is connected.",
              action: async () => {
                await chat.reportContact(
                  contact!.id,
                  "Inappropriate message",
                  selected.id,
                );
                setNotice("Report saved locally — not submitted");
              },
            }),
        },
      ]
    : [];

  if (
    chat.isLoading ||
    (conversation && !chat.messagesByConversation[id] && !error)
  )
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.smallText, { color: colors.mutedForeground }]}>
          Opening conversation…
        </Text>
        <Pressable onPress={back} accessibilityRole="button">
          <Text style={{ color: colors.primary }}>Back</Text>
        </Pressable>
      </View>
    );
  if (!contact || !conversation)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="chatbubble-outline" size={38} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Conversation unavailable
        </Text>
        <Pressable onPress={back} accessibilityRole="button">
          <Text style={{ color: colors.primary }}>Back to chats</Text>
        </Pressable>
      </View>
    );

  return (
    <View
      ref={viewport}
      onLayout={measureViewport}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.workspace, { backgroundColor: colors.wallpaper }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 4,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back to conversations"
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/chat/contact/[id]",
                params: { id: contact.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`View ${contact.name}'s contact details`}
            style={styles.profile}
          >
            <Image source={{ uri: contact.avatarUrl }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {contact.name}
              </Text>
              <Text
                style={[styles.smallText, { color: colors.mutedForeground }]}
              >
                {contact.blocked
                  ? "Blocked on this device"
                  : chat.typingConversationId === id
                    ? "Typing… · demo"
                    : contact.isOnline
                      ? "Online · demo"
                      : "Offline · demo"}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              setSearchOpen(!searchOpen);
              setQuery("");
              setFocusedMessageId(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel="Search messages"
            style={styles.iconButton}
          >
            <Ionicons
              name="search-outline"
              size={21}
              color={colors.foreground}
            />
          </Pressable>
          <Pressable
            onPress={() => setMenu(true)}
            accessibilityRole="button"
            accessibilityLabel="Conversation options"
            style={styles.iconButton}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={21}
              color={colors.foreground}
            />
          </Pressable>
        </View>
        {searchOpen ? (
          <View style={[styles.searchRow, { backgroundColor: colors.input }]}>
            <TextInput
              autoFocus
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setMatchIndex(0);
              }}
              placeholder="Search this conversation"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              accessibilityLabel="Search messages"
            />
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.mutedForeground, fontSize: 11 }}
            >
              {query.trim()
                ? matches.length
                  ? `${Math.min(matchIndex + 1, matches.length)}/${matches.length}`
                  : "No results"
                : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Older match"
              disabled={!matches.length || matchIndex >= matches.length - 1}
              onPress={() => setMatchIndex((index) => index + 1)}
              style={styles.searchArrow}
            >
              <Ionicons
                name="chevron-up"
                size={21}
                color={
                  matchIndex >= matches.length - 1
                    ? colors.disabled
                    : colors.foreground
                }
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Newer match"
              disabled={!matches.length || matchIndex === 0}
              onPress={() => setMatchIndex((index) => index - 1)}
              style={styles.searchArrow}
            >
              <Ionicons
                name="chevron-down"
                size={21}
                color={matchIndex === 0 ? colors.disabled : colors.foreground}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setQuery("");
                setSearchOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Close message search"
            >
              <Ionicons name="close" size={23} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}
        {error ? (
          <Pressable
            onPress={() => void run(() => loadMessages(id))}
            accessibilityRole="button"
            style={[styles.notice, { backgroundColor: colors.secondary }]}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive }}
            >
              {error} Tap to reload.
            </Text>
          </Pressable>
        ) : null}
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.notice,
              { backgroundColor: colors.secondary, color: colors.foreground },
            ]}
          >
            {notice}
          </Text>
        ) : null}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          automaticOffset
        >
          <View style={{ flex: 1 }}>
            <FlatList
              ref={list}
              style={{ flex: 1 }}
              inverted
              data={messages}
              keyExtractor={(message) => message.id}
              renderItem={({ item, index }) => (
                <MessageBubble
                  message={item}
                  contactName={contact.name}
                  previous={messages[index + 1]}
                  highlighted={item.id === highlightedId}
                  replyEnabled={!contact.blocked && item.status !== "pending"}
                  onReply={() => {
                    setReply(item);
                    setEditing(null);
                    input.current?.focus();
                  }}
                  onActions={() => {
                    if (item.status !== "pending") setSelected(item);
                  }}
                  onImage={setImagePreview}
                />
              )}
              contentContainerStyle={[
                styles.messages,
                !messages.length ? { justifyContent: "center" } : null,
              ]}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onScroll={(event) => {
                nearBottom.current = event.nativeEvent.contentOffset.y < 120;
                setShowLatest(!nearBottom.current);
              }}
              scrollEventThrottle={100}
              onContentSizeChange={() => {
                if (nearBottom.current && !highlightedId)
                  list.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              onLayout={() => {
                if (nearBottom.current && !highlightedId)
                  list.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                list.current?.scrollToOffset({
                  offset: averageItemLength * index,
                  animated: false,
                });
                // Variable-height rows are measured in batches. Give the list
                // time to mount earlier history before requesting an exact jump.
                if (jumpAttempts.current++ < 20) {
                  jumpRetry.current = setTimeout(jumpToTarget, 250);
                }
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={36}
                    color={colors.primary}
                  />
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    {query
                      ? "No matching messages"
                      : `Say hello to ${contact.name.split(" ")[0]}`}
                  </Text>
                  <Text
                    style={[
                      styles.smallText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {query
                      ? "Try a different word or phrase."
                      : "Start a conversation about your next shared experience."}
                  </Text>
                </View>
              }
            />
            {showLatest && !searchOpen ? (
              <Pressable
                onPress={showNewest}
                accessibilityRole="button"
                accessibilityLabel="Jump to latest message"
                style={[styles.latest, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name="chevron-down"
                  size={24}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ) : null}
          </View>
          {chat.typingConversationId === id ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.typing, { color: colors.mutedForeground }]}
            >
              ••• {contact.name.split(" ")[0]} is typing · demo
            </Text>
          ) : null}
          {reply || editing ? (
            <View
              style={[
                styles.composerContext,
                {
                  backgroundColor: colors.secondary,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.quoteAuthor, { color: colors.primary }]}>
                  {editing
                    ? "Editing your message"
                    : `Replying to ${reply?.direction === "outgoing" ? "yourself" : contact.name}`}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.smallText, { color: colors.foreground }]}
                >
                  {(editing ?? reply)?.text || "Photo"}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setReply(null);
                  if (editing) setComposer("");
                  setEditing(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel reply or edit"
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
          ) : null}
          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.thumbnail} />
              <Pressable
                onPress={() => setPhoto(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selected photo"
              >
                <Ionicons
                  name="close-circle"
                  size={25}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ) : null}
          {contact.blocked ? (
            <Pressable
              onPress={() => void run(() => chat.setBlocked(contact.id, false))}
              accessibilityRole="button"
              style={[
                styles.blocked,
                {
                  backgroundColor: colors.secondary,
                  paddingBottom: bottomInset + 12,
                },
              ]}
            >
              <Text style={{ color: colors.primary }}>
                This contact is blocked. Tap to unblock.
              </Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.composer,
                {
                  paddingBottom: bottomInset + 6,
                },
              ]}
            >
              <View
                style={[styles.inputPill, { backgroundColor: colors.card }]}
              >
                <TextInput
                  ref={input}
                  value={composer}
                  onChangeText={setComposer}
                  placeholder={editing ? "Edit message" : "Message"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  multiline
                  numberOfLines={1}
                  maxLength={4000}
                  accessibilityLabel="Message composer"
                />
                <Pressable
                  onPress={() => void pickPhoto()}
                  disabled={busy || Boolean(editing)}
                  accessibilityRole="button"
                  accessibilityLabel="Attach photo"
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="attach-outline"
                    size={26}
                    color={
                      busy || editing ? colors.disabled : colors.mutedForeground
                    }
                  />
                </Pressable>
              </View>
              <Pressable
                onPress={() => void send()}
                disabled={busy || (!composer.trim() && !photo)}
                accessibilityRole="button"
                accessibilityLabel={
                  editing ? "Save edited message" : "Send message"
                }
                style={[
                  styles.send,
                  {
                    backgroundColor:
                      !busy && (composer.trim() || photo)
                        ? colors.primary
                        : colors.disabled,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={editing ? "checkmark" : "send"}
                    size={23}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
      <ChatActionSheet
        visible={Boolean(selected)}
        title="Message"
        actions={messageActions}
        onClose={() => setSelected(null)}
      />
      <ChatActionSheet
        visible={menu}
        title={contact.name}
        actions={[
          {
            label: "Contact details",
            icon: "person-outline",
            onPress: () =>
              router.push({
                pathname: "/chat/contact/[id]",
                params: { id: contact.id },
              }),
          },
          {
            label: conversation.muted
              ? "Unmute conversation"
              : "Mute conversation",
            icon: conversation.muted
              ? "notifications-outline"
              : "notifications-off-outline",
            onPress: () =>
              void run(() => chat.setMuted(id, !conversation.muted)),
          },
          {
            label: "Receive a demo reply",
            icon: "flask-outline",
            onPress: () => void run(() => chat.simulateIncoming(id)),
          },
          {
            label: "Clear conversation",
            icon: "trash-outline",
            destructive: true,
            onPress: () =>
              setConfirm({
                title: "Clear this conversation?",
                description:
                  "All messages will be removed from this device. The contact stays in your chats.",
                action: () => chat.clearConversation(id),
              }),
          },
          {
            label: "Delete conversation",
            icon: "close-circle-outline",
            destructive: true,
            onPress: () =>
              setConfirm({
                title: "Delete this conversation?",
                description:
                  "This removes the chat and its messages from this device. You can start a new chat with this contact later.",
                action: async () => {
                  await chat.clearConversation(id, true);
                  router.dismissTo("/chat");
                },
              }),
          },
        ]}
        onClose={() => setMenu(false)}
      />
      <ChatActionSheet
        visible={Boolean(forward)}
        title="Forward to"
        subtitle="Choose an Eventis contact"
        actions={chat.contacts
          .filter((item) => item.isEventisUser && !item.blocked)
          .map((item) => ({
            label: item.name,
            icon: "person-outline",
            onPress: () =>
              void run(async () => {
                const target = await chat.startConversation(item.id);
                await chat.sendMessage(target.id, forward!.text, {
                  forwarded: true,
                  imageUri: forward!.imageUri,
                });
                setNotice(`Forwarded to ${item.name}`);
              }),
          }))}
        onClose={() => setForward(null)}
      />
      <ChatActionSheet
        visible={Boolean(confirm)}
        title={confirm?.title ?? "Confirm"}
        subtitle={confirm?.description}
        actions={[
          {
            label: "Confirm",
            icon: "checkmark",
            destructive: true,
            onPress: () => {
              const action = confirm?.action;
              if (action) void run(action);
            },
          },
        ]}
        onClose={() => setConfirm(null)}
      />
      <Modal
        visible={Boolean(imagePreview)}
        animationType="fade"
        onRequestClose={() => setImagePreview(null)}
      >
        <View style={[styles.center, { backgroundColor: "#000000" }]}>
          <Image
            source={{ uri: imagePreview ?? "" }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => setImagePreview(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={[styles.imageClose, { top: insets.top + 12 }]}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  smallText: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    margin: 10,
    borderRadius: 13,
  },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 14 },
  searchArrow: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { fontSize: 12, padding: 12 },
  messages: { flexGrow: 1, paddingHorizontal: 10, paddingVertical: 6 },
  latest: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
  },
  messageRow: { flexDirection: "row", width: "100%" },
  swipeReply: { width: 48, alignItems: "center", justifyContent: "center" },
  bubble: {
    maxWidth: "84%",
    minWidth: 75,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingTop: 7,
    paddingBottom: 4,
    boxShadow: "0 1px 1px rgba(0,0,0,0.10)",
  },
  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    marginTop: 2,
  },
  timestamp: { fontSize: 10 },
  day: { alignItems: "center", marginTop: 12, marginBottom: 5 },
  dayText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    overflow: "hidden",
  },
  quote: { borderLeftWidth: 3, padding: 8, borderRadius: 7, marginBottom: 7 },
  quoteAuthor: { fontFamily: "Inter_700Bold", fontSize: 11 },
  messageImage: {
    width: 210,
    height: 180,
    borderRadius: 11,
    maxWidth: "100%",
    marginBottom: 5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  typing: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 12 },
  composerContext: {
    marginHorizontal: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 4,
    paddingHorizontal: 6,
    gap: 6,
  },
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 25,
    paddingRight: 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 140,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  thumbnail: { width: 75, height: 65, borderRadius: 10 },
  blocked: { padding: 20, alignItems: "center" },
  fullImage: { width: "100%", height: "100%" },
  imageClose: { position: "absolute", right: 20, padding: 8 },
});
