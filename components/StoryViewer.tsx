import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEvents } from "@/context/EventsContext";
import { useChatOptional } from "@/context/ChatContext";
import { StoryCanvas } from "@/components/StoryCanvas";
import { StoryVideo } from "@/components/StoryVideo";
import { StoryAvatar } from "@/components/StoryAvatar";
import { isStoryAvailable, storyKey, type PublishedStory, type StoryCollection } from "@/services/storyService";
import { describeStatusError, fetchStatusViewers, type StatusViewer } from "@/services/statusService";
import { resolveStoryIndex } from "@/utils/storyPlayback";
import { useAnalytics } from "@/context/AnalyticsContext";
import type { AnalyticsType } from "@/services/analyticsService";

type Props = {
  session: { ids: string[]; index: number }; collections: StoryCollection[]; ownId?: string;
  onViewed: (story: PublishedStory) => void; onClose: () => void;
  onDelete: (story: PublishedStory) => Promise<void>;
};
export function StoryViewer({ session, collections, ownId, onViewed, onClose, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(session.index);
  const [replay, setReplay] = useState(0);
  const closeRequest = useRef<(() => void) | null>(null);
  const items = useMemo(() => new Map(collections.flatMap((group) => group.items.map((item) => [storyKey(item), item] as const))), [collections]);
  const available = new Set(items.keys());
  const resolved = resolveStoryIndex(session.ids, available, index);
  const story = resolved < 0 ? undefined : items.get(session.ids[resolved]);
  const group = collections.find((item) => item.id === (story?.organisationId ?? story?.ownerId));
  const next = useCallback(() => {
    const nextIndex = resolveStoryIndex(session.ids, new Set(items.keys()), resolved + 1);
    if (nextIndex < 0) onClose(); else setIndex(nextIndex);
  }, [session.ids, items, resolved, onClose]);
  const previous = useCallback(() => {
    const previousIndex = resolveStoryIndex(session.ids, new Set(items.keys()), resolved - 1, -1);
    if (previousIndex < 0) setReplay((value) => value + 1); else setIndex(previousIndex);
  }, [session.ids, items, resolved]);
  useEffect(() => { if (!story) onClose(); }, [story, onClose]);
  if (!story || !group) return null;
  return (
    <Modal visible animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => { if (closeRequest.current) closeRequest.current(); else onClose(); }}>
      <SafeAreaProvider initialMetrics={{ insets, frame: { x: 0, y: 0, width, height } }}>
      <StoryPlayback key={`${storyKey(story)}:${replay}`} story={story} group={group} own={story.ownerId === ownId}
        onNext={next} onPrevious={previous} onClose={onClose} onViewed={onViewed} onDelete={onDelete} closeRequest={closeRequest} />
      </SafeAreaProvider>
    </Modal>
  );
}

const QUICK_EMOJIS = ["❤️", "🔥", "👏", "😂", "😍", "🎉"] as const;

