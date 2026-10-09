import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/constants/events";
import { shareEvent } from "@/utils/shareEvent";
import { getEventImage } from "@/constants/eventImages";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EventCardProps {
  event: Event;
  variant?: "featured" | "standard" | "compact" | "feed";
  // Feed posts span the screen; the details line up with the page padding.
  inset?: number;
}

export function EventCard({ event, variant = "standard", inset = 20 }: EventCardProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const router = useRouter();
  const { user, toggleSaveEvent } = useAuth();
  const scale = useSharedValue(1);
  const isSaved = user?.savedEvents.includes(event.id) ?? false;
  const postSurface =
    scheme === "dark" ? "rgba(16, 22, 44, 0.72)" : "rgba(255, 255, 255, 0.78)";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          variant === "feed" || variant === "standard"
            ? 1
            : scale.value,
      },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    router.push(`/event/${event.id}`);
  }, [router, event.id]);

  const handleSave = useCallback(
    (e: any) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleSaveEvent(event.id);
    },
    [toggleSaveEvent, event.id]
  );

  const { conversations, getContact, sendMessage } = useChat();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [reportState, setReportState] = useState<"idle" | "reported">("idle");
  const [hidden, setHidden] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [sentChatIds, setSentChatIds] = useState<Record<string, boolean>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const captionCanExpand = event.description.trim().length > 110;

  const viewsCount = useMemo(() => {
    if (event.viewCount && event.viewCount > 0) return event.viewCount;
    const seed = event.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 1200 + (seed % 4800);
  }, [event.id, event.viewCount]);

  const initialShares = useMemo(() => {
    return Math.max(14, Math.floor(viewsCount * 0.082));
  }, [viewsCount]);

  const [shareCount, setShareCount] = useState(initialShares);

  const initialSaves = useMemo(() => {
    return Math.max(9, Math.floor(viewsCount * 0.064));
  }, [viewsCount]);

  const savesCount = initialSaves + (isSaved ? 1 : 0);

  const handleShare = useCallback((e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatSearch("");
    setShowShareModal(true);
  }, []);

  const handleReport = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setReportState("reported");
    setTimeout(() => {
      setShowOptionsModal(false);
      setReportState("idle");
    }, 1600);
  }, []);

  const handleGoToPost = useCallback(() => {
    setShowOptionsModal(false);
    handlePress();
  }, [handlePress]);

  const handleOptionsSave = useCallback(
    (e: any) => {
      handleSave(e);
    },
    [handleSave]
  );

  const handleOptionsShare = useCallback(() => {
    setShowOptionsModal(false);
    setTimeout(() => {
      setShowShareModal(true);
    }, 200);
  }, []);

  const handleCopyLink = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(`https://eventis.app/event/${event.id}`);
    setShareCount((prev) => prev + 1);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [event.id]);

  const handleOptionsCopyLink = useCallback(async () => {
    await handleCopyLink();
    setTimeout(() => {
      setShowOptionsModal(false);
    }, 900);
  }, [handleCopyLink]);

  const handleHidePost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowOptionsModal(false);
    setHidden(true);
  }, []);

  const handleSendToChat = useCallback(
    async (convId: string) => {
      if (sentChatIds[convId]) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSentChatIds((prev) => ({ ...prev, [convId]: true }));
      setShareCount((prev) => prev + 1);
      const shareText = `Check out this event: ${event.title}\n📍 ${event.location}, ${event.city}\n📅 ${formatDate(event.date)} · ${event.time}\nhttps://eventis.app/event/${event.id}`;
      await sendMessage(convId, shareText);
    },
    [event, sendMessage, sentChatIds]
  );

  const handleSendToAllChats = useCallback(async () => {
    if (!conversations.length || sendingAll) return;
    setSendingAll(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const addedCount = conversations.length;
    setShareCount((prev) => prev + addedCount);
    const shareText = `Check out this event: ${event.title}\n📍 ${event.location}, ${event.city}\n📅 ${formatDate(event.date)} · ${event.time}\nhttps://eventis.app/event/${event.id}`;
    const newSent: Record<string, boolean> = { ...sentChatIds };
    for (const conv of conversations) {
      newSent[conv.id] = true;
      await sendMessage(conv.id, shareText);
    }
    setSentChatIds(newSent);
    setSendingAll(false);
  }, [conversations, sendingAll, event, sendMessage, sentChatIds]);

  const handleNativeShare = useCallback(async () => {
    setShowShareModal(false);
    setShareCount((prev) => prev + 1);
    await shareEvent(event);
  }, [event]);

  const handleShareToChat = useCallback(() => {
    setShowShareModal(false);
    router.push({
      pathname: "/chat",
      params: { eventId: event.id, eventTitle: event.title },
    } as any);
  }, [router, event]);

  const filteredConversations = useMemo(() => {
    if (!chatSearch.trim()) return conversations;
    const q = chatSearch.toLowerCase();
    return conversations.filter((c) => {
      const contact = getContact(c.contactId);
      return (
        contact?.name.toLowerCase().includes(q) ||
        contact?.headline.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [conversations, chatSearch, getContact]);

  const shareModal = (
    <Modal
      visible={showShareModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowShareModal(false)}
    >
      <Pressable
        style={styles.shareOverlay}
        onPress={() => setShowShareModal(false)}
      >
        <Pressable
          style={[
            styles.shareCard,
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(28px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(28px) saturate(1.5)",
                } as any)
              : null,
            {
              backgroundColor:
                scheme === "dark"
                  ? "rgba(10, 16, 36, 0.78)"
                  : "rgba(255, 255, 255, 0.82)",
              borderColor:
                scheme === "dark"
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(255, 255, 255, 0.75)",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS !== "web" ? (
            <BlurView
              intensity={85}
              tint={scheme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <View
            style={[
              styles.shareHandle,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.28)"
                    : "rgba(0, 0, 0, 0.2)",
              },
            ]}
          />

          {/* Header */}
          <View style={styles.shareHeaderRow}>
            <Text style={[styles.shareTitle, { color: colors.foreground }]}>Share Event</Text>
            <Pressable
              onPress={() => setShowShareModal(false)}
              style={[styles.shareCloseBtn, { backgroundColor: colors.secondary }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.shareSearchBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              placeholder="Search chats..."
              placeholderTextColor={colors.mutedForeground}
              value={chatSearch}
              onChangeText={setChatSearch}
              style={[styles.shareSearchInput, { color: colors.foreground }]}
            />
            {chatSearch.length > 0 && (
              <Pressable onPress={() => setChatSearch("")}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Send to all chats button */}
          {conversations.length > 0 && (
            <Pressable
              style={[
                styles.shareSendAllBtn,
                {
                  backgroundColor: sendingAll ? colors.card : `${colors.primary}18`,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleSendToAllChats}
              disabled={sendingAll}
            >
              <Ionicons
                name={sendingAll ? "checkmark-circle" : "paper-plane"}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.shareSendAllText, { color: colors.primary }]}>
                {sendingAll
                  ? "Sent to all chats!"
                  : `Send to all chats (${conversations.length})`}
              </Text>
            </Pressable>
          )}

          {/* Chats List */}
          <ScrollView
            style={styles.shareChatsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const contact = getContact(conv.contactId);
                const isSent = sentChatIds[conv.id];
                return (
                  <View
                    key={conv.id}
                    style={[
                      styles.shareChatItem,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.shareChatLeft}>
                      {contact?.avatarUrl ? (
                        <Image source={{ uri: contact.avatarUrl }} style={styles.shareChatAvatar} />
                      ) : (
                        <View style={[styles.shareChatAvatarFallback, { backgroundColor: colors.primary }]}>
                          <Text style={styles.shareChatAvatarLetter}>
                            {(contact?.name || "U").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.shareChatInfo}>
                        <Text style={[styles.shareChatName, { color: colors.foreground }]} numberOfLines={1}>
                          {contact?.name || "Attendee"}
                        </Text>
                        <Text style={[styles.shareChatDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {contact?.headline || conv.lastMessage || "Active on Eventis"}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={[
                        styles.shareChatSendBtn,
                        isSent
                          ? { backgroundColor: colors.secondary, borderColor: colors.border }
                          : { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => handleSendToChat(conv.id)}
                    >
                      {isSent ? (
                        <View style={styles.shareSentRow}>
                          <Ionicons name="checkmark" size={13} color={colors.foreground} />
                          <Text style={[styles.shareChatSendText, { color: colors.foreground }]}>
                            Sent
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.shareChatSendText, { color: "#FFFFFF" }]}>
                          Send
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.shareEmptyChats}>
                <Text style={[styles.shareEmptyChatsText, { color: colors.mutedForeground }]}>
                  {chatSearch ? "No chats match your search." : "No chat history yet."}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Instagram-style circular action icons */}
          <View style={[styles.shareQuickActionsRow, { borderTopColor: colors.border }]}>
            {/* Share to external apps */}
            <Pressable
              style={styles.shareQuickAction}
              onPress={handleNativeShare}
            >
              <View style={[styles.shareQuickActionCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="share-social" size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.shareQuickActionLabel, { color: colors.mutedForeground }]}>
                Share to Apps
              </Text>
            </Pressable>

            {/* Copy Link */}
            <Pressable
              style={styles.shareQuickAction}
              onPress={handleCopyLink}
            >
              <View
                style={[
                  styles.shareQuickActionCircle,
                  {
                    backgroundColor: copyFeedback ? `${colors.primary}22` : colors.card,
                    borderColor: copyFeedback ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={copyFeedback ? "checkmark" : "link"}
                  size={20}
                  color={copyFeedback ? colors.primary : colors.foreground}
                />
              </View>
              <Text
                style={[
                  styles.shareQuickActionLabel,
                  { color: copyFeedback ? colors.primary : colors.mutedForeground },
                ]}
              >
                {copyFeedback ? "Copied!" : "Copy link"}
              </Text>
            </Pressable>

            {/* Open in Chat */}
            <Pressable
              style={styles.shareQuickAction}
              onPress={handleShareToChat}
            >
              <View style={[styles.shareQuickActionCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.shareQuickActionLabel, { color: colors.mutedForeground }]}>
                Event Chat
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const optionsModal = (
    <Modal
      visible={showOptionsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <Pressable
        style={styles.optionsOverlay}
        onPress={() => setShowOptionsModal(false)}
      >
        <Pressable
          style={[
            styles.optionsCard,
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(28px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(28px) saturate(1.5)",
                } as any)
              : null,
            {
              backgroundColor:
                scheme === "dark"
                  ? "rgba(10, 16, 36, 0.74)"
                  : "rgba(255, 255, 255, 0.80)",
              borderColor:
                scheme === "dark"
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(255, 255, 255, 0.75)",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS !== "web" ? (
            <BlurView
              intensity={85}
              tint={scheme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <View
            style={[
              styles.optionsHandle,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.28)"
                    : "rgba(0, 0, 0, 0.2)",
              },
            ]}
          />

          {reportState === "reported" ? (
            <View style={styles.reportFeedbackBox}>
              <Ionicons name="checkmark-circle" size={44} color="#10B981" />
              <Text style={[styles.reportFeedbackTitle, { color: colors.foreground }]}>
                Report Submitted
              </Text>
              <Text style={[styles.reportFeedbackSub, { color: colors.mutedForeground }]}>
                Thank you for letting us know. We will review this event within 24 hours.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.optionsHeader}>
                <Text style={[styles.optionsEventTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.optionsOrganizer, { color: colors.mutedForeground }]}>
                  Organized by {event.organizer}
                </Text>
              </View>

              {/* Group 1: Moderation */}
              <View
                style={[
                  styles.optionsGroup,
                  {
                    backgroundColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.07)"
                        : "rgba(255, 255, 255, 0.60)",
                    borderColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(255, 255, 255, 0.60)",
                  },
                ]}
              >
                {/* Report (Red) */}
                <Pressable
                  style={[
                    styles.optionsItem,
                    {
                      borderBottomColor:
                        scheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                    },
                  ]}
                  onPress={handleReport}
                  accessibilityRole="button"
                  accessibilityLabel="Report post"
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                    <Text style={[styles.optionsItemText, { color: "#EF4444" }]}>Report</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#EF4444" />
                </Pressable>

                {/* Not interested / Hide */}
                <Pressable
                  style={[styles.optionsItem, { borderBottomWidth: 0 }]}
                  onPress={handleHidePost}
                  accessibilityRole="button"
                  accessibilityLabel="Not interested in this post"
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons name="eye-off-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.optionsItemText, { color: colors.foreground }]}>
                      Not interested
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Group 2: Engagement & Navigation */}
              <View
                style={[
                  styles.optionsGroup,
                  {
                    backgroundColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.07)"
                        : "rgba(255, 255, 255, 0.60)",
                    borderColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(255, 255, 255, 0.60)",
                  },
                ]}
              >
                {/* Go to post */}
                <Pressable
                  style={[
                    styles.optionsItem,
                    {
                      borderBottomColor:
                        scheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                    },
                  ]}
                  onPress={handleGoToPost}
                  accessibilityRole="button"
                  accessibilityLabel="Go to event details"
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons name="open-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.optionsItemText, { color: colors.foreground }]}>
                      Go to post
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </Pressable>

                {/* Save / Saved */}
                <Pressable
                  style={[
                    styles.optionsItem,
                    {
                      borderBottomColor:
                        scheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                    },
                  ]}
                  onPress={handleOptionsSave}
                  accessibilityRole="button"
                  accessibilityLabel={isSaved ? "Saved post" : "Save post"}
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons
                      name={isSaved ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={isSaved ? colors.primary : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.optionsItemText,
                        { color: isSaved ? colors.primary : colors.foreground },
                      ]}
                    >
                      {isSaved ? "Saved" : "Save"}
                    </Text>
                  </View>
                  {isSaved && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </Pressable>

                {/* Share */}
                <Pressable
                  style={[
                    styles.optionsItem,
                    {
                      borderBottomColor:
                        scheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                    },
                  ]}
                  onPress={handleOptionsShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share event"
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons name="paper-plane-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.optionsItemText, { color: colors.foreground }]}>
                      Share to...
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </Pressable>

                {/* Copy link */}
                <Pressable
                  style={[styles.optionsItem, { borderBottomWidth: 0 }]}
                  onPress={handleOptionsCopyLink}
                  accessibilityRole="button"
                  accessibilityLabel="Copy event link"
                >
                  <View style={styles.optionsItemLeft}>
                    <Ionicons
                      name={copyFeedback ? "checkmark" : "link-outline"}
                      size={20}
                      color={copyFeedback ? colors.primary : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.optionsItemText,
                        { color: copyFeedback ? colors.primary : colors.foreground },
                      ]}
                    >
                      {copyFeedback ? "Link Copied!" : "Copy link"}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Cancel Button */}
              <Pressable
                style={[
                  styles.optionsCancelBtn,
                  {
                    backgroundColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.09)"
                        : "rgba(255, 255, 255, 0.70)",
                    borderColor:
                      scheme === "dark"
                        ? "rgba(255, 255, 255, 0.14)"
                        : "rgba(255, 255, 255, 0.70)",
                  },
                ]}
                onPress={() => setShowOptionsModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.optionsCancelText, { color: colors.foreground }]}>
                  Cancel
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  const insightsModal = (
    <Modal
      visible={showInsightsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowInsightsModal(false)}
    >
      <Pressable
        style={styles.optionsOverlay}
        onPress={() => setShowInsightsModal(false)}
      >
        <Pressable
          style={[
            styles.optionsCard,
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(28px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(28px) saturate(1.5)",
                } as any)
              : null,
            {
              backgroundColor:
                scheme === "dark"
                  ? "rgba(10, 16, 36, 0.74)"
                  : "rgba(255, 255, 255, 0.80)",
              borderColor:
                scheme === "dark"
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(255, 255, 255, 0.75)",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS !== "web" ? (
            <BlurView
              intensity={85}
              tint={scheme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <View
            style={[
              styles.optionsHandle,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.28)"
                    : "rgba(0, 0, 0, 0.2)",
              },
            ]}
          />

          {/* Header */}
          <View style={styles.optionsHeader}>
            <View style={styles.insightsHeaderRow}>
              <View style={[styles.insightsIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
              </View>
              <View style={styles.flexText}>
                <Text style={[styles.optionsEventTitle, { color: colors.foreground }]} numberOfLines={1}>
                  Event Insights
                </Text>
                <Text style={[styles.optionsOrganizer, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {event.title}
                </Text>
              </View>
            </View>
          </View>

          {/* Metrics Grid (2x2) */}
          <View style={styles.insightsGrid}>
            {/* Views */}
            <View
              style={[
                styles.insightsMetricCard,
                {
                  backgroundColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.07)"
                      : "rgba(255, 255, 255, 0.60)",
                  borderColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.60)",
                },
              ]}
            >
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
              <Text style={[styles.insightsMetricValue, { color: colors.foreground }]}>
                {formatCount(viewsCount)}
              </Text>
              <Text style={[styles.insightsMetricLabel, { color: colors.mutedForeground }]}>
                Total Views
              </Text>
            </View>

            {/* Shares */}
            <View
              style={[
                styles.insightsMetricCard,
                {
                  backgroundColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.07)"
                      : "rgba(255, 255, 255, 0.60)",
                  borderColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.60)",
                },
              ]}
            >
              <Ionicons name="paper-plane-outline" size={20} color="#10B981" />
              <Text style={[styles.insightsMetricValue, { color: colors.foreground }]}>
                {formatCount(shareCount)}
              </Text>
              <Text style={[styles.insightsMetricLabel, { color: colors.mutedForeground }]}>
                Post Shares
              </Text>
            </View>

            {/* Saves */}
            <View
              style={[
                styles.insightsMetricCard,
                {
                  backgroundColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.07)"
                      : "rgba(255, 255, 255, 0.60)",
                  borderColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.60)",
                },
              ]}
            >
              <Ionicons name="bookmark-outline" size={20} color="#F59E0B" />
              <Text style={[styles.insightsMetricValue, { color: colors.foreground }]}>
                {formatCount(savesCount)}
              </Text>
              <Text style={[styles.insightsMetricLabel, { color: colors.mutedForeground }]}>
                Saved / Bookmarked
              </Text>
            </View>

            {/* Attendees / Capacity */}
            <View
              style={[
                styles.insightsMetricCard,
                {
                  backgroundColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.07)"
                      : "rgba(255, 255, 255, 0.60)",
                  borderColor:
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.60)",
                },
              ]}
            >
              <Ionicons name="people-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.insightsMetricValue, { color: colors.foreground }]}>
                {formatCount(event.attendees || 85)}
              </Text>
              <Text style={[styles.insightsMetricLabel, { color: colors.mutedForeground }]}>
                Attending
              </Text>
            </View>
          </View>

          {/* Engagement rate row */}
          <View
            style={[
              styles.insightsEngagementRow,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.55)",
                borderColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.10)"
                    : "rgba(255, 255, 255, 0.60)",
              },
            ]}
          >
            <View style={styles.insightsEngagementLeft}>
              <Ionicons name="trending-up" size={18} color={colors.primary} />
              <Text style={[styles.insightsEngagementText, { color: colors.foreground }]}>
                Engagement Rate
              </Text>
            </View>
            <Text style={[styles.insightsEngagementValue, { color: colors.primary }]}>
              {(((shareCount + savesCount) / Math.max(viewsCount, 1)) * 100).toFixed(1)}%
            </Text>
          </View>

          {/* Dismiss button */}
          <Pressable
            style={[
              styles.optionsCancelBtn,
              {
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.09)"
                    : "rgba(255, 255, 255, 0.70)",
                borderColor:
                  scheme === "dark"
                    ? "rgba(255, 255, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.70)",
              },
            ]}
            onPress={() => setShowInsightsModal(false)}
            accessibilityRole="button"
            accessibilityLabel="Close insights"
          >
            <Text style={[styles.optionsCancelText, { color: colors.foreground }]}>
              Close
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (hidden) {
    return (
      <View
        style={[
          styles.hiddenPostCard,
          {
            backgroundColor: postSurface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Ionicons name="eye-off-outline" size={20} color={colors.mutedForeground} />
        <Text style={[styles.hiddenPostText, { color: colors.mutedForeground }]}>
          Post hidden. You won't see this post again in your feed.
        </Text>
        <Pressable
          onPress={() => setHidden(false)}
          style={[styles.undoBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Undo hide post"
        >
          <Text style={[styles.undoBtnText, { color: colors.primary }]}>Undo</Text>
        </Pressable>
      </View>
    );
  }

  if (variant === "featured") {
    return (
      <>
        <AnimatedPressable
          style={[styles.featured, animatedStyle]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.featuredImage}
            imageStyle={styles.featuredImageStyle}
          >
            <View
              style={[
                styles.featuredOverlay,
                { backgroundColor: colors.overlay },
              ]}
            />
            {event.isSponsored && (
              <View
                style={[styles.sponsoredBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.sponsoredText, { color: colors.accentForeground }]}>
                  Sponsored
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.surface }]}
              onPress={handleSave}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isSaved ? colors.primary : colors.foreground}
              />
            </Pressable>
            <View style={styles.featuredContent}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.glass }]}>
                <Text style={[styles.categoryText, { color: "#fff" }]}>
                  {event.category}
                </Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <View style={styles.featuredMeta}>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, styles.flexText]} numberOfLines={1}>
                    {formatDate(event.date)} · {event.time}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, styles.flexText]} numberOfLines={1}>
                    {event.location}, {event.city}
                  </Text>
                </View>
              </View>
              <View style={styles.featuredBottom}>
                <View style={styles.featuredStats}>
                  <View style={styles.attendeeRow}>
                    <Ionicons name="bar-chart-outline" size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.attendeeText}>{formatCount(viewsCount)} views</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.sharePill, { backgroundColor: colors.surface }]}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share event"
                >
                  <Ionicons name="paper-plane-outline" size={14} color={colors.foreground} />
                  <Text style={[styles.sharePillText, { color: colors.foreground }]}>Share</Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        </AnimatedPressable>
        {shareModal}
        {optionsModal}
        {insightsModal}
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <AnimatedPressable
          style={[styles.compact, animatedStyle, { backgroundColor: colors.card }]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.compactImage}
            imageStyle={styles.compactImageStyle}
          />
          <View style={styles.compactContent}>
            <Text style={[styles.compactCategory, { color: colors.primary }]}>
              {event.category}
            </Text>
            <Text
              style={[styles.compactTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <Text
              style={[styles.compactDate, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {formatDate(event.date)} · {event.time}
            </Text>
            <Text
              style={[styles.compactMeta, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {event.location}, {event.city}
            </Text>
            <View style={styles.compactFooter}>
              <View style={styles.ratingRow}>
                <Ionicons name="bar-chart-outline" size={12} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {formatCount(viewsCount)} views
                </Text>
              </View>
              <Pressable
                style={styles.compactShareBtn}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share event"
              >
                <Ionicons name="paper-plane-outline" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </AnimatedPressable>
        {shareModal}
        {optionsModal}
        {insightsModal}
      </>
    );
  }

  // Instagram-style event post (standard and feed)
  return (
    <>
      <AnimatedPressable
        style={[
          styles.instaCard,
          {
            backgroundColor: postSurface,
            borderBottomColor: colors.border,
          },
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Post Header: Organizer info & Category */}
        <View style={styles.instaHeader}>
          <View style={styles.instaOrganizerInfo}>
            <View style={[styles.instaOrganizerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.instaOrganizerAvatarLetter}>
                {event.organizer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.instaOrganizerTextCol}>
              <View style={styles.instaOrganizerNameRow}>
                <Text style={[styles.instaOrganizerName, { color: colors.foreground }]} numberOfLines={1}>
                  {event.organizer}
                </Text>
                {event.isSponsored && (
                  <View style={[styles.instaSponsoredBadge, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.instaSponsoredText, { color: colors.primary }]}>Sponsored</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.instaLocationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {event.location}, {event.city}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.instaMoreBtn}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              setShowOptionsModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Post Media: Full-width event image */}
        <View style={styles.instaMediaWrap}>
          <ImageBackground
            source={getEventImage(event.image)}
            style={styles.instaMediaImage}
            imageStyle={styles.instaMediaInnerImage}
            resizeMode="cover"
          />
        </View>

        {/* Action bar: shares, insights, and saves with live counts */}
        <View style={styles.instaActionBar}>
          {/* Left: Interactive Share with count & Insights with view count */}
          <View style={styles.instaLeftActions}>
            {/* Share action with count */}
            <Pressable
              style={styles.instaActionPill}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={`Share event, ${shareCount} shares`}
            >
              <Ionicons name="paper-plane-outline" size={21} color={colors.foreground} />
              <Text style={[styles.instaActionCount, { color: colors.foreground }]}>
                {formatCount(shareCount)}
              </Text>
            </Pressable>

            {/* Post Insights action with count */}
            <Pressable
              style={styles.instaActionPill}
              onPress={() => setShowInsightsModal(true)}
              accessibilityRole="button"
              accessibilityLabel={`View post insights, ${formatCount(viewsCount)} views`}
            >
              <Ionicons name="stats-chart-outline" size={19} color={colors.foreground} />
              <Text style={[styles.instaActionCount, { color: colors.foreground }]}>
                {formatCount(viewsCount)}
              </Text>
            </Pressable>
          </View>

          {/* Right: Save Post action with count */}
          <Pressable
            style={styles.instaActionPill}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={`Save post, ${savesCount} saves`}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={21}
              color={isSaved ? colors.primary : colors.foreground}
            />
            <Text
              style={[
                styles.instaActionCount,
                { color: isSaved ? colors.primary : colors.foreground },
              ]}
            >
              {formatCount(savesCount)}
            </Text>
          </Pressable>
        </View>

        {/* Post Details & Caption */}
        <View style={styles.instaDetails}>
          <Text style={[styles.instaTitle, { color: colors.foreground }]} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.instaMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.instaMetaText, { color: colors.mutedForeground }]}>
              {formatDate(event.date)} · {event.time}
            </Text>
          </View>
          <Text
            style={[styles.instaCaption, { color: colors.mutedForeground }]}
            numberOfLines={captionExpanded ? undefined : 2}
          >
            <Text style={[styles.instaCaptionOwner, { color: colors.foreground }]}>{event.organizer} </Text>
            {event.description}
          </Text>
          {captionCanExpand ? (
            <Pressable
              onPress={(pressEvent) => {
                pressEvent.stopPropagation();
                setCaptionExpanded((expanded) => !expanded);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${captionExpanded ? "Collapse" : "Expand"} caption for ${event.title}`}
              accessibilityState={{ expanded: captionExpanded }}
              hitSlop={8}
              style={styles.captionToggle}
            >
              <Text style={[styles.captionToggleText, { color: colors.mutedForeground }]}>{captionExpanded ? "less" : "more"}</Text>
            </Pressable>
          ) : null}
        </View>
      </AnimatedPressable>
      {shareModal}
      {optionsModal}
      {insightsModal}
    </>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const styles = StyleSheet.create({
  // Width comes from the container (BannerCarousel sizes each slide).
  featured: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
  },
  flexText: {
    flexShrink: 1,
  },
  featuredStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  featuredImageStyle: {
    borderRadius: 20,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.4,
  },
  sponsoredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sponsoredText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn2: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredContent: {
    padding: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  featuredTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
    lineHeight: 22,
  },
  featuredMeta: {
    gap: 4,
    marginBottom: 10,
  },
  featuredBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendeeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  compact: {
    width: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
  },
  compactImage: {
    width: "100%",
    height: 110,
  },
  compactImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactContent: {
    padding: 10,
    gap: 2,
  },
  compactCategory: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  compactTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  compactDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  compactMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  instaCard: {
    width: "100%",
    marginHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 0,
  },
  instaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  instaOrganizerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  instaOrganizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  instaOrganizerAvatarLetter: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  instaOrganizerTextCol: {
    flex: 1,
    gap: 2,
  },
  instaOrganizerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instaOrganizerName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  instaSponsoredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instaSponsoredText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  instaLocationText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  instaMoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  instaCategoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  instaMediaWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000000",
  },
  instaMediaImage: {
    width: "100%",
    height: "100%",
  },
  instaMediaInnerImage: {
    resizeMode: "cover",
  },
  instaActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  instaLeftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  instaInsightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  instaInsightCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  instaInsightLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  instaActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  instaDetails: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  instaTitle: {
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
    lineHeight: 22,
    letterSpacing: -0.25,
  },
  instaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instaMetaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  instaCaption: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  instaCaptionOwner: {
    fontFamily: "Inter_700Bold",
  },
  captionToggle: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  captionToggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  standard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
  },
  feed: {
    marginBottom: 28,
  },
  feedImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  standardImage: {
    height: 150,
    justifyContent: "flex-end",
  },
  standardImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlay2: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  standardContent: {
    padding: 14,
    gap: 4,
  },
  standardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  standardCategory: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  standardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  metaRow2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  standardMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  topActionsRow: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  viewsInsightBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  viewsInsightBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sharePillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  compactShareBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    justifyContent: "flex-end",
  },
  shareCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "82%",
    gap: 12,
    overflow: "hidden",
  },
  shareHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  shareHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shareTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  shareCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  shareSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  shareSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  shareSendAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareSendAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  shareChatsList: {
    maxHeight: 220,
  },
  shareChatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  shareChatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  shareChatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  shareChatAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  shareChatAvatarLetter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  shareChatInfo: {
    flex: 1,
    gap: 2,
  },
  shareChatName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  shareChatDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  shareChatSendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 64,
    alignItems: "center",
  },
  shareChatSendText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  shareSentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shareEmptyChats: {
    paddingVertical: 24,
    alignItems: "center",
  },
  shareEmptyChatsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  shareQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 4,
  },
  shareQuickAction: {
    alignItems: "center",
    gap: 6,
  },
  shareQuickActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  shareQuickActionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    justifyContent: "flex-end",
  },
  optionsCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
    overflow: "hidden",
  },
  optionsHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  optionsHeader: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  optionsEventTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  optionsOrganizer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  optionsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionsItemText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionsCancelBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  reportFeedbackBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  reportFeedbackTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  reportFeedbackSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  hiddenPostCard: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hiddenPostText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  undoBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  instaActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  instaActionCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  insightsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 4,
  },
  insightsMetricCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  insightsMetricValue: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    marginTop: 2,
  },
  insightsMetricLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  insightsEngagementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },
  insightsEngagementLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightsEngagementText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  insightsEngagementValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
