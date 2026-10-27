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

  function handleConnect(event: GestureResponderEvent) {
    event.stopPropagation();
    if (isConnected) onMessage();
    else if (!isPending) onConnect();
  }

  function handleSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onSkip();
  }

  const place = profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`View ${profile.username}'s profile`}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, opacity: pressed ? 0.94 : 1 }]}
    >
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
      <View style={styles.shade} />

      {connectionStatus === "none" ? (
        <Pressable
          onPress={handleSkip}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Skip ${profile.username}`}
          style={[styles.roundButton, styles.left, { backgroundColor: "rgba(12,12,26,0.6)" }]}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={handleConnect}
        disabled={isPending}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${isPending ? "Like pending with" : isConnected ? "Message" : "Like"} ${profile.username}`}
        style={[styles.roundButton, styles.right, { backgroundColor: isPending ? "rgba(12,12,26,0.6)" : colors.primary }]}
      >
        <Ionicons name={isPending ? "time-outline" : isConnected ? "chatbubble-ellipses" : "heart"} size={17} color="#FFFFFF" />
      </Pressable>

      <View style={styles.nameBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{profile.username}</Text>
          {profile.verified ? <Ionicons name="checkmark-circle" size={15} color="#8AB4FF" /> : null}
          <MembershipBadge type={profile.accountType} iconOnly />
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.88)" />
          <Text style={styles.location} numberOfLines={1}>{place}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const LoveProfileCard = memo(LoveProfileCardComponent);

const styles = StyleSheet.create({
  card: { flex: 1, aspectRatio: 3 / 4, borderRadius: 20, overflow: "hidden", marginBottom: 12 },
  image: { ...StyleSheet.absoluteFill },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 32, fontFamily: "Inter_700Bold" },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "rgba(5,8,24,0.5)" },
  roundButton: { position: "absolute", top: 8, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  left: { left: 8 },
  right: { right: 8 },
  nameBlock: { position: "absolute", left: 10, right: 10, bottom: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flexShrink: 1, color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  location: { flexShrink: 1, color: "rgba(255,255,255,0.88)", fontSize: 11, fontFamily: "Inter_500Medium" },
});
