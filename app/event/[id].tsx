import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { getEventImage } from "@/constants/eventImages";
import { getEventPalette, getEventTiming } from "@/constants/eventPresentation";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
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
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const event = getEventById(id ?? "");
  const isBooked = hasBookedEvent(id ?? "");
  const isSaved = user?.savedEvents.includes(id ?? "") ?? false;
  const palette = getEventPalette(event?.category ?? "Business");
  const timing = useMemo(() => event ? getEventTiming(event) : null, [event]);

  const handleBook = useCallback(async () => {
    if (!event || timing?.kind === "ended") return;
    if (!user) {
      router.push("/auth/register" as never);
      return;
    }
    if (event.isPaid && !user.isPhoneVerified) {
      requestOTP("payment", event.id);
      router.push({ pathname: "/auth/otp", params: { purpose: "payment", eventId: event.id } } as never);
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

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowShareModal(true);
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!event) return;
    setShowShareModal(false);
    await shareEvent(event);
  }, [event]);

  const handleShareToChat = useCallback(() => {
    if (!event) return;
    setShowShareModal(false);
    router.push({ pathname: "/chat", params: { eventId: event.id, eventTitle: event.title } } as never);
  }, [event, router]);

  if (!event || !timing) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            <Text style={[styles.notFoundText, { color: colors.foreground }]}>Event not found</Text>
            <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text></Pressable>
          </>
        )}
      </View>
    );
  }

  const viewsCount = event.viewCount ?? 180;
  const instructions = (event.instructions ?? []).map((item) => item.trim()).filter(Boolean);
  const price = !event.isPaid || event.price <= 0 ? "Free entry" : `${event.currency} ${event.price.toLocaleString()}`;
  const pageGradient = scheme === "dark" ? palette.pageDark : palette.pageLight;
  const sheetColor = scheme === "dark" ? "rgba(8,10,22,0.97)" : "rgba(248,250,255,0.97)";
  const cardColor = scheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)";

  return (
    <View style={styles.root}>
      <LinearGradient colors={pageGradient} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ImageBackground source={getEventImage(event.image)} style={styles.hero} resizeMode="cover">
          <LinearGradient colors={["rgba(3,5,14,0.04)", "rgba(3,5,14,0.24)", palette.deep]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
            <CircleButton icon="chevron-back" label="Go back" onPress={() => router.back()} />
            <View style={styles.heroActions}>
              <CircleButton icon={isSaved ? "bookmark" : "bookmark-outline"} label={isSaved ? "Remove bookmark" : "Save event"} onPress={handleSave} accent={isSaved ? palette.accent : undefined} />
              <CircleButton icon="share-outline" label="Share event" onPress={handleShare} />
            </View>
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.heroBadges}>
              <View style={[styles.timingBadge, timing.kind === "live" && styles.liveTimingBadge]}>
                {timing.kind === "live" ? <View style={styles.liveDot} /> : null}
                <Text style={styles.timingText}>{timing.label}</Text>
              </View>
              <View style={[styles.categoryBadge, { backgroundColor: palette.accent }]}><Text style={styles.categoryText}>{event.category}</Text></View>
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={15} color={palette.accentSoft} />
              <Text style={styles.heroLocation} numberOfLines={1}>{event.location}</Text>
            </View>
            <View style={styles.heroBottomRow}>
              <View><Text style={styles.priceLabel}>ENTRY FROM</Text><Text style={styles.priceValue}>{price}</Text></View>
              <View style={[styles.dateTile, { backgroundColor: palette.accent }]}>
                <Text style={styles.dateDay}>{new Date(event.date).toLocaleDateString("en-GB", { day: "2-digit" })}</Text>
                <Text style={styles.dateMonth}>{new Date(event.date).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined} style={[styles.contentSheet, { backgroundColor: sheetColor }]}>
          <View style={[styles.sheetHandle, { backgroundColor: `${palette.accent}55` }]} />
          <SectionHeader eyebrow="THE PLAN" title="At a glance" accent={palette.accent} foreground={colors.foreground} />
          <View style={styles.infoRow}>
            <InfoTile icon="calendar-outline" label="Date" value={formatDate(event.date)} accent={palette.accent} background={cardColor} foreground={colors.foreground} muted={colors.mutedForeground} />
            <InfoTile icon="time-outline" label="Time" value={event.endTime ? `${event.time}–${event.endTime}` : event.time} accent={palette.accent} background={cardColor} foreground={colors.foreground} muted={colors.mutedForeground} />
            <InfoTile icon="navigate-outline" label="Distance" value={`${event.distance} km`} accent={palette.accent} background={cardColor} foreground={colors.foreground} muted={colors.mutedForeground} />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${event.location} in maps`} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${event.location}, ${event.city}`)}`)} style={styles.blockSpacing}>
            <LinearGradient colors={[`${palette.accent}28`, `${palette.accent}0A`]} style={[styles.locationCard, { borderColor: `${palette.accent}38` }]}>
              <View style={[styles.locationIcon, { backgroundColor: palette.accent }]}><Ionicons name="location" size={21} color="#FFFFFF" /></View>
              <View style={styles.flexCopy}>
                <Text style={[styles.cardEyebrow, { color: palette.accent }]}>WHERE YOU’LL BE</Text>
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{event.location}</Text>
                <Text style={[styles.cardCaption, { color: colors.mutedForeground }]}>{event.city}</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: cardColor }]}><Ionicons name="arrow-forward" size={17} color={palette.accent} /></View>
            </LinearGradient>
          </Pressable>

          <View style={[styles.organizerCard, { backgroundColor: cardColor, borderColor: `${palette.accent}28` }]}>
            <View style={[styles.organizerAvatar, { backgroundColor: palette.deep }]}><Text style={styles.organizerLetter}>{event.organizer.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.flexCopy}>
              <Text style={[styles.cardEyebrow, { color: palette.accent }]}>HOSTED BY</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{event.organizer}</Text>
              <Text style={[styles.cardCaption, { color: colors.mutedForeground }]}>Event organizer</Text>
            </View>
            {event.organizerWebsite ? (
              <Pressable onPress={() => Linking.openURL(event.organizerWebsite!)} accessibilityRole="button" style={[styles.visitButton, { backgroundColor: `${palette.accent}18` }]}>
                <Text style={[styles.visitText, { color: palette.accent }]}>Visit</Text><Ionicons name="open-outline" size={14} color={palette.accent} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.copySection}>
            <SectionHeader eyebrow="THE STORY" title="About this event" accent={palette.accent} foreground={colors.foreground} />
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{event.description}</Text>
          </View>

          {instructions.length ? (
            <View style={styles.copySection}>
              <SectionHeader eyebrow="GOOD TO KNOW" title="Before you go" accent={palette.accent} foreground={colors.foreground} />
              <View style={[styles.instructionsCard, { backgroundColor: cardColor, borderColor: `${palette.accent}28` }]}>
                {instructions.map((instruction) => (
                  <View key={instruction} style={styles.instructionRow}>
                    <View style={[styles.checkIcon, { backgroundColor: `${palette.accent}1F` }]}><Ionicons name="checkmark" size={14} color={palette.accent} /></View>
                    <Text style={[styles.instructionText, { color: colors.foreground }]}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.tagRow}>
            {event.tags.map((tag) => <View key={tag} style={[styles.tag, { backgroundColor: `${palette.accent}14`, borderColor: `${palette.accent}28` }]}><Text style={[styles.tagText, { color: palette.accent }]}>#{tag.replace(/\s+/g, "")}</Text></View>)}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={Platform.OS !== "web" ? FadeInUp.delay(200).springify() : undefined} style={[styles.bottomBar, { paddingBottom: insets.bottom + 10, backgroundColor: scheme === "dark" ? "rgba(7,8,20,0.97)" : "rgba(255,255,255,0.97)", borderTopColor: `${palette.accent}24` }]}>
        <View style={styles.insightSection}><Text style={[styles.bottomPrice, { color: colors.foreground }]}>{price}</Text><Text style={[styles.insightText, { color: colors.mutedForeground }]}>{formatCount(viewsCount)} views</Text></View>
        <Pressable onPress={isBooked || timing.kind === "ended" ? undefined : handleBook} disabled={bookingLoading || timing.kind === "ended"} accessibilityRole="button" style={[styles.ctaButton, { backgroundColor: isBooked ? colors.success : timing.kind === "ended" ? colors.disabled : palette.accent, opacity: bookingLoading ? 0.7 : 1 }]}>
          {bookingLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name={isBooked ? "checkmark-circle" : timing.kind === "ended" ? "time-outline" : event.isPaid ? "ticket" : "add-circle"} size={20} color="#FFFFFF" />}
          <Text style={styles.ctaText}>{isBooked ? "Booked" : timing.kind === "ended" ? "Event ended" : event.isPaid ? "Get tickets" : "Reserve spot"}</Text>
        </Pressable>
      </Animated.View>

      <ShareModal visible={showShareModal} title={event.title} palette={palette} colors={colors} onClose={() => setShowShareModal(false)} onChat={handleShareToChat} onNative={handleNativeShare} />
    </View>
  );
}

function CircleButton({ icon, label, onPress, accent }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; accent?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.circleButton}><Ionicons name={icon} size={21} color={accent ?? "#FFFFFF"} /></Pressable>;
}

function InfoTile({ icon, label, value, accent, background, foreground, muted }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; accent: string; background: string; foreground: string; muted: string }) {
  return <View style={[styles.infoTile, { backgroundColor: background, borderColor: `${accent}24` }]}><View style={[styles.infoIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={icon} size={18} color={accent} /></View><Text style={[styles.infoLabel, { color: muted }]}>{label}</Text><Text style={[styles.infoValue, { color: foreground }]} numberOfLines={2}>{value}</Text></View>;
}

function SectionHeader({ eyebrow, title, accent, foreground }: { eyebrow: string; title: string; accent: string; foreground: string }) {
  return <View style={styles.sectionHeader}><Text style={[styles.sectionEyebrow, { color: accent }]}>{eyebrow}</Text><Text style={[styles.sectionTitle, { color: foreground }]}>{title}</Text></View>;
}

function ShareModal({ visible, title, palette, colors, onClose, onChat, onNative }: { visible: boolean; title: string; palette: ReturnType<typeof getEventPalette>; colors: ReturnType<typeof useColors>; onClose: () => void; onChat: () => void; onNative: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.shareOverlay} onPress={onClose}>
        <Pressable style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.shareTitle, { color: colors.foreground }]}>Share the moment</Text>
          <Text style={[styles.shareSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{title}</Text>
          <ShareOption icon="chatbubbles" title="Eventis Chat" text="Send it to a connection" background={palette.accent} colors={colors} onPress={onChat} />
          <ShareOption icon="share-outline" title="Other apps" text="Copy or share the event link" background={palette.deep} colors={colors} onPress={onNative} />
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button"><Text style={[styles.closeText, { color: colors.mutedForeground }]}>Close</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ShareOption({ icon, title, text, background, colors, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string; background: string; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return <Pressable style={[styles.shareOption, { backgroundColor: colors.secondary }]} onPress={onPress} accessibilityRole="button"><View style={[styles.shareIcon, { backgroundColor: background }]}><Ionicons name={icon} size={20} color="#FFFFFF" /></View><View style={styles.flexCopy}><Text style={[styles.shareOptionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.shareOptionText, { color: colors.mutedForeground }]}>{text}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, scrollContent: { paddingBottom: 122 },
  hero: { height: 480, justifyContent: "space-between", backgroundColor: "#101426" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }, heroActions: { flexDirection: "row", gap: 9 },
  circleButton: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(7,9,18,0.68)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  heroCopy: { paddingHorizontal: 20, paddingBottom: 48, gap: 10 }, heroBadges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  timingBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "rgba(7,9,18,0.72)", paddingHorizontal: 11, paddingVertical: 7 }, liveTimingBadge: { backgroundColor: "#E5484D" }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  timingText: { color: "#FFFFFF", fontSize: 10, letterSpacing: 0.45, textTransform: "uppercase", fontFamily: "Inter_700Bold" }, categoryBadge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, categoryText: { color: "#FFFFFF", fontSize: 10, letterSpacing: 0.55, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  heroTitle: { color: "#FFFFFF", fontSize: 38, lineHeight: 42, letterSpacing: -1.2, fontFamily: "Inter_900Black" }, heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 6 }, heroLocation: { flex: 1, color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_500Medium" },
  heroBottomRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 7 }, priceLabel: { color: "rgba(255,255,255,0.58)", fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" }, priceValue: { color: "#FFFFFF", fontSize: 17, marginTop: 3, fontFamily: "Inter_700Bold" },
  dateTile: { width: 58, height: 62, borderRadius: 18, alignItems: "center", justifyContent: "center" }, dateDay: { color: "#FFFFFF", fontSize: 23, lineHeight: 25, fontFamily: "Inter_900Black" }, dateMonth: { color: "rgba(255,255,255,0.8)", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  contentSheet: { marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 32 }, sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  sectionHeader: { gap: 2, marginBottom: 13 }, sectionEyebrow: { fontSize: 9, letterSpacing: 1.25, fontFamily: "Inter_700Bold" }, sectionTitle: { fontSize: 23, lineHeight: 29, letterSpacing: -0.5, fontFamily: "Inter_800ExtraBold" },
  infoRow: { flexDirection: "row", gap: 9 }, infoTile: { flex: 1, minWidth: 0, minHeight: 124, borderRadius: 20, borderWidth: 1, padding: 11 }, infoIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 9 }, infoLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.45, fontFamily: "Inter_600SemiBold" }, infoValue: { fontSize: 12, lineHeight: 16, marginTop: 3, fontFamily: "Inter_700Bold" },
  blockSpacing: { marginTop: 22 }, locationCard: { minHeight: 104, flexDirection: "row", alignItems: "center", borderRadius: 23, borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" }, locationIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" }, flexCopy: { flex: 1, minWidth: 0 },
  cardEyebrow: { fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold", marginBottom: 3 }, cardTitle: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_700Bold" }, cardCaption: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" }, cardArrow: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  organizerCard: { flexDirection: "row", alignItems: "center", borderRadius: 23, borderWidth: 1, padding: 14, gap: 12, marginTop: 12 }, organizerAvatar: { width: 47, height: 47, borderRadius: 17, alignItems: "center", justifyContent: "center" }, organizerLetter: { color: "#FFFFFF", fontSize: 19, fontFamily: "Inter_800ExtraBold" }, visitButton: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 }, visitText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  copySection: { marginTop: 28 }, description: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular" }, instructionsCard: { borderRadius: 21, borderWidth: 1, padding: 14, gap: 12 }, instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, checkIcon: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" }, instructionText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: "Inter_500Medium" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 25 }, tag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 }, tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth }, insightSection: { flex: 1, minWidth: 0 }, bottomPrice: { fontSize: 16, fontFamily: "Inter_800ExtraBold" }, insightText: { fontSize: 10, marginTop: 2, fontFamily: "Inter_500Medium" }, ctaButton: { minWidth: 160, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 17, paddingHorizontal: 17 }, ctaText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  shareOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "center", padding: 22 }, shareCard: { width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: 26, borderWidth: 1, padding: 20, gap: 11 }, shareTitle: { fontSize: 21, fontFamily: "Inter_800ExtraBold" }, shareSubtitle: { fontSize: 12, marginBottom: 5, fontFamily: "Inter_400Regular" }, shareOption: { flexDirection: "row", alignItems: "center", borderRadius: 17, padding: 12, gap: 11 }, shareIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, shareOptionTitle: { fontSize: 14, fontFamily: "Inter_700Bold" }, shareOptionText: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" }, closeButton: { alignItems: "center", paddingTop: 8, paddingBottom: 2 }, closeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" }, backLink: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
