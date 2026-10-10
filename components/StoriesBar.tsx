import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface StoryItem {
  id: string;
  organizerName: string;
  organizerAvatar: string;
  storyImage: any;
  eventTitle: string;
  eventId: string;
  timeAgo: string;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: "story_1",
    organizerName: "Kigali Jazz",
    organizerAvatar:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80",
    storyImage: require("../assets/images/banner-concert.png"),
    eventTitle: "Neon Pulse Music Festival",
    eventId: "evt_1",
    timeAgo: "2h ago",
  },
  {
    id: "story_2",
    organizerName: "Tech Kigali",
    organizerAvatar:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=160&auto=format&fit=crop&q=80",
    storyImage: require("../assets/images/banner-tech.png"),
    eventTitle: "FutureTech Summit 2026",
    eventId: "evt_2",
    timeAgo: "4h ago",
  },
  {
    id: "story_3",
    organizerName: "Street Food Fest",
    organizerAvatar:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80",
    storyImage: require("../assets/images/banner-food.png"),
    eventTitle: "Global Street Food Carnival",
    eventId: "evt_3",
    timeAgo: "6h ago",
  },
  {
    id: "story_4",
    organizerName: "Yoga Life",
    organizerAvatar:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=160&auto=format&fit=crop&q=80",
    storyImage: require("../assets/images/banner-concert.png"),
    eventTitle: "Morning Yoga in Hyde Park",
    eventId: "evt_4",
    timeAgo: "8h ago",
  },
  {
    id: "story_5",
    organizerName: "Midnight Beats",
    organizerAvatar:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&auto=format&fit=crop&q=80",
    storyImage: require("../assets/images/banner-tech.png"),
    eventTitle: "Midnight Lounge Sessions",
    eventId: "evt_5",
    timeAgo: "11h ago",
  },
];

interface StoriesBarProps {
  user: User | null;
  onOpenBecomeOrganizer: () => void;
}

