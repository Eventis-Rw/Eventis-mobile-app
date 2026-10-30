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
  /** Send a connection request, or accept one they sent first. */
  onConnect: () => void;
  /** Opens the chat: free chat once connected, one message with the request before that. */
  onMessage: () => void;
}

function LoveProfileCardComponent({ profile, connectionStatus, onOpen, onConnect, onMessage }: LoveProfileCardProps) {
  const colors = useColors();
  const [imageFailed, setImageFailed] = useState(false);
  const isPending = connectionStatus === "pending";
  const isConnected = connectionStatus === "connected";
  const isReceived = connectionStatus === "received";

  function handleConnect(event: GestureResponderEvent) {
    event.stopPropagation();
    if (!isPending && !isConnected) onConnect();
  }

  function handleMessage(event: GestureResponderEvent) {
    event.stopPropagation();
    onMessage();
  }

  // The card is narrow, so it shows two interests and a count of the rest.
  const shownInterests = profile.interests.slice(0, MAX_CARD_INTERESTS);
  const moreInterests = profile.interests.length - shownInterests.length;

  // Connect → Pending → Connected, or Accept when they asked first.
  const status = isConnected
    ? { icon: "checkmark" as const, label: "Connected" }
    : isPending
      ? { icon: "time-outline" as const, label: "Pending" }
      : isReceived
        ? { icon: "checkmark" as const, label: "Accept" }
        : { icon: "person-add-outline" as const, label: "Connect" };
  const statusStyle = isConnected
    ? { background: colors.glass, border: colors.primary, text: colors.primary }
    : isPending
      ? { background: "transparent", border: colors.border, text: colors.mutedForeground }
      : { background: colors.primary, border: colors.primary, text: "#FFFFFF" };

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

        <View style={styles.actions}>
          <Pressable
            onPress={handleConnect}
            disabled={isPending || isConnected}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isPending || isConnected ? `${status.label} with ${profile.username}` : `${status.label} ${profile.username}`}
            accessibilityState={{ disabled: isPending || isConnected }}
            style={({ pressed }) => [
              styles.statusButton,
              { borderColor: statusStyle.border, backgroundColor: statusStyle.background, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name={status.icon} size={14} color={statusStyle.text} />
            <Text style={[styles.actionText, { color: statusStyle.text }]} numberOfLines={1}>{status.label}</Text>
          </Pressable>
          <Pressable
            onPress={handleMessage}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Message ${profile.username}`}
            style={({ pressed }) => [styles.messageButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
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
  actions: { flexDirection: "row", gap: 6, marginTop: 7 },
  statusButton: { flex: 1, minWidth: 0, minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 11, borderWidth: 1, paddingHorizontal: 4 },
  messageButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actionText: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
