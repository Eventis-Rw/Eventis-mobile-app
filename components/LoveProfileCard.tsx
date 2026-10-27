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
  /** Connected members get a Message button instead of Like. */
  onMessage: () => void;
}

function LoveProfileCardComponent({ profile, connectionStatus, onOpen, onConnect, onMessage }: LoveProfileCardProps) {
  const colors = useColors();
  const [imageFailed, setImageFailed] = useState(false);
  const isPending = connectionStatus === "pending";
  const isConnected = connectionStatus === "connected";

  // Connected members can be messaged straight away; everyone else gets a Like first.
  function handleAction(event: GestureResponderEvent) {
    event.stopPropagation();
    if (isConnected) onMessage();
    else if (!isPending) onConnect();
  }

  // The card is narrow, so it shows two interests and a count of the rest.
  const shownInterests = profile.interests.slice(0, MAX_CARD_INTERESTS);
  const moreInterests = profile.interests.length - shownInterests.length;

  const action = isConnected
    ? { icon: "chatbubble-ellipses" as const, label: "Message" }
    : isPending
      ? { icon: "time-outline" as const, label: "Pending" }
      : { icon: "heart" as const, label: "Like" };

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`View ${profile.username}'s profile`}
      // A slight press-in shows the whole card opens the profile.
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={styles.photo}>
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
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{profile.username}</Text>
          {profile.verified ? <Ionicons name="checkmark-circle" size={14} color="#3B82F6" /> : null}
          <MembershipBadge type={profile.accountType} iconOnly />
        </View>
        <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>{profile.city}</Text>
        {/* Fixed height, even when empty, so cards in a row line up. */}
        <View style={styles.interests} accessibilityLabel={shownInterests.length ? `Interests: ${profile.interests.join(", ")}` : undefined}>
          {shownInterests.map((interest) => (
            <View key={interest} style={[styles.chip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>{interest}</Text>
            </View>
          ))}
          {moreInterests > 0 ? <Text style={[styles.more, { color: colors.mutedForeground }]}>+{moreInterests}</Text> : null}
        </View>

        <Pressable
          onPress={handleAction}
          disabled={isPending}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${action.label} ${profile.username}`}
          accessibilityState={{ disabled: isPending }}
          style={({ pressed }) => [
            styles.actionButton,
            isPending
              ? { borderColor: colors.border, backgroundColor: colors.secondary }
              : { borderColor: colors.primary, backgroundColor: colors.primary },
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name={action.icon} size={14} color={isPending ? colors.mutedForeground : "#FFFFFF"} />
          <Text style={[styles.actionText, { color: isPending ? colors.mutedForeground : "#FFFFFF" }]}>{action.label}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const MAX_CARD_INTERESTS = 2;

export const LoveProfileCard = memo(LoveProfileCardComponent);

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginBottom: 12 },
  photo: { width: "100%", aspectRatio: 1 },
  image: { ...StyleSheet.absoluteFill },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 28, fontFamily: "Inter_700Bold" },
  body: { paddingHorizontal: 9, paddingTop: 8, paddingBottom: 9 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flexShrink: 1, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  location: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  interests: { height: 20, flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, overflow: "hidden" },
  chip: { flexShrink: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  more: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  actionButton: { marginTop: 7, minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 4 },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
