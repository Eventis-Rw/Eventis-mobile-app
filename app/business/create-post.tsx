import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { GlassSurface } from "@/components/GlassSurface";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

const CAPTION_LIMIT = 2200;

const POST_TYPES = [
  { id: "announcement", label: "Announcement", icon: "megaphone-outline" as const },
  { id: "lineup", label: "Lineup Drop", icon: "musical-notes-outline" as const },
  { id: "tickets", label: "Tickets On Sale", icon: "ticket-outline" as const },
  { id: "bts", label: "Behind the Scenes", icon: "camera-outline" as const },
  { id: "venue", label: "Venue Update", icon: "location-outline" as const },
];

const QUICK_LOCATIONS = [
  "Kigali Convention Centre",
  "BK Arena",
  "Camp Kigali",
  "Inzora Rooftop",
  "Norrsken House Kigali",
];

const CTA_OPTIONS = [
  { id: "rsvp", label: "RSVP Now" },
  { id: "tickets", label: "Get Tickets" },
  { id: "learn", label: "Learn More" },
  { id: "event", label: "View Event" },
];

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events } = useEvents();

  const orgName = user?.organisation?.name ?? user?.businessName ?? "Eventis Organiser";

  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<string>("announcement");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
  const [locationTag, setLocationTag] = useState<string>("");
  const [attachedEventId, setAttachedEventId] = useState<string | undefined>();
  const [externalLink, setExternalLink] = useState<string>("");
  const [selectedCta, setSelectedCta] = useState<string>("rsvp");
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const attachedEvent = events.find((e) => e.id === attachedEventId);
  const canPublish = caption.trim().length > 0 && !publishing;

  const pickImage = async () => {
    setImageError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch {
      setImageError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    await new Promise((r) => setTimeout(r, 900));
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setPublishing(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PortalScreenHeader title="Create Post" disabled={publishing} />

      {/* TOP SEGMENT: COMPOSE vs AUDIENCE PREVIEW */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tabBtn, activeTab === "compose" && styles.tabBtnActive]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            setActiveTab("compose");
          }}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={activeTab === "compose" ? "#38BDF8" : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "compose" ? colors.foreground : colors.mutedForeground },
              activeTab === "compose" && styles.tabTextActive,
            ]}
          >
            Compose
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === "preview" && styles.tabBtnActive]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            setActiveTab("preview");
          }}
        >
          <Ionicons
            name="eye-outline"
            size={16}
            color={activeTab === "preview" ? "#38BDF8" : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "preview" ? colors.foreground : colors.mutedForeground },
              activeTab === "preview" && styles.tabTextActive,
            ]}
          >
            Audience Preview
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "compose" ? (
          <>
            {/* ORGANISER IDENTITY ROW */}
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(40).springify() : undefined}
              style={styles.authorRow}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                {user?.organisation?.logoUrl ? (
                  <Image source={{ uri: user.organisation.logoUrl }} style={styles.fill} />
                ) : (
                  <Text style={styles.avatarLetter}>{orgName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.authorMeta}>
                <View style={styles.authorNameRow}>
                  <Text style={[styles.authorName, { color: colors.foreground }]}>{orgName}</Text>
                  <Ionicons name="checkmark-circle" size={15} color="#38BDF8" />
                </View>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Posting to the Eventis Community Feed
                </Text>
              </View>
            </Animated.View>

            {/* POST TOPIC / TAG PILLS */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(70).springify() : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                POST TOPIC
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.postTypeRow}
              >
                {POST_TYPES.map((t) => {
                  const isSelected = postType === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                        setPostType(t.id);
                      }}
                      style={[
                        styles.postTypeChip,
                        {
                          backgroundColor: isSelected ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
                          borderColor: isSelected ? "#38BDF8" : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={t.icon}
                        size={14}
                        color={isSelected ? "#38BDF8" : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.postTypeChipText,
                          { color: isSelected ? "#38BDF8" : colors.foreground },
                          isSelected && styles.postTypeChipTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* CAPTION INPUT WITH GLASSMORPHISM */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}>
              <GlassSurface style={styles.captionCard}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="What's happening? Share lineup drops, door times, behind-the-scenes teasers, or announcements with Kigali…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={CAPTION_LIMIT}
                  textAlignVertical="top"
                  style={[styles.captionInput, { color: colors.foreground }]}
                  accessibilityLabel="Post caption"
                />

                <View style={[styles.captionFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.captionLimit, { color: colors.mutedForeground }]}>
                    {caption.length}/{CAPTION_LIMIT} characters
                  </Text>
                </View>
              </GlassSurface>
            </Animated.View>

            {/* MEDIA ATTACHMENT */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(130).springify() : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                PHOTO / POSTER
              </Text>

              {imageUri ? (
                <GlassSurface style={styles.imageCard}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.6)", "transparent"]}
                    style={styles.imageGradientOverlay}
                  />
                  <View style={styles.imageTopActions}>
                    <Pressable
                      onPress={pickImage}
                      style={[styles.imageActionBtn, { backgroundColor: "rgba(0,0,0,0.6)" }]}
                    >
                      <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Change</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setImageUri(undefined)}
                      style={[styles.imageActionBtn, { backgroundColor: "rgba(239,68,68,0.7)" }]}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Remove</Text>
                    </Pressable>
                  </View>
                </GlassSurface>
              ) : (
                <Pressable
                  onPress={pickImage}
                  style={[
                    styles.uploadDropzone,
                    { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" },
                  ]}
                  accessibilityRole="button"
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: "rgba(56,189,248,0.15)" }]}>
                    <Ionicons name="image-outline" size={24} color="#38BDF8" />
                  </View>
                  <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
                    Upload High-Res Cover or Photo
                  </Text>
                  <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
                    PNG, JPG or WEBP up to 10MB
                  </Text>
                </Pressable>
              )}
              {imageError && <Text style={[styles.error, { color: colors.destructive }]}>{imageError}</Text>}
            </Animated.View>

            {/* ATTACH TO EVENT (LUMA / PARTIFUL STYLE) */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ATTACH TO AN EVENT (OPTIONAL)
              </Text>

              {attachedEvent ? (
                <GlassSurface style={styles.attachedEventCard}>
                  <Image source={{ uri: attachedEvent.image }} style={styles.attachedEventThumb} />
                  <View style={styles.attachedEventMeta}>
                    <Text style={[styles.attachedEventTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {attachedEvent.title}
                    </Text>
                    <Text style={[styles.attachedEventSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                      📍 {attachedEvent.location} · 📅 {attachedEvent.date}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setAttachedEventId(undefined)}
                    style={styles.detachBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                </GlassSurface>
              ) : (
                <Pressable
                  onPress={() => setShowEventPicker(!showEventPicker)}
                  style={[styles.attachEventBtn, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}
                >
                  <Ionicons name="calendar-outline" size={18} color="#38BDF8" />
                  <Text style={[styles.attachEventBtnText, { color: colors.foreground }]}>
                    Link an upcoming event to this post
                  </Text>
                  <Ionicons
                    name={showEventPicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              )}

              {/* Event Picker Dropdown */}
              {showEventPicker && !attachedEvent && (
                <GlassSurface style={styles.eventPickerList}>
                  {events.slice(0, 5).map((ev) => (
                    <Pressable
                      key={ev.id}
                      style={[styles.eventPickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setAttachedEventId(ev.id);
                        setShowEventPicker(false);
                      }}
                    >
                      <Image source={{ uri: ev.image }} style={styles.eventPickerThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventPickerTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <Text style={[styles.eventPickerSub, { color: colors.mutedForeground }]}>
                          {ev.date} · {ev.location}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </GlassSurface>
              )}
            </Animated.View>

            {/* LOCATION TAGGING */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(190).springify() : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                LOCATION TAG (OPTIONAL)
              </Text>
              <GlassSurface style={styles.locationInputRow}>
                <Ionicons name="location-outline" size={18} color="#38BDF8" />
                <TextInput
                  value={locationTag}
                  onChangeText={setLocationTag}
                  placeholder="e.g. Kigali Convention Centre or rooftop"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.locationInput, { color: colors.foreground }]}
                />
                {locationTag.length > 0 && (
                  <Pressable onPress={() => setLocationTag("")}>
                    <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </GlassSurface>

              {/* Quick location chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickLocationsRow}
              >
                {QUICK_LOCATIONS.map((loc) => (
                  <Pressable
                    key={loc}
                    onPress={() => setLocationTag(loc)}
                    style={[
                      styles.quickLocChip,
                      {
                        backgroundColor: locationTag === loc ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
                        borderColor: locationTag === loc ? "#38BDF8" : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickLocText,
                        { color: locationTag === loc ? "#38BDF8" : colors.mutedForeground },
                      ]}
                    >
                      {loc}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>

            {/* CALL TO ACTION BUTTON SELECTOR */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(220).springify() : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ACTION BUTTON FOR ATTENDEES
              </Text>
              <View style={styles.ctaGrid}>
                {CTA_OPTIONS.map((cta) => {
                  const isSelected = selectedCta === cta.id;
                  return (
                    <Pressable
                      key={cta.id}
                      onPress={() => setSelectedCta(cta.id)}
                      style={[
                        styles.ctaChip,
                        {
                          backgroundColor: isSelected ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
                          borderColor: isSelected ? "#38BDF8" : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ctaChipText,
                          { color: isSelected ? "#38BDF8" : colors.foreground },
                          isSelected && styles.ctaChipTextActive,
                        ]}
                      >
                        {cta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </>
        ) : (
          /* AUDIENCE PREVIEW SCREEN */
          <Animated.View entering={FadeIn} style={styles.previewContainer}>
            <View style={styles.previewNotice}>
              <Ionicons name="information-circle-outline" size={18} color="#38BDF8" />
              <Text style={[styles.previewNoticeText, { color: colors.mutedForeground }]}>
                This is how attendees and followers will see your post in their feed:
              </Text>
            </View>

            {/* PREVIEW POST CARD */}
            <GlassSurface style={styles.feedCardPreview}>
              {/* Card Header */}
              <View style={styles.previewCardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  {user?.organisation?.logoUrl ? (
                    <Image source={{ uri: user.organisation.logoUrl }} style={styles.fill} />
                  ) : (
                    <Text style={styles.avatarLetter}>{orgName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.authorNameRow}>
                    <Text style={[styles.authorName, { color: colors.foreground }]}>{orgName}</Text>
                    <Ionicons name="checkmark-circle" size={15} color="#38BDF8" />
                  </View>
                  <Text style={[styles.previewTimestamp, { color: colors.mutedForeground }]}>
                    Just now · {locationTag || "Kigali, Rwanda"}
                  </Text>
                </View>
                <View style={[styles.previewTopicPill, { backgroundColor: "rgba(56,189,248,0.15)" }]}>
                  <Text style={styles.previewTopicText}>
                    {POST_TYPES.find((t) => t.id === postType)?.label}
                  </Text>
                </View>
              </View>

              {/* Caption */}
              <Text style={[styles.previewCaptionText, { color: colors.foreground }]}>
                {caption.trim() || "What's happening? Share an update with your audience…"}
              </Text>

              {/* Photo */}
              {imageUri && (
                <View style={styles.previewImageWrap}>
                  <Image source={{ uri: imageUri }} style={styles.previewPostImage} resizeMode="cover" />
                </View>
              )}

              {/* Attached Event Card in Preview */}
              {attachedEvent && (
                <View style={[styles.previewEventAttachment, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }]}>
                  <Image source={{ uri: attachedEvent.image }} style={styles.previewEventThumb} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.previewEventTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {attachedEvent.title}
                    </Text>
                    <Text style={[styles.previewEventDetails, { color: colors.mutedForeground }]}>
                      📅 {attachedEvent.date} · 📍 {attachedEvent.location}
                    </Text>
                  </View>
                  <View style={styles.previewEventActionBadge}>
                    <Text style={styles.previewEventActionText}>
                      {CTA_OPTIONS.find((c) => c.id === selectedCta)?.label}
                    </Text>
                  </View>
                </View>
              )}

              {/* Card Footer Interactions */}
              <View style={[styles.previewEngagementRow, { borderTopColor: colors.border }]}>
                <View style={styles.previewActionItem}>
                  <Ionicons name="heart-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Like</Text>
                </View>
                <View style={styles.previewActionItem}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Comment</Text>
                </View>
                <View style={styles.previewActionItem}>
                  <Ionicons name="paper-plane-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Share</Text>
                </View>
                <View style={styles.previewActionItem}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Save</Text>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>
        )}

        {/* PUBLISH ACTION BUTTON */}
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(250).springify() : undefined}>
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: canPublish ? colors.primary : "rgba(255,255,255,0.1)" },
            ]}
            onPress={publish}
            disabled={!canPublish}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPublish, busy: publishing }}
          >
            <LinearGradient
              colors={canPublish ? ["rgba(255,255,255,0.2)", "transparent"] : ["transparent", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            {publishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="paper-plane" size={18} color={canPublish ? "#fff" : colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.primaryBtnText,
                { color: canPublish ? "#fff" : colors.mutedForeground },
              ]}
            >
              {publishing ? "Publishing to Feed…" : "Publish Post"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  fill: { width: "100%", height: "100%" },
  content: { padding: 20, gap: 18 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#38BDF8",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  tabTextActive: {
    fontFamily: "Inter_700Bold",
  },

  // Author Row
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLetter: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  authorMeta: { flex: 1, gap: 2 },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    marginBottom: 8,
  },

  // Post Type pills
  postTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  postTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  postTypeChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  postTypeChipTextActive: {
    fontFamily: "Inter_700Bold",
  },

  // Caption card
  captionCard: {
    borderRadius: 18,
    padding: 16,
  },
  captionInput: {
    minHeight: 120,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  captionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  captionLimit: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  // Image upload
  imageCard: {
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  imageGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imageTopActions: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
  },
  imageActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  uploadDropzone: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  uploadSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },

  // Event attachment
  attachedEventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  attachedEventThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  attachedEventMeta: {
    flex: 1,
    gap: 2,
  },
  attachedEventTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  attachedEventSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  detachBtn: {
    padding: 4,
  },
  attachEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  attachEventBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  eventPickerList: {
    borderRadius: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  eventPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  eventPickerThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  eventPickerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  eventPickerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Location
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  quickLocationsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  quickLocChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickLocText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  // CTA Grid
  ctaGrid: {
    flexDirection: "row",
    gap: 8,
  },
  ctaChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ctaChipTextActive: {
    fontFamily: "Inter_700Bold",
  },

  // Preview tab
  previewContainer: {
    gap: 14,
  },
  previewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  previewNoticeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  feedCardPreview: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewTimestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  previewTopicPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewTopicText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#38BDF8",
  },
  previewCaptionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  previewImageWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  previewPostImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  previewEventAttachment: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  previewEventThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  previewEventTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  previewEventDetails: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  previewEventActionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#38BDF8",
  },
  previewEventActionText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  previewEngagementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  previewActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewActionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  // Primary publish
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
