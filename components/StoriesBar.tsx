import React from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StoryAvatar } from "@/components/StoryAvatar";
import { useStories } from "@/context/StoriesContext";
import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function StoriesBar({ user, onOpenBecomeOrganizer }: { user: User | null; onOpenBecomeOrganizer: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const { collections, openStories, loading, error, refresh } = useStories();
  const mine = collections.find((group) => group.ownerId === user?.id);
  const others = collections.filter((group) => group.ownerId !== user?.id);
  const addStory = () => {
    if (user?.isBusinessAccount) router.push("/business/create-story");
    else onOpenBecomeOrganizer();
  };
  return <View style={styles.container}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
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
