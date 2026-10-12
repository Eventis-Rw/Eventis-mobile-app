import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { EventCard } from "@/components/EventCard";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

/** Events the user bookmarked. Moved out of Settings, which now only holds settings. */
export default function SavedEventsScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events, isLoading, error, refreshEvents } = useEvents();

  const saved = useMemo(() => events.filter((e) => user?.savedEvents.includes(e.id)), [events, user?.savedEvents]);
  // Saved ids whose event is no longer listed (ended or removed).
  const unavailable = (user?.savedEvents.length ?? 0) - saved.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="Saved events" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {isLoading && !events.length ? (
          <SectionState kind="loading" message="Loading saved events…" />
        ) : error && !events.length ? (
          <SectionState kind="error" message={error} onRetry={() => void refreshEvents()} />
        ) : saved.length ? (
          <>
            {saved.map((event) => (
              <EventCard key={event.id} event={event} variant="compact" inset={0} />
            ))}
            {unavailable > 0 ? (
              <SectionState
                kind="empty"
                icon="time-outline"
                title={`${unavailable} saved ${unavailable === 1 ? "event has" : "events have"} ended`}
                message="Events disappear from this list once they're over."
              />
            ) : null}
          </>
        ) : (
          <SectionState
            kind="empty"
            icon="bookmark-outline"
            title="No saved events"
            message="Tap the bookmark on any event to keep it here."
            actionLabel="Discover events"
            onAction={() => router.push("/search" as any)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 10 },
});
