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
import { useColors } from "@/hooks/useColors";

interface LoveProfileCardProps {
  profile: LoveProfile;
  connectionStatus: LoveConnectionStatus;
  onOpen: () => void;
  onConnect: () => void;
}

function LoveProfileCardComponent({ profile, connectionStatus, onOpen, onConnect }: LoveProfileCardProps) {
  const colors = useColors();
  const [imageFailed, setImageFailed] = useState(false);
  const isPending = connectionStatus === "pending";
  const isConnected = connectionStatus === "connected";

  function handleConnect(event: GestureResponderEvent) {
    event.stopPropagation();
    if (!isPending && !isConnected) onConnect();
  }

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${profile.name}'s profile`}
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
            accessibilityLabel={`Profile photo of ${profile.name}`}
          />
        ) : (
          <View style={[styles.image, styles.fallback, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{profile.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.imageShade} />
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Active</Text>
        </View>
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {profile.verified ? <Ionicons name="checkmark-circle" size={18} color="#8AB4FF" /> : null}
          </View>
          <Text style={styles.location}>{profile.city}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={[styles.genderBadge, { backgroundColor: colors.glass }]}>
            <Ionicons name="person-outline" size={14} color={colors.primary} />
            <Text style={[styles.genderText, { color: colors.primary }]}>{profile.gender}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.occupation, { color: colors.mutedForeground }]}>{profile.occupation}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
        <View style={styles.interests}>
          {profile.interests.slice(0, 3).map((interest) => (
            <View key={interest} style={[styles.interest, { borderColor: colors.border }]}>
              <Text style={[styles.interestText, { color: colors.mutedForeground }]}>{interest}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={handleConnect}
          disabled={isPending || isConnected}
          accessibilityRole="button"
          accessibilityLabel={`${isPending ? "Connection pending with" : isConnected ? "Connected with" : "Connect with"} ${profile.name}`}
          style={[
            styles.connectButton,
            {
              backgroundColor: isPending || isConnected ? colors.secondary : colors.primary,
              borderColor: isPending || isConnected ? colors.border : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={isPending ? "time-outline" : isConnected ? "checkmark-circle-outline" : "heart-outline"}
            size={18}
            color={isPending || isConnected ? colors.mutedForeground : "#FFFFFF"}
          />
          <Text style={[styles.connectText, { color: isPending || isConnected ? colors.mutedForeground : "#FFFFFF" }]}>
            {isPending ? "Pending" : isConnected ? "Connected" : "Connect"}
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
  activeText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  nameBlock: { position: "absolute", left: 18, right: 18, bottom: 16 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: "#FFFFFF", fontSize: 25, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  location: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  content: { padding: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  genderBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  genderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  occupation: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: 13 },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  interest: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  interestText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  connectButton: { minHeight: 48, marginTop: 16, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  connectText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
