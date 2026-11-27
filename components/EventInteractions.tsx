import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { fetchHomeEventPage } from "@/services/eventApi";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Event } from "@/constants/events";
import { KeyboardAvoidingView } from "@/components/KeyboardCompat";
import { useColors } from "@/hooks/useColors";
import {
  commentAuthor,
  createEventComment,
  deleteEventComment,
  getEventInteractions,
  listEventComments,
  setEventLike,
  setCommentLike,
  updateEventComment,
  type EventComment,
} from "@/services/eventInteractionService";

const COMMENT_LIKES_STORAGE_KEY = "@eventis_liked_comment_ids";

function CommentPhoto({ name, photo }: { name: string; photo?: string | null }) {
  const [failed, setFailed] = useState(false);
  const colors = useColors();
  if (photo && !failed) {
    return <Image source={{ uri: photo }} style={styles.avatar} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
      <Text style={{ color: colors.foreground }}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function formatCommentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function EventInteractions({
  event,
  viewer,
  onCommentCount,
}: {
  event: Event;
  viewer?: { id: string; avatarUrl?: string } | null;
  onCommentCount?: (count: number) => void;
}) {
  const { id: eventId, ownerId } = event;
  const userId = viewer?.id;
  const queryClient = useQueryClient();

  function updateFeedCounts(changes: Partial<NonNullable<Event["interactions"]>>) {
    queryClient.setQueriesData<InfiniteData<Awaited<ReturnType<typeof fetchHomeEventPage>>>>(
      { queryKey: ["home-events", userId] },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === eventId && item.interactions
                ? { ...item, interactions: { ...item.interactions, ...changes } }
                : item,
            ),
          })),
        },
    );
  }

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(event.interactions?.liked ?? false);
  const [likes, setLikes] = useState(event.interactions?.likeCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(event.interactions?.commentCount ?? 0);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentPage, setCommentPage] = useState(0);
  const [editing, setEditing] = useState<EventComment | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const listRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollToNewComment = useRef(false);
  const likeRevision = useRef(0);
  const commentRevision = useRef(0);
  const commentLoadRevision = useRef(0);

  // Load liked comment IDs from AsyncStorage
  useEffect(() => {
    void AsyncStorage.getItem(COMMENT_LIKES_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setLikedCommentIds(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const likesAtRequest = likeRevision.current;
    const commentsAtRequest = commentRevision.current;
    const result = event.interactions ? Promise.resolve(event.interactions) : getEventInteractions(eventId);
    result
      .then((summary) => {
        if (!alive) return;
        if (likesAtRequest === likeRevision.current) {
          setLiked(summary.liked);
          setLikes(summary.likeCount);
        }
        if (commentsAtRequest === commentRevision.current) {
          setCommentsCount(summary.commentCount);
          onCommentCount?.(summary.commentCount);
        }
      })
      .catch((cause) => {
        if (alive) setError(cause instanceof Error ? cause.message : "Could not load post interactions.");
      });
    return () => {
      alive = false;
    };
  }, [eventId, userId, event.interactions, onCommentCount]);

  const onLike = async (pressEvent: GestureResponderEvent) => {
    pressEvent.stopPropagation();
    if (busy) return;
    likeRevision.current += 1;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((count) => Math.max(0, count + (wasLiked ? -1 : 1)));
    setBusy(true);
    setError("");
    try {
      const result = await setEventLike(eventId, !wasLiked);
      setLiked(result.liked);
      setLikes(result.likeCount);
      updateFeedCounts({ liked: result.liked, likeCount: result.likeCount });
    } catch (cause) {
      setLiked(wasLiked);
      setLikes((count) => Math.max(0, count + (wasLiked ? 1 : -1)));
      setError(cause instanceof Error ? `Like failed: ${cause.message}` : "Could not update your like. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const loadComments = async (pageNumber: number) => {
    commentRevision.current += 1;
    const revision = ++commentLoadRevision.current;
    setError("");
    setLoadingComments(true);
    try {
      const page = await listEventComments(eventId, pageNumber);
      if (revision !== commentLoadRevision.current) return;
      setComments((items) => {
        if (pageNumber === 1) return page.items;
        const ids = new Set(items.map((item) => item.id));
        return [...items, ...page.items.filter((item) => !ids.has(item.id))];
      });
      updateFeedCounts({ commentCount: page.total });
      setCommentPage(pageNumber);
      setCommentsCount(page.total);
      onCommentCount?.(page.total);
    } catch (cause) {
      if (revision === commentLoadRevision.current)
        setError(cause instanceof Error ? cause.message : "Comments could not be loaded. Check your connection and try again.");
    } finally {
      if (revision === commentLoadRevision.current) setLoadingComments(false);
    }
  };

  const showComments = (pressEvent: GestureResponderEvent) => {
    pressEvent.stopPropagation();
    setOpen(true);
    setComments([]);
    setCommentPage(0);
    setReplyingTo(null);
    void loadComments(1);
  };

  const closeComments = () => {
    if (busy) return;
    commentLoadRevision.current += 1;
    scrollToNewComment.current = false;
    setLoadingComments(false);
    setOpen(false);
    setEditing(null);
    setReplyingTo(null);
    setText("");
    setError("");
    Keyboard.dismiss();
  };

  const handleCommentLike = async (commentId: string) => {
    const isCurrentlyLiked = !!likedCommentIds[commentId];
    const newLikedState = !isCurrentlyLiked;
    const updatedLikes = { ...likedCommentIds, [commentId]: newLikedState };
    setLikedCommentIds(updatedLikes);

    setCommentLikeCounts((prev) => {
      const current = prev[commentId] ?? 0;
      return { ...prev, [commentId]: Math.max(0, current + (newLikedState ? 1 : -1)) };
    });

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    void AsyncStorage.setItem(COMMENT_LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
    void setCommentLike(commentId, newLikedState);
  };

  const handleReply = (comment: EventComment, authorName: string) => {
    setEditing(null);
    setReplyingTo({ id: comment.id, name: authorName });
    setText((prev) => (prev.startsWith(`@${authorName}`) ? prev : `@${authorName} `));
    inputRef.current?.focus();
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || busy || loadingComments || commentPage === 0) return;
    commentRevision.current += 1;
    commentLoadRevision.current += 1;
    setLoadingComments(false);
    setBusy(true);
    setError("");
    try {
      if (editing) {
        const comment = await updateEventComment(editing.id, body);
        setComments((items) => items.map((item) => (item.id === comment.id ? comment : item)));
        setEditing(null);
      } else {
        const comment = await createEventComment(eventId, body);
        scrollToNewComment.current = true;
        setComments((items) => [...items, comment]);
        setCommentsCount((count) => count + 1);
        updateFeedCounts({ commentCount: commentsCount + 1 });
        onCommentCount?.(commentsCount + 1);
        setReplyingTo(null);
      }
      setText("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : editing
          ? "Your comment could not be saved. Try again."
          : "Your comment could not be posted. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (comment: EventComment) => {
    if (busy || loadingComments) return;
    commentRevision.current += 1;
    commentLoadRevision.current += 1;
    setBusy(true);
    setError("");
    try {
      await deleteEventComment(comment.id);
      setComments((items) => items.filter((item) => item.id !== comment.id));
      setCommentsCount((count) => Math.max(0, count - 1));
      updateFeedCounts({ commentCount: Math.max(0, commentsCount - 1) });
      onCommentCount?.(Math.max(0, commentsCount - 1));
      if (editing?.id === comment.id) {
        setEditing(null);
        setText("");
      }
      await loadComments(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this comment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.row}>
          <Pressable
            onPress={onLike}
            disabled={busy}
            style={({ pressed }) => [styles.action, pressed && styles.pressed, busy && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`${liked ? "Unlike" : "Like"} post`}
            accessibilityState={{ selected: liked, disabled: busy }}
          >
            <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#E04467" : colors.foreground} />
            <Text style={[styles.count, { color: colors.foreground }]}>{likes}</Text>
          </Pressable>
          <Pressable
            onPress={showComments}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${commentsCount} comments`}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.foreground} />
            <Text style={[styles.count, { color: colors.foreground }]}>{commentsCount}</Text>
          </Pressable>
        </View>
        {error && !open ? <Text style={[styles.error, { color: "#d33" }]}>{error}</Text> : null}

        <Modal visible={open} animationType="slide" transparent statusBarTranslucent onRequestClose={closeComments}>
          <KeyboardAvoidingView style={styles.backdrop} behavior="padding" automaticOffset={Platform.OS !== "web"}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeComments} accessibilityRole="button" accessibilityLabel="Close comments" />
            <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
              <View style={styles.heading}>
                <Text style={[styles.title, { color: colors.foreground }]}>Comments</Text>
                <Pressable onPress={closeComments} accessibilityRole="button" accessibilityLabel="Close comments">
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                ref={listRef}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (scrollToNewComment.current) {
                    scrollToNewComment.current = false;
                    listRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              >
                {comments.map((comment) => {
                  const { name, photo } = commentAuthor(comment, event, viewer);
                  const isCommentLiked = !!likedCommentIds[comment.id];
                  const commentLikes = commentLikeCounts[comment.id] ?? (comment.likeCount ?? 0);

                  return (
                    <View key={comment.id} style={styles.commentRow}>
                      <CommentPhoto key={photo || "initial"} name={name} photo={photo} />
                      <View style={styles.commentBody}>
                        <Text style={{ color: colors.foreground }}>
                          <Text style={styles.username}>{name} </Text>
                          {comment.body}
                        </Text>

                        {/* Comment Actions: Timestamp, Reply, Edit, Delete */}
                        <View style={styles.commentMetaRow}>
                          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                            {formatCommentDate(comment.createdAt)}
                          </Text>

                          <Pressable
                            onPress={() => handleReply(comment, name)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Reply to ${name}`}
                          >
                            <Text style={[styles.replyActionText, { color: colors.mutedForeground }]}>Reply</Text>
                          </Pressable>

                          {userId && userId === comment.userId ? (
                            <Pressable
                              disabled={busy || loadingComments}
                              onPress={() => {
                                setReplyingTo(null);
                                setEditing(comment);
                                setText(comment.body);
                                setError("");
                                inputRef.current?.focus();
                              }}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Edit comment"
                            >
                              <Ionicons name="create-outline" size={15} color={colors.mutedForeground} />
                            </Pressable>
                          ) : null}

                          {userId && (userId === comment.userId || userId === ownerId) ? (
                            <Pressable
                              disabled={busy || loadingComments}
                              onPress={() => void removeComment(comment)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Delete comment"
                            >
                              <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      {/* Comment Like Button & Count */}
                      <Pressable
                        onPress={() => void handleCommentLike(comment.id)}
                        hitSlop={10}
                        style={styles.commentLikeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={isCommentLiked ? "Unlike comment" : "Like comment"}
                      >
                        <Ionicons
                          name={isCommentLiked ? "heart" : "heart-outline"}
                          size={15}
                          color={isCommentLiked ? "#E04467" : colors.mutedForeground}
                        />
                        {commentLikes > 0 ? (
                          <Text
                            style={[
                              styles.commentLikeCount,
                              { color: isCommentLiked ? "#E04467" : colors.mutedForeground },
                            ]}
                          >
                            {commentLikes}
                          </Text>
                        ) : null}
                      </Pressable>
                    </View>
                  );
                })}

                {commentPage > 0 && commentPage * 100 < commentsCount ? (
                  <Pressable
                    disabled={busy || loadingComments}
                    onPress={() => void loadComments(commentPage + 1)}
                    accessibilityRole="button"
                    style={styles.loadMore}
                  >
                    <Text style={{ color: colors.primary }}>Load more comments</Text>
                  </Pressable>
                ) : null}
                {loadingComments ? <ActivityIndicator color={colors.primary} style={styles.empty} /> : null}
                {!loadingComments && !comments.length && !error ? (
                  <Text style={[styles.empty, { color: colors.mutedForeground }]}>No comments yet. Start the conversation.</Text>
                ) : null}
                {error ? <Text style={[styles.empty, { color: "#d33" }]}>{error}</Text> : null}
                {error && commentPage === 0 && !loadingComments ? (
                  <Pressable onPress={() => void loadComments(1)} accessibilityRole="button" style={styles.loadMore}>
                    <Text style={{ color: colors.primary }}>Retry loading comments</Text>
                  </Pressable>
                ) : null}
              </ScrollView>

              {/* Replying Banner */}
              {replyingTo ? (
                <View style={[styles.replyingBanner, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="return-down-forward" size={14} color={colors.primary} />
                  <Text style={[styles.replyingText, { color: colors.foreground }]}>
                    Replying to <Text style={{ fontWeight: "700" }}>@{replyingTo.name}</Text>
                  </Text>
                  <Pressable
                    onPress={() => {
                      setReplyingTo(null);
                      setText("");
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel reply"
                  >
                    <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : null}

              {/* Editing Banner */}
              {editing ? (
                <View style={styles.editing}>
                  <Text style={{ color: colors.mutedForeground }}>Editing comment</Text>
                  <Pressable
                    onPress={() => {
                      setEditing(null);
                      setText("");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={{ color: colors.primary }}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Composer */}
              <View style={[styles.composer, { borderColor: colors.border }]}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder={replyingTo ? `Reply to @${replyingTo.name}…` : "Add a comment…"}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                  editable={!busy}
                  accessibilityLabel={editing ? "Edit comment text" : replyingTo ? "Reply to comment" : "Add a comment"}
                  style={[styles.input, { color: colors.foreground }]}
                />
                <Pressable
                  onPress={() => void submit()}
                  disabled={!text.trim() || busy || loadingComments || commentPage === 0}
                  accessibilityRole="button"
                  accessibilityLabel={editing ? "Save comment" : "Post comment"}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      opacity: !text.trim() || busy || loadingComments || commentPage === 0 ? 0.5 : 1,
                    }}
                  >
                    {busy ? "…" : editing ? "Save" : "Post"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  action: {
    minWidth: 42,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 18,
  },
  pressed: { backgroundColor: "rgba(127,127,127,0.12)" },
  disabled: { opacity: 0.65 },
  count: { fontSize: 13, fontWeight: "600" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: { height: "86%", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 42, height: 4, borderRadius: 3, marginBottom: 13 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  list: { flex: 1 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#e5e7eb" },
  commentBody: { flex: 1, gap: 2 },
  username: { fontWeight: "700" },
  commentMetaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  timestamp: { fontSize: 11 },
  replyActionText: { fontSize: 12, fontWeight: "600" },
  commentLikeBtn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 2, minWidth: 26, gap: 2 },
  commentLikeCount: { fontSize: 11, fontWeight: "600" },
  replyingBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 6 },
  replyingText: { flex: 1, fontSize: 13 },
  empty: { textAlign: "center", marginTop: 36 },
  loadMore: { alignItems: "center", padding: 12 },
  editing: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  composer: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 8 },
  input: { flex: 1, minHeight: 42, maxHeight: 100, fontSize: 15 },
  error: { fontSize: 12, marginTop: 4 },
});
