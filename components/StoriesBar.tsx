import React from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StoryAvatar } from "@/components/StoryAvatar";
import { useStories } from "@/context/StoriesContext";
import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function StoriesBar({
  user,
  onOpenBecomeOrganizer,
}: {
  user: User | null;
  onOpenBecomeOrganizer: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { collections, openStories, loading, error, refresh } = useStories();

  const mine =
    collections.find((group) => group.id === user?.organisation?.id) ??
    collections.find((group) => group.id === user?.id);
  const others = collections.filter((group) => group !== mine);

  const addStory = () => {
    if (user) {
      router.push("/business/create-story");
    } else {
      onOpenBecomeOrganizer();
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        testID="stories-tray"
        bounces={true}
      >
        {/* "Your Story" item */}
        <Pressable
          style={styles.item}
          disabled={loading && !mine}
          onPress={() => (mine ? openStories(mine.id, true) : addStory())}
          onLongPress={addStory}
          accessibilityRole="button"
          accessibilityLabel={
            mine
              ? `Your story, ${mine.hasUnwatched ? "unwatched" : "watched"}. Long press to add a new story.`
              : "Add your story"
          }
        >
          <StoryAvatar
            name={user?.organisation?.name ?? user?.username ?? "You"}
            uri={
              user?.organisation
                ? user.organisation.logoUrl
                : mine?.organizerAvatar ?? user?.avatarUrl
            }
            ring={mine ? (mine.hasUnwatched ? "new" : "watched") : undefined}
            add={!mine}
          />
          <Text
            style={[
              styles.label,
              { color: colors.foreground, opacity: mine && !mine.hasUnwatched ? 0.75 : 1 },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Your story
          </Text>
        </Pressable>

        {/* Loading Skeletons */}
        {loading
          ? [0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.item} accessibilityLabel="Loading stories">
                <View
                  style={[
                    styles.skeletonRing,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.skeletonAvatar,
                      { backgroundColor: colors.secondary },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.skeletonLabel,
                    { backgroundColor: colors.secondary },
                  ]}
                />
              </View>
            ))
          : others.map((group) => (
              <Pressable
                key={group.id}
                style={styles.item}
                onPress={() => openStories(group.id)}
                accessibilityRole="button"
                accessibilityLabel={`${group.organizerName} stories, ${
                  group.hasUnwatched ? "unwatched" : "watched"
                }`}
              >
                <StoryAvatar
                  name={group.organizerName}
                  uri={group.organizerAvatar}
                  ring={group.hasUnwatched ? "new" : "watched"}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: group.hasUnwatched
                        ? colors.foreground
                        : colors.mutedForeground,
                      fontFamily: group.hasUnwatched
                        ? "Inter_500Medium"
                        : "Inter_400Regular",
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {group.organizerName}
                </Text>
              </Pressable>
            ))}
      </ScrollView>

      {error ? (
        <Pressable
          onPress={() => void refresh()}
          accessibilityRole="button"
          style={styles.retry}
        >
          <Text style={{ color: colors.primary, fontSize: 12 }}>{error}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    paddingHorizontal: 14,
    gap: 14,
    alignItems: "center",
  },
  item: {
    width: 74,
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontSize: 11.5,
    lineHeight: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 74,
  },
  skeletonRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  skeletonLabel: {
    width: 48,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  retry: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
