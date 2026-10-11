import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { GlassSurface } from "@/components/GlassSurface";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { InlineError, ProfileStatGrid, SectionState } from "@/components/profile/ProfileSection";
import { PromotionSheet } from "@/components/profile/PromotionSheet";
import { getEventImage } from "@/constants/eventImages";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeProfileError } from "@/services/profileService";
import { localToday } from "@/utils/dates";
import {
  deletePublisherEvent,
  fetchPublisherEvent,
  requestPromotion,
  setPublisherEventStatus,
  type PublisherEvent,
} from "@/services/publisherService";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Publisher's view of one of their events: status, numbers and management actions. */
export default function ManageEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { refreshEvents } = useEvents();
  const { canPromote } = useAccountCapabilities();

  const [event, setEvent] = useState<PublisherEvent | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) {
      setIsLoading(false);
      return;
    }
    setLoadError(null);
    try {
      setEvent(await fetchPublisherEvent(user.id, id));
    } catch (err) {
      setLoadError(describeProfileError(err, "We couldn't load this event."));
    } finally {
      setIsLoading(false);
    }
  }, [user, id]);

  // Reload after returning from the edit screen.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (isLoading || loadError || !event) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <PortalScreenHeader title="Manage Event" />
        <View style={styles.state}>
          {isLoading ? (
            <SectionState kind="loading" message="Loading event…" />
          ) : loadError ? (
            <SectionState kind="error" message={loadError} onRetry={() => void load()} />
          ) : (
            <SectionState
              kind="empty"
              icon="calendar-outline"
              title="Event not found"
              message="It may have been deleted, or it isn't one of yours."
              actionLabel="Back to profile"
              onAction={() => router.replace({ pathname: "/(tabs)/profile", params: { tab: "manage" } } as any)}
            />
          )}
        </View>
      </View>
    );
  }

  const today = localToday();
  const isPast = event.date < today;
  const isPaused = event.status === "paused";
  const fill = event.capacity ? Math.round((event.attendees / event.capacity) * 100) : 0;

  const status = isPaused
    ? { label: "Paused · hidden from discovery", color: colors.warning }
    : isPast
      ? { label: "Ended", color: colors.mutedForeground }
      : { label: "Live · visible in discovery", color: colors.success };

  const toggleStatus = async () => {
    if (!user) return;
    setBusy("status");
    setActionError(null);
    try {
      setEvent(await setPublisherEventStatus(user.id, event.id, isPaused ? "published" : "paused"));
      void refreshEvents();
    } catch (err) {
      setActionError(describeProfileError(err, "We couldn't update this event."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!user) return;
    setConfirmDelete(false);
    setBusy("delete");
    setActionError(null);
    try {
      await deletePublisherEvent(user.id, event.id);
      void refreshEvents();
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: "/(tabs)/profile", params: { tab: "manage" } } as any);
    } catch (err) {
      setActionError(describeProfileError(err, "We couldn't delete this event."));
      setBusy(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PortalScreenHeader title="Manage Event" disabled={!!busy} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <GlassSurface style={styles.summary}>
          <Image source={getEventImage(event.image)} style={styles.image} />
          <View style={styles.summaryBody}>
            <View style={[styles.pill, { backgroundColor: `${status.color}22` }]}>
              <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{event.title}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {formatDate(event.date)} · {event.time}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{event.location}</Text>
            <Text style={[styles.meta, { color: colors.foreground }]}>
              {event.isPaid ? `${event.currency} ${event.price.toLocaleString()} · paid on your website` : "Free entry"}
            </Text>
          </View>
        </GlassSurface>

        <ProfileStatGrid
          stats={[
            { label: "Attending", value: event.attendees, icon: "people-outline" },
            { label: "Capacity", value: event.capacity, icon: "grid-outline" },
            { label: "% full", value: fill, icon: "pie-chart-outline" },
          ]}
        />

        {actionError ? <InlineError message={actionError} /> : null}

        <View style={styles.actions}>
          {!isPast ? (
            <Action
              icon="create-outline"
              label="Edit details"
              onPress={() => router.push({ pathname: "/business/create-event", params: { id: event.id } } as any)}
              disabled={!!busy}
            />
          ) : null}
          {!isPast ? (
            <Action
              icon={isPaused ? "play-outline" : "pause-outline"}
              label={isPaused ? "Resume event" : "Pause event"}
              sublabel={isPaused ? "Show it in discovery again" : "Hide it from discovery; bookings are kept"}
              onPress={() => void toggleStatus()}
              busy={busy === "status"}
              disabled={!!busy}
            />
          ) : null}
          {!isPaused && !isPast ? (
            <Action
              icon="eye-outline"
              label="View public page"
              onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } } as any)}
              disabled={!!busy}
            />
          ) : null}
          {canPromote && !isPaused && !isPast ? (
            <Action
              icon="megaphone-outline"
              label="Promote on Home"
              sublabel="Banners, Featured and sponsored placements"
              onPress={() => setPromoting(true)}
              disabled={!!busy}
            />
          ) : null}
          <Action
            icon="trash-outline"
            label="Delete event"
            destructive
            onPress={() => setConfirmDelete(true)}
            busy={busy === "delete"}
            disabled={!!busy}
          />
        </View>
      </ScrollView>

      <ChatConfirmDialog
        visible={confirmDelete}
        title="Delete this event?"
        description={`"${event.title}" will be removed from your profile and from discovery. This can't be undone.`}
        confirmLabel="Delete event"
        destructive
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
      {canPromote ? (
        <PromotionSheet
          visible={promoting}
          events={[event]}
          initialEventId={event.id}
          onSubmit={(input) => requestPromotion(user!.id, input)}
          onClose={() => setPromoting(false)}
        />
      ) : null}
    </View>
  );
}

function Action({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
  busy,
  disabled,
}: {
  icon: IconName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const tint = destructive ? colors.destructive : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || (disabled && !busy) ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
    >
      {busy ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={icon} size={19} color={tint} />}
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
        {sublabel ? <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{sublabel}</Text> : null}
      </View>
      {!destructive ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: { padding: 16 },
  content: { padding: 16, gap: 16 },
  summary: { padding: 0, overflow: "hidden" },
  image: { width: "100%", height: 150 },
  summaryBody: { padding: 16, gap: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 20, lineHeight: 26, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { gap: 10 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionCopy: { flex: 1 },
  actionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
