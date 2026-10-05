import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { Skeleton } from "@/components/SkeletonLoader";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useColors } from "@/hooks/useColors";

export default function LoveProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const colors = useColors();
  const { isLoading, getProfileById, getConnectionStatus, sendConnectionRequest } = useLoveProfiles();
  const [imageFailed, setImageFailed] = useState(false);
  const profile = getProfileById(id ?? "");

  if (isLoading && !profile) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Skeleton height={380} borderRadius={0} />
        <View style={styles.loadingBody}>
          <Skeleton width="55%" height={30} />
          <Skeleton height={18} style={styles.loadingGap} />
          <Skeleton height={90} style={styles.loadingGap} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="person-outline" size={42} color={colors.mutedForeground} />
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Profile unavailable</Text>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>This profile may no longer be active.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const profileId = profile.id;
  const connectionStatus = getConnectionStatus(profileId);
  const pending = connectionStatus === "pending";
  const connected = connectionStatus === "connected";

  function connect() {
    if (pending || connected) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void sendConnectionRequest(profileId);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}>
        <View style={styles.hero}>
          {profile.imageUrl && !imageFailed ? (
            <Image source={{ uri: profile.imageUrl }} style={styles.heroImage} resizeMode="cover" onError={() => setImageFailed(true)} accessibilityLabel={`Profile photo of ${profile.name}`} />
          ) : (
            <View style={[styles.heroImage, styles.fallback, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.initials, { color: colors.primary }]}>{profile.name.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.heroShade} />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.backButton, { top: insets.top + 10, backgroundColor: colors.surface }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.heroCopy}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{profile.name}, {profile.age}</Text>
              {profile.verified ? <Ionicons name="checkmark-circle" size={21} color="#8AB4FF" /> : null}
            </View>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroLocation}>{profile.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.quickFacts}>
            <View style={[styles.fact, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>Gender</Text>
              <Text style={[styles.factValue, { color: colors.foreground }]}>{profile.gender}</Text>
            </View>
            <View style={[styles.fact, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>Work</Text>
              <Text numberOfLines={1} style={[styles.factValue, { color: colors.foreground }]}>{profile.occupation}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About me</Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
          <View style={styles.interests}>
            {profile.interests.map((interest) => (
              <View key={interest} style={[styles.interest, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={[styles.interestText, { color: colors.foreground }]}>{interest}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.safetyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
            <View style={styles.safetyCopy}>
              <Text style={[styles.safetyTitle, { color: colors.foreground }]}>Connect thoughtfully</Text>
              <Text style={[styles.safetyText, { color: colors.mutedForeground }]}>Requests are private. Share personal details only when you feel comfortable.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          onPress={connect}
          disabled={pending || connected}
          accessibilityRole="button"
          accessibilityLabel={`${pending ? "Connection pending with" : connected ? "Connected with" : "Connect with"} ${profile.name}`}
          style={[styles.connectButton, { backgroundColor: pending || connected ? colors.secondary : colors.primary }]}
        >
          <Ionicons name={pending ? "time-outline" : connected ? "checkmark-circle-outline" : "heart"} size={20} color={pending || connected ? colors.mutedForeground : "#FFFFFF"} />
          <Text style={[styles.connectText, { color: pending || connected ? colors.mutedForeground : "#FFFFFF" }]}>
            {pending ? "Request Pending" : connected ? "Connected" : `Connect with ${profile.name}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 410, backgroundColor: "#D9DCEA" },
  heroImage: { width: "100%", height: "100%" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 56, fontFamily: "Inter_700Bold" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(6,8,22,0.22)" },
  backButton: { position: "absolute", left: 18, width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroCopy: { position: "absolute", left: 22, right: 22, bottom: 22 },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroName: { color: "#FFFFFF", fontSize: 31, letterSpacing: -0.8, fontFamily: "Inter_700Bold" },
  heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  heroLocation: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20 },
  quickFacts: { flexDirection: "row", gap: 12 },
  fact: { flex: 1, minHeight: 104, borderWidth: 1, borderRadius: 20, padding: 14 },
  factLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 8 },
  factValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  sectionTitle: { fontSize: 19, fontFamily: "Inter_700Bold", marginTop: 28 },
  bio: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular", marginTop: 9 },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  interest: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 9 },
  interestText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  safetyCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 30 },
  safetyCopy: { flex: 1 },
  safetyTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  safetyText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 13 },
  connectButton: { width: "100%", maxWidth: 680, alignSelf: "center", minHeight: 56, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  connectText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  loadingBody: { padding: 20 },
  loadingGap: { marginTop: 16 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  notFoundTitle: { fontSize: 21, fontFamily: "Inter_700Bold", marginTop: 16 },
  notFoundText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 7, textAlign: "center" },
  backLink: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 20 },
});
