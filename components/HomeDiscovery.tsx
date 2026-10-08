import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { getEventImage } from "@/constants/eventImages";
import { getEventTiming } from "@/constants/eventPresentation";
import type { Event } from "@/constants/events";
import { useColors } from "@/hooks/useColors";

type HomeDiscoveryProps = {
  events: Event[];
  onOpenSearch: () => void;
  onOpenOrganizer: () => void;
  stories?: React.ReactNode;
};

export function HomeDiscovery({ events, onOpenSearch, onOpenOrganizer, stories }: HomeDiscoveryProps) {
  const colors = useColors();
  const router = useRouter();
  const featured = events[0];

  if (!featured) return null;

  const timing = getEventTiming(featured);

  return (
    <>
      <View style={styles.heroWrap}>
        <Pressable
          onPress={() => router.push(`/event/${featured.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open featured event ${featured.title}`}
          style={styles.hero}
        >
          <ImageBackground source={getEventImage(featured.image)} style={styles.heroImage}>
            <LinearGradient colors={["rgba(5,8,18,0.04)", "rgba(5,8,18,0.28)", "#0D1838"]} locations={[0, 0.44, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroTopRow}>
              <View style={[styles.pickBadge, timing.kind === "live" && styles.liveBadge]}>
                <View style={[styles.pickDot, timing.kind === "live" && styles.liveDot]} />
                <Text style={styles.pickText}>{timing.kind === "live" ? "HAPPENING NOW" : "EVENTIS PICK"}</Text>
              </View>
              <View style={styles.heroArrow}><Ionicons name="arrow-up-outline" size={19} color="#FFFFFF" style={styles.arrowTilt} /></View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{timing.label} · {featured.category}</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{featured.title}</Text>
              <View style={styles.heroMetaRow}>
                <Ionicons name="location" size={15} color="#BFD0FF" />
                <Text style={styles.heroMeta} numberOfLines={1}>{featured.location}</Text>
              </View>
              <View style={styles.heroBottomRow}>
                <Text style={styles.heroPrice}>{priceLabel(featured)}</Text>
                <View style={styles.heroCta}><Text style={styles.heroCtaText}>View event</Text><Ionicons name="arrow-forward" size={15} color="#0A1022" /></View>
              </View>
            </View>
          </ImageBackground>
        </Pressable>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction icon="navigate" label="Near me" caption="Around Kigali" onPress={onOpenSearch} />
        <QuickAction icon="ticket" label="Free entry" caption="No ticket needed" onPress={onOpenSearch} />
        <QuickAction icon="sparkles" label="For you" caption="Fresh discoveries" onPress={onOpenSearch} />
      </View>

      {stories}

      <View style={styles.organizerWrap}>
        <LinearGradient colors={["#1747C8", "#2F6BFF", "#6E96FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.organizerCard}>
          <View style={styles.organizerGlow} />
          <View style={styles.organizerIcon}><Ionicons name="megaphone" size={24} color="#FFFFFF" /></View>
          <View style={styles.organizerCopy}>
            <Text style={styles.organizerKicker}>MAKE IT HAPPEN</Text>
            <Text style={styles.organizerTitle}>Turn your idea into the next sold-out moment.</Text>
            <Text style={styles.organizerText}>Create, promote and manage an event from one place.</Text>
          </View>
          <Pressable onPress={onOpenOrganizer} accessibilityRole="button" style={styles.organizerButton}>
            <Text style={styles.organizerButtonText}>Start creating</Text><Ionicons name="arrow-forward" size={16} color="#2F6BFF" />
          </Pressable>
        </LinearGradient>
      </View>

      <View style={[styles.socialProof, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarStack}>
          {["#1747C8", "#2F6BFF", "#6E96FF"].map((color, index) => (
            <View key={color} style={[styles.proofAvatar, { backgroundColor: color, marginLeft: index ? -9 : 0 }]}><Ionicons name="person" size={14} color="#FFFFFF" /></View>
          ))}
        </View>
        <View style={styles.proofCopy}>
          <Text style={[styles.proofTitle, { color: colors.foreground }]}>Join the crowd</Text>
          <Text style={[styles.proofText, { color: colors.mutedForeground }]}>Thousands are finding their next memory on Eventis.</Text>
        </View>
        <Ionicons name="heart" size={19} color={colors.primary} />
      </View>
    </>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  const colors = useColors();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text></View>;
}

function QuickAction({ icon, label, caption, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; caption: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.quickCaption, { color: colors.mutedForeground }]} numberOfLines={1}>{caption}</Text>
    </Pressable>
  );
}

function priceLabel(event: Event) {
  return !event.isPaid || event.price <= 0 ? "Free entry" : `${event.currency} ${event.price.toLocaleString()}`;
}

const styles = StyleSheet.create({
  heroWrap: { paddingHorizontal: 16, paddingTop: 10 },
  hero: { height: 410, borderRadius: 30, overflow: "hidden", backgroundColor: "#11152A", shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 12 },
  heroImage: { flex: 1, justifyContent: "space-between" }, heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  pickBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, backgroundColor: "rgba(7,10,22,0.72)", paddingHorizontal: 12, paddingVertical: 8 }, liveBadge: { backgroundColor: "#E5484D" },
  pickDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#6E96FF" }, liveDot: { backgroundColor: "#FFFFFF" }, pickText: { color: "#FFFFFF", fontSize: 10, letterSpacing: 1.1, fontFamily: "Inter_700Bold" },
  heroArrow: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" }, arrowTilt: { transform: [{ rotate: "45deg" }] },
  heroCopy: { padding: 20, gap: 8 }, heroEyebrow: { color: "#BFD0FF", fontSize: 12, letterSpacing: 0.7, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  heroTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 37, letterSpacing: -1, fontFamily: "Inter_900Black" }, heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 }, heroMeta: { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_500Medium" },
  heroBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 }, heroPrice: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" }, heroCta: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 }, heroCtaText: { color: "#0A1022", fontSize: 13, fontFamily: "Inter_700Bold" },
  quickGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 }, quickCard: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 12, minWidth: 0 }, quickIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 }, quickLabel: { fontSize: 13, fontFamily: "Inter_700Bold" }, quickCaption: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 3 },
  organizerWrap: { paddingHorizontal: 16, paddingTop: 30 }, organizerCard: { borderRadius: 28, padding: 20, overflow: "hidden" }, organizerGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -55, top: -75, backgroundColor: "rgba(255,255,255,0.16)" }, organizerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 20 }, organizerCopy: { gap: 6 }, organizerKicker: { color: "rgba(255,255,255,0.74)", fontSize: 10, letterSpacing: 1.3, fontFamily: "Inter_700Bold" }, organizerTitle: { color: "#FFFFFF", fontSize: 25, lineHeight: 30, letterSpacing: -0.5, fontFamily: "Inter_800ExtraBold" }, organizerText: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 2 }, organizerButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, marginTop: 18 }, organizerButtonText: { color: "#2F6BFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  socialProof: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 22, marginHorizontal: 16, marginTop: 24, padding: 14, gap: 12 }, avatarStack: { flexDirection: "row", paddingLeft: 2 }, proofAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, proofCopy: { flex: 1, gap: 2 }, proofTitle: { fontSize: 13, fontFamily: "Inter_700Bold" }, proofText: { fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular" },
  sectionHeading: { paddingHorizontal: 16, marginBottom: 14, gap: 3 }, sectionTitle: { fontSize: 23, lineHeight: 29, letterSpacing: -0.5, fontFamily: "Inter_800ExtraBold" }, sectionSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
