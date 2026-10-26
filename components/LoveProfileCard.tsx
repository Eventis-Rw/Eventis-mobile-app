import { Ionicons } from "@expo/vector-icons";
import React, { memo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

import type { LoveConnectionStatus, LoveProfile } from "@/constants/loveProfiles";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { useColors } from "@/hooks/useColors";
import { presenceLabel, presenceOf } from "@/utils/findLoveDiscovery";

interface LoveProfileCardProps {
  profile: LoveProfile;
  connectionStatus: LoveConnectionStatus;
  onOpen: () => void;
  /** Like = send a connection request. */
  onConnect: () => void;
  /** Hides the person from Home. Only offered before any request is sent. */
  onSkip: () => void;
  /** Connected members get a Message button instead of Like. */
  onMessage: () => void;
}

function LoveProfileCardComponent({ profile, connectionStatus, onOpen, onConnect, onSkip, onMessage }: LoveProfileCardProps) {
  const colors = useColors();
  const [imageFailed, setImageFailed] = useState(false);
  const isPending = connectionStatus === "pending";
  const isConnected = connectionStatus === "connected";
  const presence = presenceLabel(profile);

  function handleConnect(event: GestureResponderEvent) {
    event.stopPropagation();
    if (isConnected) onMessage();
    else if (!isPending) onConnect();
  }

  function handleSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onSkip();
  }

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${profile.username}'s profile`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.96 : 1 },
      ]}
    >
      <View style={styles.imageWrap}>
        {profile.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: profile.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityLabel={`Profile photo of ${profile.username}`}
          />
        ) : (
          <View style={[styles.image, styles.fallback, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.imageShade} />
        {presence ? (
          <View style={styles.activeBadge}>
            <View style={[styles.activeDot, presenceOf(profile) !== "online" && styles.recentDot]} />
            <Text style={styles.activeText}>{presence}</Text>
          </View>
        ) : null}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{profile.username}</Text>
            {profile.verified ? <Ionicons name="checkmark-circle" size={15} color="#8AB4FF" /> : null}
            <MembershipBadge type={profile.accountType} iconOnly />
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.88)" />
            <Text style={styles.location} numberOfLines={1}>{profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={[styles.genderBadge, { backgroundColor: colors.glass }]}>
            <Ionicons name="person-outline" size={12} color={colors.primary} />
            <Text style={[styles.genderText, { color: colors.primary }]}>{profile.gender}</Text>
          </View>
        </View>
        {profile.bio ? <Text numberOfLines={2} style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text> : null}
        <View style={styles.interests}>
          {profile.interests.slice(0, 2).map((interest) => (
            <View key={interest} style={[styles.interest, { borderColor: colors.border }]}>
              <Text style={[styles.interestText, { color: colors.mutedForeground }]}>{interest}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          {connectionStatus === "none" ? (
            <Pressable
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel={`Skip ${profile.username}`}
              style={[styles.skipButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleConnect}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={`${isPending ? "Like pending with" : isConnected ? "Message" : "Like"} ${profile.username}`}
            style={[
              styles.connectButton,
              {
                backgroundColor: isPending ? colors.secondary : colors.primary,
                borderColor: isPending ? colors.border : colors.primary,
              },
            ]}
          >
            <Ionicons
              name={isPending ? "time-outline" : isConnected ? "chatbubble-ellipses-outline" : "heart"}
              size={16}
              color={isPending ? colors.mutedForeground : "#FFFFFF"}
            />
            <Text style={[styles.connectText, { color: isPending ? colors.mutedForeground : "#FFFFFF" }]}>
              {isPending ? "Pending" : isConnected ? "Message" : "Like"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export const LoveProfileCard = memo(LoveProfileCardComponent);

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  imageWrap: { aspectRatio: 4 / 5, backgroundColor: "#E8E9F2" },
  image: { width: "100%", height: "100%" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 32, fontFamily: "Inter_700Bold" },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(5,8,24,0.16)" },
  activeBadge: { position: "absolute", top: 8, right: 8, maxWidth: "85%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: "rgba(12,12,26,0.66)" },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#5DE18A" },
  recentDot: { backgroundColor: "#F5C451" },
  activeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  nameBlock: { position: "absolute", left: 10, right: 10, bottom: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flexShrink: 1, color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  location: { flexShrink: 1, color: "rgba(255,255,255,0.88)", fontSize: 11, fontFamily: "Inter_500Medium" },
  content: { flex: 1, padding: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  genderBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  genderText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bio: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 8 },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8, marginBottom: 10 },
  interest: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  interestText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 8, marginTop: "auto" },
  skipButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  connectButton: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  connectText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
