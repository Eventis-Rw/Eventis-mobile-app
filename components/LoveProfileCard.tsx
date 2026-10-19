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
  onConnect: () => void;
  /** Connected members get a Message button instead of Connect. */
  onMessage: () => void;
}

function LoveProfileCardComponent({ profile, connectionStatus, onOpen, onConnect, onMessage }: LoveProfileCardProps) {
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

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open @${profile.username}'s profile`}
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
            accessibilityLabel={`Profile photo of @${profile.username}`}
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
            <Text style={styles.name} numberOfLines={1}>@{profile.username}</Text>
            {profile.verified ? <Ionicons name="checkmark-circle" size={18} color="#8AB4FF" /> : null}
            <MembershipBadge type={profile.accountType} iconOnly />
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.88)" />
            <Text style={styles.location}>{profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={[styles.genderBadge, { backgroundColor: colors.glass }]}>
            <Ionicons name="person-outline" size={14} color={colors.primary} />
            <Text style={[styles.genderText, { color: colors.primary }]}>{profile.gender}</Text>
          </View>
        </View>
        {profile.bio ? <Text numberOfLines={2} style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text> : null}
        <View style={styles.interests}>
          {profile.interests.slice(0, 3).map((interest) => (
            <View key={interest} style={[styles.interest, { borderColor: colors.border }]}>
              <Text style={[styles.interestText, { color: colors.mutedForeground }]}>{interest}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={handleConnect}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel={`${isPending ? "Connection pending with" : isConnected ? "Message" : "Connect with"} @${profile.username}`}
          style={[
            styles.connectButton,
            {
              backgroundColor: isPending ? colors.secondary : colors.primary,
              borderColor: isPending ? colors.border : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={isPending ? "time-outline" : isConnected ? "chatbubble-ellipses-outline" : "heart-outline"}
            size={18}
            color={isPending ? colors.mutedForeground : "#FFFFFF"}
          />
          <Text style={[styles.connectText, { color: isPending ? colors.mutedForeground : "#FFFFFF" }]}>
            {isPending ? "Pending" : isConnected ? "Message" : "Connect"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const LoveProfileCard = memo(LoveProfileCardComponent);

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 24, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  imageWrap: { height: 250, backgroundColor: "#E8E9F2" },
  image: { width: "100%", height: "100%" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 42, fontFamily: "Inter_700Bold" },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(5,8,24,0.16)" },
  activeBadge: { position: "absolute", top: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: "rgba(12,12,26,0.66)" },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#5DE18A" },
  recentDot: { backgroundColor: "#F5C451" },
  activeText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  nameBlock: { position: "absolute", left: 18, right: 18, bottom: 16 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: "#FFFFFF", fontSize: 25, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  location: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { padding: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  genderBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  genderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bio: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: 13 },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  interest: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  interestText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  connectButton: { minHeight: 48, marginTop: 16, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  connectText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
