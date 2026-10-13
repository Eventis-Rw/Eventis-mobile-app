import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
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

import { OrganiserSurface } from "@/components/OrganiserSurface";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

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

const POST_STEPS = [
  {
    title: "Write your update",
    eyebrow: "Content",
    description: "Choose a topic and tell your audience what they need to know.",
  },
  {
    title: "Add useful details",
    eyebrow: "Details",
    description: "Add a photo, event, location or action. Everything here is optional.",
  },
  {
    title: "Review and publish",
    eyebrow: "Preview",
    description: "Check how your post will appear in the community feed.",
  },
] as const;

type PostStep = 0 | 1 | 2;

export default function CreatePostScreen() {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events } = useEvents();

  const orgName = user?.organisation?.name ?? user?.businessName ?? "Eventis Organiser";

  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<PostStep>(0);
  const [caption, setCaption] = useState("");
  const [captionError, setCaptionError] = useState<string | undefined>();
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

  const moveToStep = (nextStep: PostStep) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    Keyboard.dismiss();
    setStep(nextStep);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const continueFlow = () => {
    if (step === 0 && !caption.trim()) {
      setCaptionError("Add a caption before continuing.");
      return;
    }

    setCaptionError(undefined);
    if (step < 2) moveToStep((step + 1) as PostStep);
  };

  const goBack = () => {
    if (step > 0) moveToStep((step - 1) as PostStep);
  };

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
      style={[styles.root, { backgroundColor: palette.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OrganiserAtmosphere />
      <PortalScreenHeader title="Create Post" disabled={publishing} />

      <View style={[styles.progressHeader, { backgroundColor: palette.surface, borderColor: colors.border }]}>
        <View style={styles.progressMetaRow}>
          <Text style={styles.progressEyebrow}>
            STEP {step + 1} OF {POST_STEPS.length} · {POST_STEPS[step].eyebrow.toUpperCase()}
          </Text>
          <Text style={[styles.progressCount, { color: colors.mutedForeground }]}>
            {Math.round(((step + 1) / POST_STEPS.length) * 100)}%
          </Text>
        </View>
        <Text accessibilityRole="header" style={[styles.progressTitle, { color: colors.foreground }]}>
          {POST_STEPS[step].title}
        </Text>
        <Text style={[styles.progressDescription, { color: colors.mutedForeground }]}>
          {POST_STEPS[step].description}
        </Text>
        <View style={styles.progressTrack} accessibilityLabel={`Step ${step + 1} of ${POST_STEPS.length}`}>
          {POST_STEPS.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.progressSegment,
                { backgroundColor: index <= step ? palette.accent : palette.surfaceRaised },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.duration(260) : undefined} style={styles.stepContent}>
            <OrganiserSurface style={styles.identityCard}>
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
                  <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
                </View>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>Publishing as your organisation</Text>
              </View>
            </OrganiserSurface>

            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WHAT KIND OF UPDATE IS THIS?</Text>
              <View style={styles.postTypeGrid}>
                {POST_TYPES.map((type) => {
                  const isSelected = postType === type.id;
                  return (
                    <Pressable
                      key={type.id}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                        setPostType(type.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      style={[
                        styles.postTypeChip,
                        {
                          backgroundColor: isSelected ? palette.blueSoft : palette.surface,
                          borderColor: isSelected ? palette.accent : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.topicIcon, { backgroundColor: isSelected ? palette.accent : palette.surfaceRaised }]}>
                        <Ionicons name={type.icon} size={17} color={isSelected ? "#FFFFFF" : colors.mutedForeground} />
                      </View>
                      <Text style={[styles.postTypeChipText, { color: isSelected ? palette.accent : colors.foreground }]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <View style={styles.labelRow}>
                <Text style={[styles.sectionLabel, styles.labelWithoutMargin, { color: colors.mutedForeground }]}>CAPTION</Text>
                <Text style={[styles.captionLimit, { color: colors.mutedForeground }]}>{caption.length}/{CAPTION_LIMIT}</Text>
              </View>
              <OrganiserSurface style={[styles.captionCard, captionError ? { borderColor: colors.destructive } : undefined]}>
                <TextInput
                  value={caption}
                  onChangeText={(value) => {
                    setCaption(value);
                    if (value.trim()) setCaptionError(undefined);
                  }}
                  placeholder="Share the announcement, key detail, or story behind this update…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={CAPTION_LIMIT}
                  textAlignVertical="top"
                  style={[styles.captionInput, { color: colors.foreground }]}
                  accessibilityLabel="Post caption"
                  accessibilityHint="Required before moving to the next step"
                />
              </OrganiserSurface>
              {captionError ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{captionError}</Text> : null}
              <View style={styles.writingHintRow}>
                <Ionicons name="sparkles-outline" size={15} color={palette.accent} />
                <Text style={[styles.writingHint, { color: colors.mutedForeground }]}>Lead with the detail your audience should remember.</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.duration(260) : undefined} style={styles.stepContent}>
            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PHOTO OR POSTER</Text>
              {imageUri ? (
                <OrganiserSurface style={styles.imageCard}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <LinearGradient colors={["rgba(0,0,0,0.68)", "transparent"]} style={styles.imageGradientOverlay} />
                  <View style={styles.imageTopActions}>
                    <Pressable onPress={pickImage} style={styles.imageActionBtn} accessibilityRole="button">
                      <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Change</Text>
                    </Pressable>
                    <Pressable onPress={() => setImageUri(undefined)} style={[styles.imageActionBtn, styles.removeImageBtn]} accessibilityRole="button">
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Remove</Text>
                    </Pressable>
                  </View>
                </OrganiserSurface>
              ) : (
                <Pressable
                  onPress={pickImage}
                  style={[styles.uploadDropzone, { borderColor: colors.border, backgroundColor: palette.surface }]}
                  accessibilityRole="button"
                  accessibilityHint="Opens your photo library"
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: palette.blueSoft }]}>
                    <Ionicons name="images-outline" size={25} color={palette.accent} />
                  </View>
                  <View style={styles.uploadCopy}>
                    <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Add a strong visual</Text>
                    <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>Choose a poster or photo from your library</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </Pressable>
              )}
              {imageError ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{imageError}</Text> : null}
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LINK AN EVENT</Text>
              {attachedEvent ? (
                <OrganiserSurface style={styles.attachedEventCard}>
                  <Image source={{ uri: attachedEvent.image }} style={styles.attachedEventThumb} />
                  <View style={styles.attachedEventMeta}>
                    <Text style={[styles.attachedEventTitle, { color: colors.foreground }]} numberOfLines={1}>{attachedEvent.title}</Text>
                    <Text style={[styles.attachedEventSub, { color: colors.mutedForeground }]} numberOfLines={1}>{attachedEvent.date} · {attachedEvent.location}</Text>
                  </View>
                  <Pressable onPress={() => setAttachedEventId(undefined)} style={styles.detachBtn} accessibilityRole="button" accessibilityLabel="Remove attached event">
                    <Ionicons name="close" size={19} color={colors.mutedForeground} />
                  </Pressable>
                </OrganiserSurface>
              ) : (
                <Pressable
                  onPress={() => setShowEventPicker((current) => !current)}
                  style={[styles.optionRow, { borderColor: colors.border, backgroundColor: palette.surface }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showEventPicker }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="calendar-outline" size={20} color={palette.accent} /></View>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>Attach an upcoming event</Text>
                    <Text style={[styles.optionDescription, { color: colors.mutedForeground }]}>Give people a direct path to event details</Text>
                  </View>
                  <Ionicons name={showEventPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
                </Pressable>
              )}

              {showEventPicker && !attachedEvent ? (
                <OrganiserSurface style={styles.eventPickerList}>
                  {events.length > 0 ? events.slice(0, 5).map((event) => (
                    <Pressable
                      key={event.id}
                      style={[styles.eventPickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setAttachedEventId(event.id);
                        setShowEventPicker(false);
                      }}
                    >
                      <Image source={{ uri: event.image }} style={styles.eventPickerThumb} />
                      <View style={styles.eventPickerCopy}>
                        <Text style={[styles.eventPickerTitle, { color: colors.foreground }]} numberOfLines={1}>{event.title}</Text>
                        <Text style={[styles.eventPickerSub, { color: colors.mutedForeground }]} numberOfLines={1}>{event.date} · {event.location}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={palette.accent} />
                    </Pressable>
                  )) : (
                    <Text style={[styles.emptyPickerText, { color: colors.mutedForeground }]}>Create an event first, then you can link it here.</Text>
                  )}
                </OrganiserSurface>
              ) : null}
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LOCATION</Text>
              <OrganiserSurface style={styles.locationInputRow}>
                <Ionicons name="location-outline" size={19} color={palette.accent} />
                <TextInput
                  value={locationTag}
                  onChangeText={setLocationTag}
                  placeholder="Venue or neighbourhood"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.locationInput, { color: colors.foreground }]}
                  accessibilityLabel="Post location"
                />
                {locationTag.length > 0 ? (
                  <Pressable onPress={() => setLocationTag("")} accessibilityRole="button" accessibilityLabel="Clear location">
                    <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </OrganiserSurface>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLocationsRow}>
                {QUICK_LOCATIONS.map((location) => {
                  const isSelected = locationTag === location;
                  return (
                    <Pressable
                      key={location}
                      onPress={() => setLocationTag(location)}
                      style={[styles.quickLocChip, { backgroundColor: isSelected ? palette.blueSoft : palette.surface, borderColor: isSelected ? palette.accent : colors.border }]}
                    >
                      <Text style={[styles.quickLocText, { color: isSelected ? palette.accent : colors.mutedForeground }]}>{location}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CALL TO ACTION</Text>
              <View style={styles.ctaGrid}>
                {CTA_OPTIONS.map((cta) => {
                  const isSelected = selectedCta === cta.id;
                  return (
                    <Pressable
                      key={cta.id}
                      onPress={() => setSelectedCta(cta.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      style={[styles.ctaChip, { backgroundColor: isSelected ? palette.blueSoft : palette.surface, borderColor: isSelected ? palette.accent : colors.border }]}
                    >
                      <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={17} color={isSelected ? palette.accent : colors.mutedForeground} />
                      <Text style={[styles.ctaChipText, { color: isSelected ? palette.accent : colors.foreground }]}>{cta.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <OrganiserSurface style={styles.linkInputRow}>
                <Ionicons name="link-outline" size={19} color={palette.accent} />
                <TextInput
                  value={externalLink}
                  onChangeText={setExternalLink}
                  placeholder="Optional link, e.g. ticket page"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[styles.locationInput, { color: colors.foreground }]}
                  accessibilityLabel="Call to action link"
                />
              </OrganiserSurface>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeIn.duration(220)} style={styles.stepContent}>
            <View style={styles.previewNotice}>
              <View style={[styles.previewNoticeIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="eye-outline" size={18} color={palette.accent} /></View>
              <View style={styles.optionCopy}>
                <Text style={[styles.previewNoticeTitle, { color: colors.foreground }]}>Audience preview</Text>
                <Text style={[styles.previewNoticeText, { color: colors.mutedForeground }]}>This is how the post will appear in the feed.</Text>
              </View>
            </View>

            <OrganiserSurface style={styles.feedCardPreview}>
              <View style={styles.previewCardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  {user?.organisation?.logoUrl ? <Image source={{ uri: user.organisation.logoUrl }} style={styles.fill} /> : <Text style={styles.avatarLetter}>{orgName.charAt(0).toUpperCase()}</Text>}
                </View>
                <View style={styles.previewAuthorCopy}>
                  <View style={styles.authorNameRow}>
                    <Text style={[styles.authorName, { color: colors.foreground }]}>{orgName}</Text>
                    <Ionicons name="checkmark-circle" size={15} color={palette.accent} />
                  </View>
                  <Text style={[styles.previewTimestamp, { color: colors.mutedForeground }]}>Just now{locationTag ? ` · ${locationTag}` : ""}</Text>
                </View>
                <View style={[styles.previewTopicPill, { backgroundColor: palette.blueSoft }]}>
                  <Text style={[styles.previewTopicText, { color: palette.accent }]}>{POST_TYPES.find((type) => type.id === postType)?.label}</Text>
                </View>
              </View>

              <Text style={[styles.previewCaptionText, { color: colors.foreground }]}>{caption.trim()}</Text>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewPostImage} resizeMode="cover" /> : null}

              {attachedEvent ? (
                <View style={[styles.previewEventAttachment, { backgroundColor: palette.surfaceRaised, borderColor: colors.border }]}>
                  <Image source={{ uri: attachedEvent.image }} style={styles.previewEventThumb} />
                  <View style={styles.eventPickerCopy}>
                    <Text style={[styles.previewEventTitle, { color: colors.foreground }]} numberOfLines={1}>{attachedEvent.title}</Text>
                    <Text style={[styles.previewEventDetails, { color: colors.mutedForeground }]} numberOfLines={1}>{attachedEvent.date} · {attachedEvent.location}</Text>
                  </View>
                  <View style={[styles.previewEventActionBadge, { backgroundColor: palette.accent }]}><Text style={styles.previewEventActionText}>{CTA_OPTIONS.find((cta) => cta.id === selectedCta)?.label}</Text></View>
                </View>
              ) : null}

              {externalLink && !attachedEvent ? (
                <View style={[styles.linkPreview, { backgroundColor: palette.surfaceRaised }]}>
                  <Ionicons name="link-outline" size={17} color={palette.accent} />
                  <Text style={[styles.linkPreviewText, { color: colors.foreground }]} numberOfLines={1}>{externalLink}</Text>
                  <Text style={[styles.linkPreviewAction, { color: palette.accent }]}>{CTA_OPTIONS.find((cta) => cta.id === selectedCta)?.label}</Text>
                </View>
              ) : null}

              <View style={[styles.previewEngagementRow, { borderTopColor: colors.border }]}>
                <View style={styles.previewActionItem}><Ionicons name="paper-plane-outline" size={19} color={colors.mutedForeground} /><Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Share</Text></View>
                <View style={styles.previewActionItem}><Ionicons name="bookmark-outline" size={19} color={colors.mutedForeground} /><Text style={[styles.previewActionText, { color: colors.mutedForeground }]}>Save</Text></View>
              </View>
            </OrganiserSurface>

            <OrganiserSurface style={styles.reviewSummary}>
              <View style={styles.reviewRow}><Ionicons name="images-outline" size={18} color={imageUri ? palette.accent : colors.mutedForeground} /><Text style={[styles.reviewLabel, { color: colors.foreground }]}>Visual</Text><Text style={[styles.reviewValue, { color: imageUri ? palette.accent : colors.mutedForeground }]}>{imageUri ? "Added" : "None"}</Text></View>
              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
              <View style={styles.reviewRow}><Ionicons name="calendar-outline" size={18} color={attachedEvent ? palette.accent : colors.mutedForeground} /><Text style={[styles.reviewLabel, { color: colors.foreground }]}>Linked event</Text><Text style={[styles.reviewValue, { color: attachedEvent ? palette.accent : colors.mutedForeground }]} numberOfLines={1}>{attachedEvent?.title ?? "None"}</Text></View>
              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
              <View style={styles.reviewRow}><Ionicons name="location-outline" size={18} color={locationTag ? palette.accent : colors.mutedForeground} /><Text style={[styles.reviewLabel, { color: colors.foreground }]}>Location</Text><Text style={[styles.reviewValue, { color: locationTag ? palette.accent : colors.mutedForeground }]} numberOfLines={1}>{locationTag || "None"}</Text></View>
            </OrganiserSurface>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: palette.canvas, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {step > 0 ? (
          <Pressable onPress={goBack} disabled={publishing} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: palette.surface }]} accessibilityRole="button">
            <Ionicons name="arrow-back" size={19} color={colors.foreground} />
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={step === 2 ? publish : continueFlow}
          disabled={step === 2 && !canPublish}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: palette.accent, opacity: pressed || publishing ? 0.78 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={step === 2 ? "Publish post" : `Continue to step ${step + 2}`}
          accessibilityState={{ disabled: step === 2 && !canPublish, busy: publishing }}
        >
          {publishing ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Text style={styles.primaryBtnText}>{step === 2 ? "Publish post" : step === 1 ? "Review post" : "Continue"}</Text>
              <Ionicons name={step === 2 ? "paper-plane" : "arrow-forward"} size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  fill: { width: "100%", height: "100%" },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  progressHeader: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  progressMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressEyebrow: {
    color: "#38BDF8",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  progressCount: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  progressTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontFamily: "Inter_700Bold",
  },
  progressDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  progressSegment: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  stepContent: {
    gap: 22,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
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
  authorName: { flexShrink: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  labelWithoutMargin: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  postTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  postTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    width: "48.5%",
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    gap: 9,
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  postTypeChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  captionCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  captionInput: {
    minHeight: 160,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  captionLimit: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 7,
  },
  writingHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  writingHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  imageCard: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 4 / 3,
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
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: "rgba(4,8,14,0.82)",
  },
  removeImageBtn: {
    backgroundColor: "rgba(173,36,55,0.9)",
  },
  imageActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  uploadDropzone: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCopy: {
    flex: 1,
    gap: 3,
  },
  uploadTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  uploadSub: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  attachedEventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 18,
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
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
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
    minHeight: 66,
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
  eventPickerCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyPickerText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    padding: 16,
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minHeight: 54,
    paddingVertical: 11,
    borderRadius: 16,
    gap: 10,
  },
  linkInputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    gap: 10,
    marginTop: 10,
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
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickLocText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  ctaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ctaChip: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  ctaChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  previewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
  },
  previewNoticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  previewNoticeTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  previewNoticeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  feedCardPreview: {
    borderRadius: 20,
    paddingTop: 16,
    overflow: "hidden",
  },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  previewAuthorCopy: {
    flex: 1,
    minWidth: 0,
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
    maxWidth: 94,
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
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  previewPostImage: {
    width: "100%",
    aspectRatio: 4 / 5,
  },
  previewEventAttachment: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    borderRadius: 15,
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
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  linkPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
  },
  linkPreviewText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  linkPreviewAction: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  reviewSummary: {
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  reviewRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  reviewValue: {
    maxWidth: "48%",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  reviewDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 28,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    minWidth: 108,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  primaryBtn: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
