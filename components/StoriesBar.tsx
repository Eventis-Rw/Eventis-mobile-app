import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StoryAvatar } from "@/components/StoryAvatar";
import { useStories } from "@/context/StoriesContext";
import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function StoriesBar({ user, onOpenBecomeOrganizer }: { user: User | null; onOpenBecomeOrganizer: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const { collections, openStories, loading, error, refresh, viewerOpen } = useStories();
  const tray = useRef<ScrollView>(null);
  const scroll = useRef({ offset: 0, width: 0, content: 0, touching: false, resumeAt: 0 });
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  const [reduceMotion, setReduceMotion] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const app = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => { active = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (loading || viewerOpen || !focused || !foreground || reduceMotion) return;
    const timer = setInterval(() => {
      const state = scroll.current;
      const max = Math.max(0, state.content - state.width);
      if (!max || state.touching || Date.now() < state.resumeAt) return;
      tray.current?.scrollTo({ x: state.offset >= max - 2 ? 0 : Math.min(max, state.offset + 82), animated: true });
    }, 3200);
    return () => clearInterval(timer);
  }, [loading, viewerOpen, focused, foreground, reduceMotion]);
  const pauseTray = () => { scroll.current.touching = true; };
  const resumeTray = () => { scroll.current.touching = false; scroll.current.resumeAt = Date.now() + 5000; };
  const mine = collections.find((group) => group.ownerId === user?.id);
  const others = collections.filter((group) => group.ownerId !== user?.id);
  const addStory = () => {
    if (user?.isBusinessAccount) router.push("/business/create-story");
    else onOpenBecomeOrganizer();
  };
  return <View style={styles.container}>
    <ScrollView ref={tray} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}
      testID="stories-tray" scrollEventThrottle={16}
      onLayout={(event) => { scroll.current.width = event.nativeEvent.layout.width; }}
      onContentSizeChange={(width) => { scroll.current.content = width; }}
      onScroll={(event) => { scroll.current.offset = event.nativeEvent.contentOffset.x; }}
      onTouchStart={pauseTray} onTouchEnd={resumeTray} onTouchCancel={resumeTray}
      onScrollBeginDrag={pauseTray} onScrollEndDrag={resumeTray} onMomentumScrollEnd={resumeTray}>
      <Pressable style={styles.item} disabled={loading} onPress={() => mine ? openStories(mine.ownerId, true) : addStory()}
        accessibilityRole="button" accessibilityLabel={mine ? `Your story, ${mine.hasUnwatched ? "unwatched" : "watched"}` : "Add your story"}>
        <StoryAvatar name={user?.organisation?.name ?? user?.username ?? "You"} uri={user?.organisation?.logoUrl || user?.avatarUrl}
          ring={mine ? mine.hasUnwatched ? "new" : "watched" : undefined} add={!mine} />
        <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>Your story</Text>
      </Pressable>
      {loading ? [0, 1, 2].map((index) => <View key={index} style={styles.item} accessibilityLabel="Loading stories"><View style={[styles.skeleton, { backgroundColor: colors.secondary }]} /></View>)
        : others.map((group) => <Pressable key={group.ownerId} style={styles.item} onPress={() => openStories(group.ownerId)}
          accessibilityRole="button" accessibilityLabel={`${group.organizerName} stories, ${group.hasUnwatched ? "unwatched" : "watched"}`}>
          <StoryAvatar name={group.organizerName} uri={group.organizerAvatar} ring={group.hasUnwatched ? "new" : "watched"} />
          <Text style={[styles.label, { color: group.hasUnwatched ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>{group.organizerName}</Text>
        </Pressable>)}
    </ScrollView>
    {error ? <Pressable onPress={() => void refresh()} accessibilityRole="button" style={styles.retry}><Text style={{ color: colors.primary, fontSize: 12 }}>{error}</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 8 }, row: { paddingHorizontal: 16, gap: 12 },
  item: { width: 70, alignItems: "center", gap: 6 }, label: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  skeleton: { width: 66, height: 66, borderRadius: 33 }, retry: { paddingHorizontal: 20, paddingTop: 8 },
});
