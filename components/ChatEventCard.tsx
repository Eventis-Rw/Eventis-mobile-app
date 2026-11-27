import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatEventLocation, getEventTiming } from "@/constants/eventPresentation";
import { useChatColors } from "@/hooks/useChatColors";
import { useEventClock } from "@/hooks/useEventClock";
import { getApiEvent, mapApiEvent } from "@/services/eventApi";

/** Rich preview for a shared-event link inside a chat bubble (see utils/shareEvent.ts). */
export function ChatEventCard({ eventId }: { eventId: string }) {
  const colors = useChatColors();
  const router = useRouter();
  const now = useEventClock();
  const { data: event, isLoading, isError } = useQuery({
    queryKey: ["chat-shared-event", eventId],
    queryFn: () => getApiEvent(eventId).then(mapApiEvent),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <View style={[styles.card, styles.center, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <ActivityIndicator color={colors.mutedForeground} size="small" />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={[styles.card, styles.center, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <Ionicons name="calendar-clear-outline" size={18} color={colors.mutedForeground} />
        <Text style={[styles.unavailable, { color: colors.mutedForeground }]}>
          This event is no longer available
        </Text>
      </View>
    );
  }

  const timing = getEventTiming(event, now);

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open event ${event.title}`}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={22} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.foreground }]}>
          {event.title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.primary }]}>
          {timing.label}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.mutedForeground }]}>
          {formatEventLocation(event)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    maxWidth: 260,
  },
  center: {
    justifyContent: "center",
    minHeight: 48,
    gap: 8,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 9,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
  },
  unavailable: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
  },
});
