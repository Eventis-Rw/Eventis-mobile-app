import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEvents } from "@/context/EventsContext";
import { StoryCanvas } from "@/components/StoryCanvas";
import { StoryVideo } from "@/components/StoryVideo";
import { StoryAvatar } from "@/components/StoryAvatar";
import { isStoryAvailable, storyKey, type PublishedStory, type StoryCollection } from "@/services/storyService";
import { resolveStoryIndex } from "@/utils/storyPlayback";

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
  const items = useMemo(() => new Map(collections.flatMap((group) => group.items.map((item) => [storyKey(item), item] as const))), [collections]);
  const available = new Set(items.keys());
  const resolved = resolveStoryIndex(session.ids, available, index);
  const story = resolved < 0 ? undefined : items.get(session.ids[resolved]);
  const group = collections.find((item) => item.ownerId === story?.ownerId);
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
    <Modal visible animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={{ insets, frame: { x: 0, y: 0, width, height } }}>
      <StoryPlayback key={`${storyKey(story)}:${replay}`} story={story} group={group} own={story.ownerId === ownId}
        onNext={next} onPrevious={previous} onClose={onClose} onViewed={onViewed} onDelete={onDelete} />
      </SafeAreaProvider>
    </Modal>
  );
}

function StoryPlayback({ story, group, own, onNext, onPrevious, onClose, onViewed, onDelete }: {
  story: PublishedStory; group: StoryCollection; own: boolean;
  onNext: () => void; onPrevious: () => void; onClose: () => void;
  onViewed: (story: PublishedStory) => void; onDelete: (story: PublishedStory) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
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
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const elapsed = useRef(0);
  const longPress = useRef(false);
  const swiping = useRef(false);
  const advanced = useRef(false);
  const paused = holding || manualPause || !foreground || confirmDelete || failed;
  const duration = Math.max(1000, Math.min(15000, story.durationMs ?? 5000));
  const latest = useRef({ onNext, onPrevious, onClose, width, paused });
  latest.current = { onNext, onPrevious, onClose, width, paused };

  const finish = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
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
    if (ready && !paused && !failed && isStoryAvailable(story)) onViewed(story);
  }, [ready, paused, failed, story, onViewed]);
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
  // Native Pressables handle taps/holds. Only claim the responder after a real
  // vertical swipe so ordinary phone taps aren't lost to gesture timing.
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, state) => Math.abs(state.dy) > 12 && Math.abs(state.dy) > Math.abs(state.dx),
    onPanResponderGrant: () => { swiping.current = true; setHolding(true); },
    onPanResponderMove: (_, state) => drag.setValue(Math.max(0, state.dy)),
    onPanResponderRelease: (_, state) => {
      setHolding(false);
      if (state.dy > 90 || (state.dy > 30 && state.vy > 0.65)) { latest.current.onClose(); return; }
      Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== "web", bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => { setHolding(false); drag.setValue(0); },
    onPanResponderTerminationRequest: () => false,
  }), [drag]);
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
        <View style={[styles.gesture, { top: insets.top + 85, bottom: insets.bottom + 92 }]} {...gesture.panHandlers}>
          {(["previous", "next"] as const).map((direction) => <Pressable key={direction}
            style={{ flex: direction === "previous" ? 0.35 : 0.65 }} testID={`story-${direction}`}
            accessibilityRole="button" accessibilityLabel={direction === "previous" ? "Previous story" : "Next story"}
            accessibilityHint="Hold to pause. Swipe down to close."
            delayLongPress={400}
            onPressIn={() => { longPress.current = false; swiping.current = false; setHolding(true); }}
            onLongPress={() => { longPress.current = true; }}
            onPressOut={() => { if (!swiping.current) setHolding(false); }}
            onPress={() => {
              if (longPress.current || swiping.current || advanced.current) return;
              advanced.current = true;
              if (direction === "previous") onPrevious(); else onNext();
            }} />)}
        </View>
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
            <Pressable style={styles.control} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close story"><Ionicons name="close" size={28} color="white" /></Pressable>
          </View>
        </View>
        {!ready && !failed ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="white" accessibilityLabel="Loading story" /></View> : null}
        {failed ? <View style={styles.failure}><Ionicons name="image-outline" color="white" size={32} /><Text style={styles.name}>This story couldn't load</Text><Text style={styles.time}>Retry or continue to the next story.</Text><View style={styles.actions}><Pressable style={styles.button} onPress={retry} accessibilityRole="button"><Text style={styles.name}>Retry</Text></Pressable><Pressable style={styles.button} onPress={onNext} accessibilityRole="button"><Text style={styles.name}>Skip story</Text></Pressable></View></View> : null}
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {own ? <View style={styles.actions}>
            <Pressable style={styles.button} onPress={() => { onClose(); router.push("/business/create-story"); }} accessibilityRole="button"><Ionicons name="add" color="white" size={20} /><Text style={styles.name}>Add to story</Text></Pressable>
            <Pressable style={styles.control} onPress={() => setConfirmDelete(true)} accessibilityRole="button" accessibilityLabel="Delete story"><Ionicons name="trash-outline" color="white" size={22} /></Pressable>
          </View> : linkedEvent ? <Pressable style={styles.button} accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: "/event/[id]", params: { id: linkedEvent.id } }); }}><Text style={styles.name}>View event</Text><Ionicons name="arrow-forward" size={18} color="white" /></Pressable>
            : story.eventId ? <Text style={styles.time}>{eventsLoading ? "Loading event…" : "Event no longer available"}</Text> : null}
        </View>
        {confirmDelete ? <View style={styles.confirm}><View style={styles.confirmCard}>
          <Text style={styles.name}>Delete this story?</Text><Text style={styles.time}>It will be removed from your active stories.</Text>
          {deleteError ? <Text style={styles.time}>{deleteError}</Text> : null}
          <View style={styles.actions}><Pressable disabled={deleting} style={styles.button} onPress={() => setConfirmDelete(false)} accessibilityRole="button"><Text style={styles.name}>Cancel</Text></Pressable>
            <Pressable disabled={deleting} style={styles.button} onPress={async () => {
              setDeleting(true);
              try { await onDelete(story); } catch { setDeleteError("Couldn't delete. Try again."); setDeleting(false); }
            }} accessibilityRole="button"><Text style={styles.name}>{deleting ? "Deleting…" : "Delete"}</Text></Pressable></View>
        </View></View> : null}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" }, screen: { flex: 1, backgroundColor: "#080B10" },
  media: { ...StyleSheet.absoluteFill, justifyContent: "center", alignItems: "center" },
  gesture: { position: "absolute", left: 0, right: 0, flexDirection: "row" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, backgroundColor: "rgba(0,0,0,0.3)" },
  tracks: { flexDirection: "row", gap: 4 }, track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#FFFFFF55", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#FFFFFF", borderRadius: 2 }, header: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10 },
  identity: { flex: 1, minWidth: 0 }, name: { color: "white", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  time: { color: "#C7CED9", fontSize: 12, marginTop: 4, lineHeight: 18 },
  control: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: 18 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 }, button: { minHeight: 44, borderRadius: 24, backgroundColor: "#FFFFFF22", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  failure: { position: "absolute", top: "35%", left: 20, right: 20, backgroundColor: "#111827", borderRadius: 20, padding: 22, alignItems: "center", gap: 14 },
  confirm: { ...StyleSheet.absoluteFill, backgroundColor: "#000B", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmCard: { backgroundColor: "#151C29", padding: 24, borderRadius: 22, gap: 18 },
});

