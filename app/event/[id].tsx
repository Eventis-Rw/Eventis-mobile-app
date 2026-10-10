import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { GlassSurface } from "@/components/GlassSurface";
import { getEventImage } from "@/constants/eventImages";
import { getEventPalette, getEventTiming } from "@/constants/eventPresentation";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useChat } from "@/context/ChatContext";
import { useEvents } from "@/context/EventsContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { shareEvent } from "@/utils/shareEvent";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const { user, toggleSaveEvent, requestOTP } = useAuth();
  const { hasBookedEvent, addBooking } = useBookings();
  const { getEventById, isLoading } = useEvents();
  const { conversations, getContact, sendMessage } = useChat();

  const [bookingLoading, setBookingLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [reportState, setReportState] = useState<"idle" | "reported">("idle");

  const [chatSearch, setChatSearch] = useState("");
  const [sentChatIds, setSentChatIds] = useState<Record<string, boolean>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const event = getEventById(id ?? "");
  const isBooked = hasBookedEvent(id ?? "");
  const isSaved = user?.savedEvents.includes(id ?? "") ?? false;
  const palette = getEventPalette(event?.category ?? "Business");
  const timing = useMemo(() => (event ? getEventTiming(event) : null), [event]);

  // Dynamic metrics
  const viewsCount = useMemo(() => {
    if (!event) return 180;
    if (event.viewCount && event.viewCount > 0) return event.viewCount;
    const seed = event.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 1800 + (seed % 5400);
  }, [event]);

  const initialShares = useMemo(() => {
    return Math.max(16, Math.floor(viewsCount * 0.086));
  }, [viewsCount]);

  const [shareCount, setShareCount] = useState(initialShares);

  const attendeesCount = useMemo(() => {
    return Math.max(34, Math.floor(viewsCount * 0.14));
  }, [viewsCount]);

  // Actions
  const handleBook = useCallback(async () => {
    if (!event || timing?.kind === "ended") return;
    if (!user) {
      router.push("/auth/register" as never);
      return;
    }
    if (event.isPaid && !user.isPhoneVerified) {
      requestOTP("payment", event.id);
      router.push({
        pathname: "/auth/otp",
        params: { purpose: "payment", eventId: event.id },
      } as never);
      return;
    }
    if (event.isPaid && event.organizerWebsite) {
      await Linking.openURL(event.organizerWebsite);
      return;
    }
    setBookingLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addBooking({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImage: event.image,
      userId: user.id,
      quantity: 1,
      totalPrice: event.price,
      currency: event.currency,
      isPaid: event.isPaid,
    });
    setBookingLoading(false);
    router.push("/(tabs)/tickets" as never);
  }, [addBooking, event, requestOTP, router, timing?.kind, user]);

  const handleSave = useCallback(() => {
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [event, toggleSaveEvent]);

  const handleOpenShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatSearch("");
    setShowShareModal(true);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!event) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(`https://eventis.app/event/${event.id}`);
    setShareCount((prev) => prev + 1);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [event]);

  const handleNativeShare = useCallback(async () => {
    if (!event) return;
    setShowShareModal(false);
    setShareCount((prev) => prev + 1);
    await shareEvent(event);
  }, [event]);

  const handleSendToChat = useCallback(
    async (convId: string) => {
      if (!event || sentChatIds[convId]) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSentChatIds((prev) => ({ ...prev, [convId]: true }));
      setShareCount((prev) => prev + 1);
      const shareText = `Check out this event: ${event.title}\n📍 ${event.location}, ${event.city}\n📅 ${formatDate(event.date)} · ${event.time}\nhttps://eventis.app/event/${event.id}`;
      await sendMessage(convId, shareText);
    },
    [event, sendMessage, sentChatIds]
  );

  const handleSendToAllChats = useCallback(async () => {
    if (!event || !conversations.length || sendingAll) return;
    setSendingAll(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShareCount((prev) => prev + conversations.length);
    const shareText = `Check out this event: ${event.title}\n📍 ${event.location}, ${event.city}\n📅 ${formatDate(event.date)} · ${event.time}\nhttps://eventis.app/event/${event.id}`;
    const newSent: Record<string, boolean> = { ...sentChatIds };
    for (const conv of conversations) {
      newSent[conv.id] = true;
      await sendMessage(conv.id, shareText);
    }
    setSentChatIds(newSent);
    setSendingAll(false);
  }, [conversations, sendingAll, event, sendMessage, sentChatIds]);

  const handleShareToChat = useCallback(() => {
    if (!event) return;
    setShowShareModal(false);
    router.push({
      pathname: "/chat",
      params: { eventId: event.id, eventTitle: event.title },
    } as never);
  }, [event, router]);

  const handleReport = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setReportState("reported");
    setTimeout(() => {
      setShowOptionsModal(false);
      setReportState("idle");
    }, 1600);
  }, []);

  const openMaps = useCallback(() => {
    if (!event) return;
    const query = encodeURIComponent(`${event.location}, ${event.city}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }, [event]);

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

  if (!event || !timing) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <>
            <View style={[styles.notFoundIconCircle, { backgroundColor: colors.glass }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.notFoundText, { color: colors.foreground }]}>Event not found</Text>
            <Text style={[styles.notFoundSub, { color: colors.mutedForeground }]}>
              This event may have been removed or is no longer accessible.
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={[styles.notFoundBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.notFoundBtnText}>Go back</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const instructions = (event.instructions ?? []).map((item) => item.trim()).filter(Boolean);
  const price =
    !event.isPaid || event.price <= 0
      ? "Free entry"
      : `${event.currency} ${event.price.toLocaleString()}`;

  const isLongDescription = event.description.length > 220;
  const webBlurStyle =
    Platform.OS === "web"
      ? ({
          backdropFilter: "blur(28px) saturate(1.5)",
          WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        } as any)
      : null;

  return (
    <View style={[styles.root, { backgroundColor: "#060913" }]}>
      {/* Background ambient gradient */}
      <LinearGradient
        colors={scheme === "dark" ? ["#0F172A", "#070B19", "#030712"] : ["#E0E7FF", "#EEF2FF", "#F8FAFC"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO IMAGE BANNER */}
        <ImageBackground
          source={getEventImage(event.image)}
          style={styles.hero}
          resizeMode="cover"
        >
          {/* Top subtle vignette */}
          <LinearGradient
            colors={["rgba(3,6,18,0.72)", "rgba(3,6,18,0.22)", "transparent"]}
            locations={[0, 0.45, 1]}
            style={[StyleSheet.absoluteFill, { height: 160 }]}
          />

          {/* Bottom rich moody gradient seamlessly blending into the page */}
          <LinearGradient
            colors={["transparent", "rgba(6,9,19,0.55)", "rgba(6,9,19,0.92)", "#060913"]}
            locations={[0, 0.5, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating Top Navigation Bar */}
          <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
            <FrostedIconButton
              icon="chevron-back"
              label="Back"
              onPress={() => router.back()}
            />

            <View style={styles.heroTopActions}>
              <FrostedIconButton
                icon={isSaved ? "bookmark" : "bookmark-outline"}
                label={isSaved ? "Saved" : "Save"}
                onPress={handleSave}
                iconColor={isSaved ? "#38BDF8" : "#FFFFFF"}
                active={isSaved}
              />
              <FrostedIconButton
                icon="paper-plane-outline"
                label="Share"
                onPress={handleOpenShare}
              />
              <FrostedIconButton
                icon="ellipsis-horizontal"
                label="Options"
                onPress={() => setShowOptionsModal(true)}
              />
            </View>
          </View>

          {/* Hero Bottom Meta Info */}
          <View style={styles.heroBottomWrap}>
            {/* Badges Row */}
            <View style={styles.badgeRow}>
              {/* Timing badge */}
              <View
                style={[
                  styles.statusBadge,
                  timing.kind === "live"
                    ? styles.liveBadge
                    : { backgroundColor: "rgba(255,255,255,0.14)" },
                ]}
              >
                {timing.kind === "live" && <View style={styles.livePulseDot} />}
                <Text style={styles.statusBadgeText}>
                  {timing.kind === "live" ? "LIVE NOW" : timing.label.toUpperCase()}
                </Text>
              </View>

              {/* Category Pill */}
              <View style={[styles.categoryBadge, { backgroundColor: palette.accent }]}>
                <Ionicons name="sparkles" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.categoryBadgeText}>{event.category.toUpperCase()}</Text>
              </View>

              {/* Price Indicator */}
              <View style={styles.pricePill}>
                <Ionicons
                  name={event.isPaid ? "ticket-outline" : "gift-outline"}
                  size={12}
                  color="#38BDF8"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.pricePillText}>{price}</Text>
              </View>
            </View>

            {/* Event Title */}
            <Text style={styles.heroTitle}>{event.title}</Text>

            {/* Venue & Location Row */}
            <Pressable
              style={styles.heroLocationRow}
              onPress={openMaps}
              accessibilityRole="button"
              accessibilityLabel={`View ${event.location} on map`}
            >
              <View style={styles.locationPinCircle}>
                <Ionicons name="location" size={14} color="#38BDF8" />
              </View>
              <Text style={styles.heroLocationText} numberOfLines={1}>
                {event.location}, {event.city}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
        </ImageBackground>

        {/* FLOATING QUICK STATS & INSIGHTS BAR */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(60).springify() : undefined}
          style={styles.statsBarContainer}
        >
          <GlassSurface style={styles.statsGlassBar} intensity={55}>
            {/* Views */}
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statValue}>{formatCount(viewsCount)}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Shares */}
            <Pressable
              style={styles.statItem}
              onPress={handleOpenShare}
              accessibilityRole="button"
              accessibilityLabel={`Share event, currently ${shareCount} shares`}
            >
              <Ionicons name="paper-plane-outline" size={15} color="#10B981" />
              <Text style={styles.statValue}>{formatCount(shareCount)}</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </Pressable>

            <View style={styles.statDivider} />

            {/* Saves (count hidden, interactive bookmark toggle) */}
            <Pressable
              style={styles.statItem}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? "Saved event" : "Save event"}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? "#38BDF8" : "rgba(255,255,255,0.75)"}
              />
              <Text
                style={[
                  styles.statLabel,
                  {
                    marginTop: 4,
                    fontWeight: "600",
                    color: isSaved ? "#38BDF8" : "rgba(255,255,255,0.85)",
                  },
                ]}
              >
                {isSaved ? "Saved" : "Save"}
              </Text>
            </Pressable>
          </GlassSurface>
        </Animated.View>

        {/* SOCIAL PROOF & COMMUNITY STRIP */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          style={styles.communityStrip}
        >
          <View style={styles.avatarStack}>
            <View style={[styles.stackedAvatar, { backgroundColor: "#8B5CF6", zIndex: 4 }]}>
              <Text style={styles.avatarInitial}>AK</Text>
            </View>
            <View style={[styles.stackedAvatar, { backgroundColor: "#EC4899", zIndex: 3, marginLeft: -10 }]}>
              <Text style={styles.avatarInitial}>JM</Text>
            </View>
            <View style={[styles.stackedAvatar, { backgroundColor: "#3B82F6", zIndex: 2, marginLeft: -10 }]}>
              <Text style={styles.avatarInitial}>SC</Text>
            </View>
            <View style={[styles.stackedAvatar, { backgroundColor: "#10B981", zIndex: 1, marginLeft: -10 }]}>
              <Text style={styles.avatarInitial}>DK</Text>
            </View>
          </View>
          <View style={styles.communityTextCol}>
            <Text style={styles.communityHeadline}>
              <Text style={styles.communityCount}>+{attendeesCount} people</Text> attending & interested
            </Text>
          </View>
        </Animated.View>

        {/* MAIN CONTENT BODY */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
          style={styles.contentContainer}
        >
          {/* SECTION: AT A GLANCE (3 MODERN TILES) */}
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionAccentLine} />
            <Text style={styles.sectionHeadingTitle}>At a glance</Text>
          </View>

          {/* Tile 1: Date & Time Card */}
          <GlassSurface style={styles.glassInfoCard} intensity={40}>
            <View style={[styles.cardIconBox, { backgroundColor: "rgba(56, 189, 248, 0.14)" }]}>
              <Ionicons name="calendar" size={22} color="#38BDF8" />
            </View>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardInfoEyebrow}>DATE & SCHEDULE</Text>
              <Text style={styles.cardInfoMainText}>{formatFullDate(event.date)}</Text>
              <Text style={styles.cardInfoSubText}>
                {event.time} {event.endTime ? `– ${event.endTime}` : "onwards"} · {timing.label}
              </Text>
            </View>
          </GlassSurface>

          {/* Tile 2: Venue & Location Card */}
          <Pressable
            onPress={openMaps}
            accessibilityRole="button"
            accessibilityLabel={`Open ${event.location} in maps`}
          >
            <GlassSurface style={styles.glassInfoCard} intensity={40}>
              <View style={[styles.cardIconBox, { backgroundColor: "rgba(16, 185, 129, 0.14)" }]}>
                <Ionicons name="location" size={22} color="#10B981" />
              </View>
              <View style={styles.cardInfoCol}>
                <Text style={styles.cardInfoEyebrow}>VENUE & LOCATION</Text>
                <Text style={styles.cardInfoMainText} numberOfLines={1}>{event.location}</Text>
                <Text style={styles.cardInfoSubText}>
                  {event.city} · {event.distance} km away
                </Text>
              </View>
              <View style={styles.cardActionPill}>
                <Text style={styles.cardActionPillText}>Maps</Text>
                <Ionicons name="open-outline" size={13} color="#10B981" />
              </View>
            </GlassSurface>
          </Pressable>

          {/* Tile 3: Admission & Pricing Card */}
          <GlassSurface style={styles.glassInfoCard} intensity={40}>
            <View style={[styles.cardIconBox, { backgroundColor: "rgba(245, 158, 11, 0.14)" }]}>
              <Ionicons name="ticket" size={22} color="#F59E0B" />
            </View>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardInfoEyebrow}>ADMISSION & TICKETS</Text>
              <Text style={styles.cardInfoMainText}>{price}</Text>
              <Text style={styles.cardInfoSubText}>
                {event.isPaid
                  ? "Instant ticket confirmation · Mobile check-in"
                  : "No reservation needed · Free community access"}
              </Text>
            </View>
          </GlassSurface>

          {/* SECTION: HOSTED BY ORGANIZER */}
          <View style={[styles.sectionHeadingRow, { marginTop: 26 }]}>
            <View style={styles.sectionAccentLine} />
            <Text style={styles.sectionHeadingTitle}>Hosted by</Text>
          </View>

          <GlassSurface style={styles.organizerCard} intensity={45}>
            <View style={styles.organizerHeaderRow}>
              <View style={[styles.organizerAvatar, { backgroundColor: palette.accent }]}>
                <Text style={styles.organizerAvatarLetter}>
                  {event.organizer.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.organizerMetaCol}>
                <View style={styles.organizerNameRow}>
                  <Text style={styles.organizerName} numberOfLines={1}>
                    {event.organizer}
                  </Text>
                  <Ionicons name="checkmark-circle" size={17} color="#38BDF8" style={{ marginLeft: 5 }} />
                </View>
                <Text style={styles.organizerRole}>Verified Host · Event Organizer</Text>
              </View>
            </View>

            {/* Organizer Quick Actions */}
            <View style={styles.organizerActionsRow}>
              <Pressable
                style={styles.organizerBtn}
                onPress={handleShareToChat}
                accessibilityRole="button"
                accessibilityLabel="Message organizer"
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#FFFFFF" />
                <Text style={styles.organizerBtnText}>Message Host</Text>
              </Pressable>

              {event.organizerWebsite && (
                <Pressable
                  style={[styles.organizerBtn, styles.organizerBtnOutline]}
                  onPress={() => Linking.openURL(event.organizerWebsite!)}
                  accessibilityRole="button"
                  accessibilityLabel="Visit organizer website"
                >
                  <Ionicons name="globe-outline" size={16} color="#38BDF8" />
                  <Text style={[styles.organizerBtnText, { color: "#38BDF8" }]}>Website</Text>
                </Pressable>
              )}
            </View>
          </GlassSurface>

          {/* SECTION: ABOUT THIS EVENT */}
          <View style={[styles.sectionHeadingRow, { marginTop: 26 }]}>
            <View style={styles.sectionAccentLine} />
            <Text style={styles.sectionHeadingTitle}>About this event</Text>
          </View>

          <GlassSurface style={styles.storyCard} intensity={40}>
            <Text
              style={styles.storyText}
              numberOfLines={descriptionExpanded ? undefined : 4}
            >
              {event.description}
            </Text>

            {isLongDescription && (
              <Pressable
                onPress={() => setDescriptionExpanded((prev) => !prev)}
                style={styles.readMoreBtn}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.readMoreText}>
                  {descriptionExpanded ? "Show less" : "Read more"}
                </Text>
                <Ionicons
                  name={descriptionExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#38BDF8"
                />
              </Pressable>
            )}

            {/* Tags Badges */}
            {event.tags?.length ? (
              <View style={styles.tagGrid}>
                {event.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>#{tag.replace(/\s+/g, "")}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassSurface>

          {/* SECTION: GOOD TO KNOW / BEFORE YOU GO */}
          {instructions.length > 0 && (
            <>
              <View style={[styles.sectionHeadingRow, { marginTop: 26 }]}>
                <View style={styles.sectionAccentLine} />
                <Text style={styles.sectionHeadingTitle}>Before you go</Text>
              </View>

              <GlassSurface style={styles.guidelinesCard} intensity={40}>
                {instructions.map((item, idx) => (
                  <View
                    key={item}
                    style={[
                      styles.guidelineRow,
                      idx < instructions.length - 1 && styles.guidelineRowBorder,
                    ]}
                  >
                    <View style={styles.guidelineCheckCircle}>
                      <Ionicons name="checkmark" size={13} color="#10B981" />
                    </View>
                    <Text style={styles.guidelineText}>{item}</Text>
                  </View>
                ))}
              </GlassSurface>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* FIXED FLOATING GLASS BOTTOM ACTION BAR */}
      <GlassSurface
        style={[
          styles.bottomFixedBar,
          {
            paddingBottom: insets.bottom + 12,
            borderWidth: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: "rgba(255,255,255,0.14)",
            borderRadius: 0,
          },
        ]}
        intensity={60}
      >
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>TICKET ADMISSION</Text>
          <Text style={styles.bottomPriceValue}>{price}</Text>
          <Text style={styles.bottomPriceSub}>Instant confirmation</Text>
        </View>

        <Pressable
          onPress={isBooked || timing.kind === "ended" ? undefined : handleBook}
          disabled={bookingLoading || timing.kind === "ended"}
          accessibilityRole="button"
          style={[
            styles.bottomCtaBtn,
            {
              backgroundColor: isBooked
                ? "#10B981"
                : timing.kind === "ended"
                ? "rgba(255,255,255,0.16)"
                : colors.primary,
              opacity: bookingLoading ? 0.75 : 1,
            },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons
                name={
                  isBooked
                    ? "checkmark-circle"
                    : timing.kind === "ended"
                    ? "time-outline"
                    : event.isPaid
                    ? "ticket"
                    : "add-circle"
                }
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.bottomCtaText}>
                {isBooked
                  ? "Booked"
                  : timing.kind === "ended"
                  ? "Event ended"
                  : event.isPaid
                  ? "Get tickets"
                  : "Reserve spot"}
              </Text>
            </>
          )}
        </Pressable>
      </GlassSurface>

      {/* INSTAGRAM-STYLE TRANSPARENT FROSTED SHARE MODAL */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowShareModal(false)}
        >
          <Pressable
            style={[styles.shareCard, webBlurStyle]}
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

            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Share Event</Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {event.title}
              </Text>
            </View>

            {/* Search Input */}
            <View style={[styles.modalSearchRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="search" size={17} color={colors.mutedForeground} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.foreground }]}
                placeholder="Search chats..."
                placeholderTextColor={colors.mutedForeground}
                value={chatSearch}
                onChangeText={setChatSearch}
              />
              {chatSearch.length > 0 && (
                <Pressable onPress={() => setChatSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* Send to all chats button */}
            {conversations.length > 1 && !chatSearch.trim() && (
              <Pressable
                style={[styles.sendAllBtn, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}33` }]}
                onPress={handleSendToAllChats}
                disabled={sendingAll}
              >
                <Ionicons name="paper-plane" size={16} color={colors.primary} />
                <Text style={[styles.sendAllBtnText, { color: colors.primary }]}>
                  {sendingAll ? "Sending to all..." : `Send to all (${conversations.length} chats)`}
                </Text>
              </Pressable>
            )}

            {/* Contacts list */}
            <ScrollView style={styles.shareChatList} showsVerticalScrollIndicator={false}>
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const contact = getContact(conv.contactId);
                  const isSent = !!sentChatIds[conv.id];
                  return (
                    <View
                      key={conv.id}
                      style={[styles.shareChatItem, { borderBottomColor: colors.border }]}
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
                            <Text style={[styles.shareChatSendText, { color: colors.foreground }]}>Sent</Text>
                          </View>
                        ) : (
                          <Text style={[styles.shareChatSendText, { color: "#FFFFFF" }]}>Send</Text>
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

            {/* Bottom Quick Action Circles */}
            <View style={[styles.shareQuickActionsRow, { borderTopColor: colors.border }]}>
              {/* External Apps */}
              <Pressable style={styles.shareQuickAction} onPress={handleNativeShare}>
                <View style={[styles.shareQuickActionCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="share-social" size={20} color={colors.foreground} />
                </View>
                <Text style={[styles.shareQuickActionLabel, { color: colors.mutedForeground }]}>
                  Share to Apps
                </Text>
              </Pressable>

              {/* Copy link */}
              <Pressable style={styles.shareQuickAction} onPress={handleCopyLink}>
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
              <Pressable style={styles.shareQuickAction} onPress={handleShareToChat}>
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

      {/* MORE OPTIONS MODAL (3-DOTS SHEET) */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowOptionsModal(false)}
        >
          <Pressable
            style={[styles.optionsCard, webBlurStyle]}
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

            <View style={styles.modalHandle} />

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
                <View style={[styles.optionsGroup, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}>
                  <Pressable
                    style={[styles.optionsItem, { borderBottomColor: "rgba(255,255,255,0.08)" }]}
                    onPress={handleReport}
                    accessibilityRole="button"
                  >
                    <View style={styles.optionsItemLeft}>
                      <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                      <Text style={[styles.optionsItemText, { color: "#EF4444" }]}>Report</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#EF4444" />
                  </Pressable>

                  <Pressable
                    style={[styles.optionsItem, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowOptionsModal(false);
                      router.back();
                    }}
                    accessibilityRole="button"
                  >
                    <View style={styles.optionsItemLeft}>
                      <Ionicons name="eye-off-outline" size={20} color={colors.foreground} />
                      <Text style={[styles.optionsItemText, { color: colors.foreground }]}>Not interested</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Group 2: Engagement */}
                <View style={[styles.optionsGroup, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}>
                  <Pressable
                    style={[styles.optionsItem, { borderBottomColor: "rgba(255,255,255,0.08)" }]}
                    onPress={() => {
                      handleSave();
                      setShowOptionsModal(false);
                    }}
                    accessibilityRole="button"
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
                    {isSaved && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </Pressable>

                  <Pressable
                    style={[styles.optionsItem, { borderBottomWidth: 0 }]}
                    onPress={async () => {
                      await handleCopyLink();
                      setTimeout(() => setShowOptionsModal(false), 800);
                    }}
                    accessibilityRole="button"
                  >
                    <View style={styles.optionsItemLeft}>
                      <Ionicons
                        name={copyFeedback ? "checkmark" : "link-outline"}
                        size={20}
                        color={copyFeedback ? "#10B981" : colors.foreground}
                      />
                      <Text
                        style={[
                          styles.optionsItemText,
                          { color: copyFeedback ? "#10B981" : colors.foreground },
                        ]}
                      >
                        {copyFeedback ? "Link Copied!" : "Copy link"}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* Cancel Button */}
                <Pressable
                  style={[styles.optionsCancelBtn, { backgroundColor: "rgba(255,255,255,0.09)", borderColor: "rgba(255,255,255,0.14)" }]}
                  onPress={() => setShowOptionsModal(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.optionsCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Frosted glass circular top action button */
function FrostedIconButton({
  icon,
  label,
  onPress,
  iconColor = "#FFFFFF",
  active = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  iconColor?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.frostedCircleBtn,
        active && styles.frostedCircleBtnActive,
      ]}
    >
      {Platform.OS !== "web" ? (
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      ) : null}
      <Ionicons name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },

  // HERO
  hero: {
    height: 470,
    justifyContent: "space-between",
    backgroundColor: "#060913",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  heroTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  frostedCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 15, 30, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  frostedCircleBtnActive: {
    borderColor: "rgba(56, 189, 248, 0.5)",
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  heroBottomWrap: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  liveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.32)",
  },
  pricePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.8,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  locationPinCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLocationText: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },

  // STATS BAR
  statsBarContainer: {
    paddingHorizontal: 16,
    marginTop: -22,
    zIndex: 10,
  },
  statsGlassBar: {
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(13, 20, 42, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  statInsightsBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginLeft: 4,
  },
  statInsightsGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  statInsightsText: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // COMMUNITY STRIP
  communityStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#060913",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  communityTextCol: {
    flex: 1,
  },
  communityHeadline: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  communityCount: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  communitySubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  pulseGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  communitySubText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },

  // CONTENT CONTAINER
  contentContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionAccentLine: {
    width: 3,
    height: 15,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  sectionHeadingTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },

  // AT A GLANCE TILES
  glassInfoCard: {
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfoCol: {
    flex: 1,
  },
  cardInfoEyebrow: {
    color: "rgba(255, 255, 255, 0.48)",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  cardInfoMainText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  cardInfoSubText: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  cardActionPillText: {
    color: "#10B981",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // ORGANIZER CARD
  organizerCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 14,
  },
  organizerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  organizerAvatarLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
  },
  organizerMetaCol: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  organizerRole: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  organizerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  organizerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  organizerBtnOutline: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.24)",
  },
  organizerBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // STORY CARD
  storyCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  storyText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  readMoreText: {
    color: "#38BDF8",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  tagPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  tagPillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  // GUIDELINES CARD
  guidelinesCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  guidelineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  guidelineCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(16, 185, 129, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  guidelineText: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  // FIXED BOTTOM BAR
  bottomFixedBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: "rgba(6, 9, 19, 0.88)",
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  bottomPriceValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
    marginTop: 2,
  },
  bottomPriceSub: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  bottomCtaBtn: {
    minWidth: 160,
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  // MODAL OVERLAYS & SHEETS
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  shareCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "82%",
    backgroundColor: "rgba(10, 16, 36, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  sendAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  sendAllBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  shareChatList: {
    maxHeight: 220,
  },
  shareChatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shareChatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  shareChatAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  shareChatAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  shareChatAvatarLetter: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  shareChatInfo: {
    flex: 1,
  },
  shareChatName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  shareChatDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  shareChatSendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 62,
    alignItems: "center",
  },
  shareSentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  shareChatSendText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  shareEmptyChats: {
    paddingVertical: 24,
    alignItems: "center",
  },
  shareEmptyChatsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  shareQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 16,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shareQuickAction: {
    alignItems: "center",
    gap: 6,
  },
  shareQuickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shareQuickActionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },

  // 3-DOTS OPTIONS MODAL
  optionsCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: "rgba(10, 16, 36, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  optionsHeader: {
    marginBottom: 16,
  },
  optionsEventTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  optionsOrganizer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  optionsGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
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
  },
  optionsItemText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  optionsCancelBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  optionsCancelText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  reportFeedbackBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  reportFeedbackTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  reportFeedbackSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // INSIGHTS MODAL
  insightsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  insightsMetricCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  insightsMetricValue: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    marginTop: 4,
  },
  insightsMetricLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  insightsEngagementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  insightsEngagementTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  insightsEngagementSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  insightsEngagementValue: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },

  // NOT FOUND STATE
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  notFoundIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
  },
  notFoundSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  notFoundBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
  },
  notFoundBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