function StoryPlayback({ story, group, own, onNext, onPrevious, onClose, onViewed, onDelete, closeRequest }: {
  story: PublishedStory; group: StoryCollection; own: boolean;
  onNext: () => void; onPrevious: () => void; onClose: () => void;
  onViewed: (story: PublishedStory) => void; onDelete: (story: PublishedStory) => Promise<void>;
  closeRequest: React.RefObject<(() => void) | null>;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const chat = useChatOptional();
  const { track } = useAnalytics();
  const trackStory = useCallback((type: AnalyticsType) => {
    track({ type, entityType: "story", entityId: story.id, ownerId: story.ownerId, organisationId: story.organisationId, source: "stories" });
  }, [track, story.id, story.ownerId, story.organisationId]);
  const { getEventById, isLoading: eventsLoading } = useEvents();
  const linkedEvent = story.eventId ? getEventById(story.eventId) : undefined;
  const [viewport, setViewport] = useState({ width, height });
  const video = story.mediaType === "video";
  const image = story.storyImage ?? (story.mediaUrl && !video ? { uri: story.mediaUrl } : undefined);
  const [ready, setReady] = useState(!image && !video);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [holding, setHolding] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active" || AppState.currentState == null);
  const [muted, setMuted] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StatusViewer[]>([]);
  const [viewsCount, setViewsCount] = useState(story.viewsCount ?? 0);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState("");

  // Viewer interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const replyInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const reactionFloat = useRef(new Animated.Value(0)).current;
  const reactionOpacity = useRef(new Animated.Value(1)).current;
  const reactionScale = useRef(new Animated.Value(0.5)).current;
  const heartBurstScale = useRef(new Animated.Value(0)).current;
  const heartBurstOpacity = useRef(new Animated.Value(1)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const elapsed = useRef(0);
  const longPress = useRef(false);
  const swiping = useRef(false);
  const advanced = useRef(false);
  const exitSent = useRef(false);

  // When user is typing a reply, story playback is paused!
  const paused = holding || manualPause || isReplying || !foreground || confirmDelete || viewersOpen || failed;
  const duration = Math.max(1000, Math.min(15000, story.durationMs ?? 5000));

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== "web" }).start(() => {
        setToastMessage(null);
      });
    }, 2000);
  }, [toastAnim]);

  const triggerFloatingReaction = useCallback((reaction: string) => {
    setFloatingReaction(reaction);
    reactionFloat.setValue(0);
    reactionOpacity.setValue(1);
    reactionScale.setValue(0.6);
    Animated.parallel([
      Animated.spring(reactionScale, { toValue: 1.3, useNativeDriver: Platform.OS !== "web", bounciness: 12 }),
      Animated.timing(reactionFloat, { toValue: -140, duration: 900, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(reactionOpacity, { toValue: 0, duration: 900, delay: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      setFloatingReaction(null);
    });
  }, [reactionFloat, reactionOpacity, reactionScale]);

  const toggleLike = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    setIsLiked((prev) => {
      const nextLiked = !prev;
      if (nextLiked) {
        triggerFloatingReaction("❤️");
        showToast("Liked story");
        trackStory("story_view");
        if (chat) {
          void chat.startConversation(story.ownerId).then((convo) => {
            void chat.sendMessage(convo.id, `Liked your story ❤️`, {
              storyReply: {
                storyId: story.id,
                mediaUrl: story.mediaUrl || (story.storyImage ? (story.storyImage as any).uri : undefined),
                mediaType: story.mediaType ?? "image",
                ownerName: story.organizerName,
                reaction: "❤️",
              },
            });
          }).catch(() => {});
        }
      }
      return nextLiked;
    });
  }, [triggerFloatingReaction, showToast, trackStory, chat, story.ownerId]);

  const triggerHeartBurst = useCallback(() => {
    setShowHeartBurst(true);
    heartBurstScale.setValue(0);
    heartBurstOpacity.setValue(1);

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }

    setIsLiked((prev) => {
      if (!prev) {
        showToast("Liked story");
        trackStory("story_view");
        if (chat) {
          void chat.startConversation(story.ownerId).then((convo) => {
            void chat.sendMessage(convo.id, `Liked your story ❤️`, {
              storyReply: {
                storyId: story.id,
                mediaUrl: story.mediaUrl || (story.storyImage ? (story.storyImage as any).uri : undefined),
                mediaType: story.mediaType ?? "image",
                ownerName: story.organizerName,
                reaction: "❤️",
              },
            });
          }).catch(() => {});
        }
      }
      return true;
    });

    Animated.sequence([
      Animated.spring(heartBurstScale, {
        toValue: 1.25,
        friction: 4,
        tension: 90,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(heartBurstScale, {
          toValue: 1.45,
          duration: 220,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(heartBurstOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    ]).start(() => {
      setShowHeartBurst(false);
    });
  }, [heartBurstScale, heartBurstOpacity, showToast, trackStory, chat, story.ownerId]);

  const handleZonePress = useCallback((direction: "previous" | "next") => {
    if (longPress.current || swiping.current || advanced.current) return;
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    if (timeSinceLastTap < 300) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      triggerHeartBurst();
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        if (advanced.current) return;
        advanced.current = true;
        if (direction === "previous") onPrevious(); else onNext();
      }, 220);
    }
  }, [triggerHeartBurst, onPrevious, onNext]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const startReplying = useCallback(() => {
    setIsReplying(true);
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 60);
  }, []);

  const cancelReplying = useCallback(() => {
    Keyboard.dismiss();
    setIsReplying(false);
    setReplyText("");
  }, []);

  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    Keyboard.dismiss();

    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    if (chat) {
      try {
        const convo = await chat.startConversation(story.ownerId);
        await chat.sendMessage(convo.id, text, {
          storyReply: {
            storyId: story.id,
            mediaUrl: story.mediaUrl || (story.storyImage ? (story.storyImage as any).uri : undefined),
            mediaType: story.mediaType ?? "image",
            ownerName: story.organizerName,
          },
        });
      } catch (err) {
        console.warn("Failed to send reply to story:", err);
      }
    }

    showToast(`Reply sent to ${story.organizerName}`);
    setSendingReply(false);
    setReplyText("");
    setIsReplying(false);
  }, [replyText, sendingReply, chat, story.ownerId, story.organizerName, story.id, story.mediaUrl, story.storyImage, story.mediaType, showToast]);

  const handleSendReaction = useCallback((emoji: string) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    triggerFloatingReaction(emoji);
    showToast(`Sent ${emoji} to ${story.organizerName}`);
    if (chat) {
      void chat.startConversation(story.ownerId).then((convo) => {
        void chat.sendMessage(convo.id, emoji, {
          storyReply: {
            storyId: story.id,
            mediaUrl: story.mediaUrl || (story.storyImage ? (story.storyImage as any).uri : undefined),
            mediaType: story.mediaType ?? "image",
            ownerName: story.organizerName,
            reaction: emoji,
          },
        });
      }).catch(() => {});
    }
    setTimeout(() => {
      cancelReplying();
    }, 500);
  }, [triggerFloatingReaction, showToast, chat, story.ownerId, story.organizerName, story.id, story.mediaUrl, story.storyImage, story.mediaType, cancelReplying]);

  const handleShareStory = useCallback(async () => {
    try {
      await Share.share({
        title: `${story.organizerName}'s Story`,
        message: `Check out ${story.organizerName}'s story on Eventis!`,
      });
    } catch {
      showToast("Story shared");
    }
  }, [story.organizerName, showToast]);

  // Handle hardware back on Android and Escape key on physical keyboard
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isReplying) {
        cancelReplying();
        return true;
      }
      if (viewersOpen) {
        setViewersOpen(false);
        return true;
      }
      if (confirmDelete) {
        setConfirmDelete(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isReplying, viewersOpen, confirmDelete, cancelReplying]);

  const closeViewer = useCallback(() => {
    if (ready && !failed && !advanced.current && !exitSent.current) { exitSent.current = true; trackStory("story_exit"); }
    onClose();
  }, [ready, failed, trackStory, onClose]);

  useEffect(() => { closeRequest.current = closeViewer; return () => { closeRequest.current = null; }; }, [closeViewer, closeRequest]);
  const latest = useRef({ onNext, onClose: closeViewer, trackStory });
  latest.current = { onNext, onClose: closeViewer, trackStory };

  // Physical keyboard controls for web/desktop/tablets with keyboard attached
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isReplying) {
          cancelReplying();
        } else {
          closeViewer();
        }
      } else if (!isReplying) {
        if (e.key === "ArrowRight") {
          onNext();
        } else if (e.key === "ArrowLeft") {
          onPrevious();
        } else if (e.key === " ") {
          setManualPause((p) => !p);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReplying, cancelReplying, closeViewer, onNext, onPrevious]);

  const openViewers = useCallback(async () => {
    setViewersOpen(true);
    setViewersError("");
    setViewersLoading(true);
    try {
      const response = await fetchStatusViewers(story.id);
      setViewers(response.viewers);
      setViewsCount(response.views_count);
    } catch (error) {
      setViewersError(describeStatusError(error, "We couldn't load this story's viewers."));
    } finally {
      setViewersLoading(false);
    }
  }, [story.id]);

  const finish = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    latest.current.trackStory("story_complete");
    latest.current.onNext();
  }, []);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }).start();
    const app = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    const visibility = () => setForeground(document.visibilityState === "visible");
    const browser = Platform.OS === "web" && typeof document !== "undefined" && typeof document.addEventListener === "function";
    if (browser) {
      visibility();
      document.addEventListener("visibilitychange", visibility);
    }
    return () => {
      app.remove(); fade.stopAnimation();
      if (browser) document.removeEventListener("visibilitychange", visibility);
    };
  }, [fade]);

  useEffect(() => {
    if (!paused && !failed && isStoryAvailable(story)) onViewed(story);
  }, [paused, failed, story, onViewed]);

  useEffect(() => {
    if (ready && !paused && !failed && isStoryAvailable(story)) trackStory("story_view");
  }, [ready, paused, failed, story, trackStory]);

  useEffect(() => {
    if (ready || failed || !foreground) return;
    const timeout = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timeout);
  }, [ready, failed, attempt, foreground]);

  useEffect(() => { if (ended && !paused) finish(); }, [ended, paused, finish]);

  useEffect(() => {
    if (video || !ready || paused) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - previous;
      previous = now;
      progress.setValue(Math.min(1, elapsed.current / duration));
      if (elapsed.current >= duration) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [video, ready, paused, duration, progress, finish]);

  // Swipe gesture: disabled during active replying so keyboard drags don't dismiss
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, state) => !isReplying && Math.abs(state.dy) > 12 && Math.abs(state.dy) > Math.abs(state.dx),
    onPanResponderGrant: () => { swiping.current = true; setHolding(true); },
    onPanResponderMove: (_, state) => drag.setValue(Math.max(0, state.dy)),
    onPanResponderRelease: (_, state) => {
      setHolding(false);
      if (state.dy > 90 || (state.dy > 30 && state.vy > 0.65)) { latest.current.onClose(); return; }
      Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== "web", bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => { setHolding(false); drag.setValue(0); },
    onPanResponderTerminationRequest: () => false,
  }), [drag, isReplying]);

  const activeIndex = group.items.findIndex((item) => item.id === story.id);
  const canvasWidth = Math.min(viewport.width, Math.max(120, viewport.height - insets.top - insets.bottom - 160) * 9 / 16);
  const age = Math.max(0, Date.now() - story.createdAt);
  const timestamp = age < 60000 ? "Just now" : age < 3600000 ? `${Math.floor(age / 60000)}m` : `${Math.floor(age / 3600000)}h`;
  const retry = () => { setFailed(false); setEnded(false); setReady(!image && !video); setAttempt((value) => value + 1); elapsed.current = 0; progress.setValue(0); };

  return (
    <View style={styles.root} testID="story-viewer" onLayout={({ nativeEvent }) => {
      const { width: w, height: h } = nativeEvent.layout;
      setViewport((previous) => previous.width === w && previous.height === h ? previous : { width: w, height: h });
    }}>
      <Animated.View style={[styles.screen, { opacity: fade, transform: [{ translateY: drag }] }]}>
        <View style={styles.media} pointerEvents="none">
          <View style={{ width: canvasWidth }}>
            <StoryCanvas key={attempt} image={image} background={story.background} fit={story.fit ?? "contain"} overlays={story.overlays ?? []}
              onImageLoad={() => setReady(true)} onImageError={() => setFailed(true)}
              media={video && story.mediaUrl ? <StoryVideo uri={story.mediaUrl} paused={paused} muted={muted} fit={story.fit}
                onReady={setReady} onError={() => setFailed(true)} onProgress={(value) => progress.setValue(value)}
                onEnd={() => setEnded(true)} /> : undefined} />
          </View>
        </View>

        {/* Side Tap Zones for Previous / Next (disabled when replying) */}
        <View
          pointerEvents={isReplying ? "none" : "auto"}
          style={[styles.gesture, { top: insets.top + 85, bottom: insets.bottom + 92 }]}
          {...gesture.panHandlers}
        >
          {(["previous", "next"] as const).map((direction) => <Pressable key={direction}
            style={{ flex: direction === "previous" ? 0.35 : 0.65 }} testID={`story-${direction}`}
            accessibilityRole="button" accessibilityLabel={direction === "previous" ? "Previous story" : "Next story"}
            accessibilityHint="Hold to pause. Swipe down to close."
            delayLongPress={400}
            onPressIn={() => { longPress.current = false; swiping.current = false; setHolding(true); }}
            onLongPress={() => { longPress.current = true; }}
            onPressOut={() => { if (!swiping.current) setHolding(false); }}
            onPress={() => handleZonePress(direction)} />)}
        </View>

        {/* Progress Bar & Header */}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.tracks}>{group.items.map((item, index) => (
            <View key={item.id} style={styles.track} testID={index === activeIndex ? "story-progress-active" : "story-progress"}>
              {index === activeIndex ? <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
                : <View style={[styles.fill, { width: index < activeIndex ? "100%" : "0%" }]} />}
            </View>
          ))}</View>
          <View style={styles.header}>
            <StoryAvatar name={story.organizerName} uri={story.organizerAvatar} size={36} />
            <View style={styles.identity}><Text style={styles.name} numberOfLines={1}>{story.organizerName}</Text><Text style={styles.time}>{timestamp} · {activeIndex + 1}/{group.items.length}</Text></View>
            {video ? <Pressable style={styles.control} onPress={() => setMuted((value) => !value)} accessibilityRole="button" accessibilityLabel={muted ? "Unmute story" : "Mute story"}><Ionicons name={muted ? "volume-mute-outline" : "volume-high-outline"} size={21} color="white" /></Pressable> : null}
            <Pressable style={styles.control} onPress={() => setManualPause((value) => !value)} accessibilityRole="button" accessibilityLabel={manualPause ? "Resume story" : "Pause story"}><Ionicons name={manualPause ? "play" : "pause"} size={20} color="white" /></Pressable>
            <Pressable style={styles.control} onPress={closeViewer} accessibilityRole="button" accessibilityLabel="Close story"><Ionicons name="close" size={28} color="white" /></Pressable>
          </View>
        </View>

        {/* Floating Toast Notification */}
        {toastMessage ? (
          <Animated.View style={[styles.toastBubble, { top: insets.top + 62, opacity: toastAnim }]}>
            <Ionicons name="checkmark-circle" size={17} color="#00A3FF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        ) : null}

        {/* Floating Reaction Animation */}
        {floatingReaction ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingReaction,
              {
                opacity: reactionOpacity,
                transform: [
                  { translateY: reactionFloat },
                  { scale: reactionScale },
                ],
              },
            ]}
          >
            <Text style={styles.floatingReactionText}>{floatingReaction}</Text>
          </Animated.View>
        ) : null}

        {/* Instagram Center Heart Burst on Double-Tap */}
        {showHeartBurst ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerHeartBurst,
              {
                opacity: heartBurstOpacity,
                transform: [
                  { scale: heartBurstScale },
                  {
                    rotate: heartBurstScale.interpolate({
                      inputRange: [0, 1.25],
                      outputRange: ["-15deg", "0deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={96} color="#FF2D55" style={styles.heartShadow} />
          </Animated.View>
        ) : null}

        {!ready && !failed ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="white" accessibilityLabel="Loading story" /></View> : null}
        {failed ? <View style={styles.failure}><Ionicons name="image-outline" color="white" size={32} /><Text style={styles.name}>This story couldn't load</Text><Text style={styles.time}>Retry or continue to the next story.</Text><View style={styles.actions}><Pressable style={styles.button} onPress={retry} accessibilityRole="button"><Text style={styles.name}>Retry</Text></Pressable><Pressable style={styles.button} onPress={onNext} accessibilityRole="button"><Text style={styles.name}>Skip story</Text></Pressable></View></View> : null}

        {/* Bottom Interactive Area */}
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {story.caption ? <Text style={styles.caption} numberOfLines={4} testID="story-caption">{story.caption}</Text> : null}

          {own ? (
            /* Story Owner Actions */
            <View style={styles.actions}>
              <Pressable style={styles.button} onPress={() => { onClose(); router.push("/business/create-story"); }} accessibilityRole="button"><Ionicons name="add" color="white" size={20} /><Text style={styles.name}>Add to story</Text></Pressable>
              <Pressable style={styles.button} onPress={() => void openViewers()} accessibilityRole="button" accessibilityLabel={`${viewsCount} story views`}><Ionicons name="eye-outline" color="white" size={20} /><Text style={styles.name}>{viewsCount}</Text></Pressable>
              <Pressable style={styles.control} onPress={() => setConfirmDelete(true)} accessibilityRole="button" accessibilityLabel="Delete story"><Ionicons name="trash-outline" color="white" size={22} /></Pressable>
            </View>
          ) : (
            /* Viewer Interactive Bar */
            <View style={styles.viewerContainer}>
              {/* Linked Event Pill */}
              {linkedEvent ? (
                <Pressable
                  style={styles.eventPill}
                  accessibilityRole="button"
                  onPress={() => {
                    trackStory("story_event_click");
                    onClose();
                    router.push({ pathname: "/event/[id]", params: { id: linkedEvent.id, source: "stories" } });
                  }}
                >
                  <Ionicons name="calendar-outline" size={15} color="white" />
                  <Text style={styles.eventPillText} numberOfLines={1}>{linkedEvent.title || "View Event"}</Text>
                  <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.7)" />
                </Pressable>
              ) : null}

              {isReplying ? (
                /* Reply Mode with Keyboard & Emoji Quick Bar */
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 8 : 0}
                  style={styles.replyComposer}
                >
                  {/* Quick Reaction Emojis */}
                  <View style={styles.quickEmojisRow}>
                    {QUICK_EMOJIS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        style={({ pressed }) => [styles.emojiPill, pressed && { transform: [{ scale: 1.25 }] }]}
                        onPress={() => handleSendReaction(emoji)}
                        accessibilityRole="button"
                        accessibilityLabel={`React ${emoji}`}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Input + Action Row */}
                  <View style={styles.replyInputRow}>
                    <Pressable
                      style={styles.replyCloseBtn}
                      onPress={cancelReplying}
                      accessibilityRole="button"
                      accessibilityLabel="Close reply"
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={22} color="white" />
                    </Pressable>
                    <TextInput
                      ref={replyInputRef}
                      style={styles.replyInput}
                      placeholder={`Reply to ${story.organizerName}...`}
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={replyText}
                      onChangeText={setReplyText}
                      autoFocus
                      returnKeyType="send"
                      blurOnSubmit={false}
                      onSubmitEditing={handleSendReply}
                      onKeyPress={(e) => {
                        if (e.nativeEvent.key === "Enter") {
                          e.preventDefault?.();
                          void handleSendReply();
                        } else if (e.nativeEvent.key === "Escape") {
                          cancelReplying();
                        }
                      }}
                    />
                    <Pressable
                      style={[
                        styles.replySendBtn,
                        { opacity: replyText.trim() ? 1 : 0.4 },
                      ]}
                      onPress={() => void handleSendReply()}
                      disabled={!replyText.trim() || sendingReply}
                      accessibilityRole="button"
                      accessibilityLabel="Send reply"
                    >
                      {sendingReply ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="send" size={17} color="white" />
                      )}
                    </Pressable>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                /* Default Viewer Bottom Bar: Input pill + Heart + Share */
                <View style={styles.interactiveBar}>
                  <Pressable
                    style={styles.messagePill}
                    onPress={startReplying}
                    accessibilityRole="button"
                    accessibilityLabel="Send message to story owner"
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.75)" style={{ marginRight: 8 }} />
                    <Text style={styles.messagePillText}>Send message...</Text>
                  </Pressable>

                  {/* Like Button */}
                  <Pressable
                    style={styles.actionIconBtn}
                    onPress={toggleLike}
                    accessibilityRole="button"
                    accessibilityLabel={isLiked ? "Unlike story" : "Like story"}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={isLiked ? "heart" : "heart-outline"}
                      size={28}
                      color={isLiked ? "#FF2D55" : "white"}
                    />
                  </Pressable>

                  {/* Share Button */}
                  <Pressable
                    style={styles.actionIconBtn}
                    onPress={() => void handleShareStory()}
                    accessibilityRole="button"
                    accessibilityLabel="Share story"
                    hitSlop={6}
                  >
                    <Ionicons name="paper-plane-outline" size={26} color="white" />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Viewers Sheet (Own Story Only) */}
        {viewersOpen ? <View style={styles.confirm}><View style={[styles.confirmCard, styles.viewersCard]}>
          <View style={styles.viewersHeader}><View style={styles.flex}><Text style={styles.name}>Story viewers</Text><Text style={styles.time}>{viewsCount} {viewsCount === 1 ? "view" : "views"} · only you can see this list</Text></View>
            <Pressable style={styles.control} onPress={() => setViewersOpen(false)} accessibilityRole="button" accessibilityLabel="Close viewers"><Ionicons name="close" color="white" size={24} /></Pressable></View>
          {viewersLoading ? <View style={styles.viewersState}><ActivityIndicator color="white" /><Text style={styles.time}>Loading viewers…</Text></View> : null}
          {!viewersLoading && viewersError ? <View style={styles.viewersState}><Text style={styles.time}>{viewersError}</Text><Pressable style={styles.button} onPress={() => void openViewers()} accessibilityRole="button"><Text style={styles.name}>Try again</Text></Pressable></View> : null}
          {!viewersLoading && !viewersError && !viewers.length ? <View style={styles.viewersState}><Ionicons name="eye-outline" color="#C7CED9" size={28} /><Text style={styles.name}>No viewers yet</Text><Text style={styles.time}>People who view this story will appear here.</Text></View> : null}
          {!viewersLoading && !viewersError && viewers.length ? <ScrollView style={styles.viewerList} contentContainerStyle={styles.viewerListContent} showsVerticalScrollIndicator={false}>
            {viewers.map((viewer) => <View key={viewer.id} style={styles.viewerRow}>
              <StoryAvatar name={viewer.name} uri={viewer.avatar_url ?? ""} size={38} />
              <View style={styles.flex}><Text style={styles.name} numberOfLines={1}>{viewer.name}</Text><Text style={styles.time}>{viewedAtLabel(viewer.viewed_at)}</Text></View>
            </View>)}
          </ScrollView> : null}
        </View></View> : null}

        {/* Delete Confirmation Modal */}
        {confirmDelete ? <View style={styles.confirm}><View style={styles.confirmCard}>
          <Text style={styles.name}>Delete this story?</Text><Text style={styles.time}>It will be removed from your active stories.</Text>
          {deleteError ? <Text style={styles.time}>{deleteError}</Text> : null}
          <View style={styles.actions}><Pressable disabled={deleting} style={styles.button} onPress={() => setConfirmDelete(false)} accessibilityRole="button"><Text style={styles.name}>Cancel</Text></Pressable>
            <Pressable disabled={deleting} style={styles.button} onPress={async () => {
              setDeleting(true);
              try { await onDelete(story); } catch (error) { setDeleteError(describeStatusError(error, "Couldn't delete. Try again.")); setDeleting(false); }
            }} accessibilityRole="button"><Text style={styles.name}>{deleting ? "Deleting…" : "Delete"}</Text></Pressable></View>
        </View></View> : null}
      </Animated.View>
    </View>
  );
}

function viewedAtLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Viewed recently";
  const age = Math.max(0, Date.now() - date.getTime());
  if (age < 60000) return "Viewed just now";
  if (age < 3600000) return `Viewed ${Math.floor(age / 60000)}m ago`;
  if (age < 86400000) return `Viewed ${Math.floor(age / 3600000)}h ago`;
  return `Viewed ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  screen: { flex: 1, backgroundColor: "#080B10" },
  flex: { flex: 1, minWidth: 0 },
  media: { ...StyleSheet.absoluteFill, justifyContent: "center", alignItems: "center" },
  gesture: { position: "absolute", left: 0, right: 0, flexDirection: "row" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, backgroundColor: "rgba(0,0,0,0.3)" },
  tracks: { flexDirection: "row", gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#FFFFFF55", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#FFFFFF", borderRadius: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10 },
  identity: { flex: 1, minWidth: 0 },
  name: { color: "white", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  time: { color: "#C7CED9", fontSize: 12, marginTop: 4, lineHeight: 18 },
  control: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: 16, gap: 12 },
  caption: { color: "white", fontSize: 15, lineHeight: 21, textAlign: "center", fontFamily: "Inter_500Medium", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: "hidden" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: { minHeight: 44, borderRadius: 24, backgroundColor: "#FFFFFF22", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  failure: { position: "absolute", top: "35%", left: 20, right: 20, backgroundColor: "#111827", borderRadius: 20, padding: 22, alignItems: "center", gap: 14 },
  confirm: { ...StyleSheet.absoluteFill, backgroundColor: "#000B", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmCard: { backgroundColor: "#151C29", padding: 24, borderRadius: 22, gap: 18 },
  viewersCard: { width: "100%", maxWidth: 420, maxHeight: "72%", padding: 18 },
  viewersHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewersState: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 26 },
  viewerList: { flexGrow: 0 },
  viewerListContent: { gap: 4 },
  viewerRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9 },

  // Viewer interactive bottom bar styles
  viewerContainer: { width: "100%", alignItems: "center", gap: 10 },
  eventPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0, 163, 255, 0.35)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0, 163, 255, 0.6)" },
  eventPillText: { color: "white", fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: 200 },
  interactiveBar: { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  messagePill: { flex: 1, height: 46, borderRadius: 24, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(0,0,0,0.35)", flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  messagePillText: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "Inter_500Medium" },
  actionIconBtn: { width: 44, height: 46, alignItems: "center", justifyContent: "center" },

  // Reply Composer with keyboard avoidance
  replyComposer: { width: "100%", backgroundColor: "rgba(10, 14, 23, 0.95)", borderRadius: 24, padding: 10, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  quickEmojisRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 4 },
  emojiPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)" },
  emojiText: { fontSize: 24 },
  replyInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  replyCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  replyInput: { flex: 1, minHeight: 40, maxHeight: 90, color: "white", fontSize: 14, fontFamily: "Inter_500Medium", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", textAlignVertical: "center" },
  replySendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#00A3FF", alignItems: "center", justifyContent: "center" },

  // Toast feedback bubble
  toastBubble: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(15, 23, 42, 0.92)", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", zIndex: 99 },
  toastText: { color: "white", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Floating reaction animation
  floatingReaction: { position: "absolute", bottom: 90, right: 30, zIndex: 90 },
  floatingReactionText: { fontSize: 48 },

  // Instagram Center Heart Burst
  centerHeartBurst: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    zIndex: 95,
  },
  heartShadow: {
    shadowColor: "#FF2D55",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
  },
});