export function StoriesBar({ user, onOpenBecomeOrganizer }: StoriesBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showOrganizerGateModal, setShowOrganizerGateModal] = useState(false);

  const progress = useSharedValue(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const contentWidthRef = useRef(DEFAULT_STORIES.length * 90 + 100);
  const containerWidthRef = useRef(SCREEN_WIDTH);
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STEP_SIZE = 90;

  const handleScrollBeginDrag = useCallback(() => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const handleScrollEnd = useCallback((currentX: number) => {
    scrollOffsetRef.current = currentX;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 4000);
  }, []);

  useEffect(() => {
    if (activeStoryIndex !== null || showOrganizerGateModal) {
      return;
    }

    const interval = setInterval(() => {
      if (isInteractingRef.current) {
        return;
      }

      const maxScroll = Math.max(
        0,
        contentWidthRef.current - containerWidthRef.current
      );

      if (maxScroll <= 0) return;

      let nextX: number;
      if (scrollOffsetRef.current >= maxScroll - 5) {
        nextX = 0;
      } else {
        nextX = Math.min(scrollOffsetRef.current + STEP_SIZE, maxScroll);
      }

      scrollOffsetRef.current = nextX;
      scrollViewRef.current?.scrollTo({
        x: nextX,
        animated: true,
      });
    }, 3200);

    return () => {
      clearInterval(interval);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [activeStoryIndex, showOrganizerGateModal]);

  useEffect(() => {
    if (activeStoryIndex !== null) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 5000 });
      const timer = setTimeout(() => {
        if (activeStoryIndex < DEFAULT_STORIES.length - 1) {
          setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
        } else {
          setActiveStoryIndex(null);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeStoryIndex, progress]);

  const handleUserStoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.isBusinessAccount) {
      router.push("/business/create-story" as any);
    } else {
      setShowOrganizerGateModal(true);
    }
  };

  const handleOpenStory = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveStoryIndex(index);
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < DEFAULT_STORIES.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const activeStory =
    activeStoryIndex !== null ? DEFAULT_STORIES[activeStoryIndex] : null;

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
          onLayout={(e) => {
            containerWidthRef.current = e.nativeEvent.layout.width;
          }}
          onContentSizeChange={(w) => {
            contentWidthRef.current = w;
          }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
          }}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={(e) => {
            handleScrollEnd(e.nativeEvent.contentOffset.x);
          }}
          onMomentumScrollEnd={(e) => {
            handleScrollEnd(e.nativeEvent.contentOffset.x);
          }}
        >
          {/* User Story Circle */}
          <Pressable
            style={({ pressed }) => [styles.storyItem, pressed && { opacity: 0.78 }]}
            onPress={handleUserStoryPress}
            accessibilityRole="button"
            accessibilityLabel="Your story"
          >
            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={22}
                    color={colors.mutedForeground}
                  />
                </View>
              )}
              <View
                style={[
                  styles.plusBadge,
                  { backgroundColor: colors.primary, borderColor: colors.background },
                ]}
              >
                <Ionicons
                  name={user?.isBusinessAccount ? "add" : "sparkles"}
                  size={11}
                  color="#FFFFFF"
                />
              </View>
            </View>
            <Text
              style={[styles.storyLabel, { color: colors.foreground }]}
              numberOfLines={1}
            >
              Your story
            </Text>
          </Pressable>

          {/* Organizer Stories */}
          {DEFAULT_STORIES.map((story, index) => (
            <Pressable
              key={story.id}
              style={({ pressed }) => [styles.storyItem, pressed && { opacity: 0.78 }]}
              onPress={() => handleOpenStory(index)}
              accessibilityRole="button"
              accessibilityLabel={`${story.organizerName} story`}
            >
              <View
                style={[
                  styles.activeAvatarRing,
                  { borderColor: colors.primary },
                ]}
              >
                <View
                  style={[
                    styles.activeAvatarInnerRing,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Image
                    source={{ uri: story.organizerAvatar }}
                    style={styles.avatarImg}
                  />
                </View>
              </View>
              <Text
                style={[styles.storyLabel, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {story.organizerName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Story Viewer Modal */}
      {activeStory && (
        <Modal
          visible={activeStoryIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveStoryIndex(null)}
        >
          <View style={styles.storyViewerRoot}>
            <ImageBackground
              source={activeStory.storyImage}
              style={styles.storyBackgroundImage}
            >
              <View style={styles.storyDarkOverlay} />

              {/* Tap navigation zones */}
              <Pressable style={styles.tapLeft} onPress={handlePrevStory} />
              <Pressable style={styles.tapRight} onPress={handleNextStory} />

              {/* Top Controls */}
              <View
                style={[
                  styles.storyTopControls,
                  { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8) },
                ]}
              >
                {/* Progress bars */}
                <View style={styles.progressBarsRow}>
                  {DEFAULT_STORIES.map((s, idx) => (
                    <View key={s.id} style={styles.progressBarTrack}>
                      {idx === activeStoryIndex ? (
                        <Animated.View
                          style={[styles.progressBarFill, progressAnimatedStyle]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: idx < (activeStoryIndex ?? 0) ? "100%" : "0%",
                            },
                          ]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                {/* Header row */}
                <View style={styles.storyHeaderRow}>
                  <View style={styles.storyOrganizerInfo}>
                    <Image
                      source={{ uri: activeStory.organizerAvatar }}
                      style={styles.storyHeaderAvatar}
                    />
                    <View>
                      <View style={styles.storyHeaderNameRow}>
                        <Text style={styles.storyHeaderName}>
                          {activeStory.organizerName}
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#007AFF"
                        />
                      </View>
                      <Text style={styles.storyHeaderTime}>
                        {activeStory.timeAgo}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.storyCloseBtn}
                    onPress={() => setActiveStoryIndex(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close story"
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* Bottom Event Tag and CTA */}
              <View
                style={[
                  styles.storyBottomArea,
                  { paddingBottom: insets.bottom + 24 },
                ]}
              >
                <View style={styles.storyEventPill}>
                  <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.storyEventPillText} numberOfLines={1}>
                    {activeStory.eventTitle}
                  </Text>
                </View>
                <Pressable
                  style={[styles.storyCtaBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const eventId = activeStory.eventId;
                    setActiveStoryIndex(null);
                    router.push(`/event/${eventId}` as any);
                  }}
                >
                  <Text style={styles.storyCtaText}>View Event</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        </Modal>
      )}

      {/* Only Organizers Can Post Stories Modal */}
      <Modal
        visible={showOrganizerGateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrganizerGateModal(false)}
      >
        <Pressable
          style={styles.gateOverlay}
          onPress={() => setShowOrganizerGateModal(false)}
        >
          <Pressable
            style={[
              styles.gateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.gateHandle, { backgroundColor: colors.border }]} />
            <View
              style={[
                styles.gateIconCircle,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.gateTitle, { color: colors.foreground }]}>
              Organizer Stories
            </Text>
            <Text style={[styles.gateBody, { color: colors.mutedForeground }]}>
              Stories are exclusive to verified event organizers to share live
              moments and event announcements with the community.
            </Text>
            <Pressable
              style={[
                styles.gatePrimaryBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setShowOrganizerGateModal(false);
                onOpenBecomeOrganizer();
              }}
            >
              <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
              <Text style={styles.gatePrimaryBtnText}>Become an organizer</Text>
            </Pressable>
            <Pressable
              style={styles.gateDismissBtn}
              onPress={() => setShowOrganizerGateModal(false)}
            >
              <Text
                style={[
                  styles.gateDismissText,
                  { color: colors.mutedForeground },
                ]}
              >
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 12,
    alignSelf: "stretch",
  },
  scroller: {
    width: "100%",
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 18,
  },
  storyItem: {
    alignItems: "center",
    width: 72,
    gap: 6,
  },
  avatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    padding: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  activeAvatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  activeAvatarInnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  storyViewerRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  storyBackgroundImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: "space-between",
  },
  storyDarkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  tapLeft: {
    position: "absolute",
    top: 100,
    bottom: 120,
    left: 0,
    width: SCREEN_WIDTH * 0.35,
    zIndex: 2,
  },
  tapRight: {
    position: "absolute",
    top: 100,
    bottom: 120,
    right: 0,
    width: SCREEN_WIDTH * 0.65,
    zIndex: 2,
  },
  storyTopControls: {
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 10,
  },
  progressBarsRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  storyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storyOrganizerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  storyHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  storyHeaderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  storyHeaderName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  storyHeaderTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255, 255, 255, 0.75)",
  },
  storyCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  storyBottomArea: {
    paddingHorizontal: 20,
    gap: 12,
    zIndex: 10,
    alignItems: "center",
  },
  storyEventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  storyEventPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    maxWidth: 240,
  },
  storyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
  },
  storyCtaText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  gateOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  gateCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: "center",
    gap: 14,
  },
  gateHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  gateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  gateBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  gatePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 6,
  },
  gatePrimaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  gateDismissBtn: {
    paddingVertical: 8,
  },
  gateDismissText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
