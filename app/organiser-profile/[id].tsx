import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EventCard } from "@/components/EventCard";
import { GlassSurface } from "@/components/GlassSurface";
import { OrganiserAvatar } from "@/components/profile/CustomerTabs";
import { ProfileSection, ProfileStatGrid, SectionState } from "@/components/profile/ProfileSection";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useSavedOrganisers } from "@/hooks/useSavedOrganisers";
import { eventsByOrganiser } from "@/utils/customerProfile";
import { localToday } from "@/utils/dates";

/**
 * Public page for an event organiser: who they are and what they host.
 * Customers can save the organiser privately; there are no follower counts.
 *
 * BACKEND GAP: events only carry the organiser's display name, so the page is
 * built from the events list. Swap to GET /api/v1/organisers/:id once it exists.
 */
export default function OrganiserProfileScreen() {
  const { id, name: nameParam } = useLocalSearchParams<{ id: string; name?: string }>();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { events, isLoading: eventsLoading, error: eventsError, refreshEvents } = useEvents();
  // Customer-only feature: publishers (including a business previewing its own page) don't get Save.
  const saved = useSavedOrganisers({ active: getAccountType(user) === "customer" });
  const [saveError, setSaveError] = useState<string | null>(null);

  const organiserId = id ?? "";
  const hosted = useMemo(() => eventsByOrganiser(events, organiserId), [events, organiserId]);
  const savedEntry = saved.organisers.find((o) => o.id === organiserId);
  const name = hosted[0]?.organizer ?? savedEntry?.name ?? nameParam ?? "Organiser";

  const today = localToday();
  const upcoming = hosted.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = hosted.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const website = hosted.find((e) => e.organizerWebsite)?.organizerWebsite;
  const location = mostCommon(hosted.map((e) => e.city).filter(Boolean)) ?? savedEntry?.location;
  const categories = Array.from(new Set(hosted.map((e) => e.category)));

  const isSaved = saved.isSaved(organiserId);
  const isPending = saved.isPending(organiserId);

  const toggleSave = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login" as any);
      return;
    }
    setSaveError(await saved.toggle({ id: organiserId, name, location, type: savedEntry?.type }));
  };

  const openWebsite = () => {
    if (!website) return;
    const url = /^https?:\/\//.test(website) ? website : `https://${website}`;
    void Linking.openURL(url).catch(() => {});
  };

  const isEmptyLoad = eventsLoading && !events.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="Organiser" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassSurface style={styles.hero}>
          <OrganiserAvatar name={name} size={72} />
          <Text style={[styles.name, { color: colors.foreground }]} accessibilityRole="header">
            {name}
          </Text>
          {location || categories.length ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {[location, categories.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
            </Text>
          ) : null}

          <View style={styles.heroActions}>
            {saved.enabled || !isAuthenticated ? (
              <Pressable
                onPress={toggleSave}
                disabled={isPending}
                style={({ pressed }) => [
                  styles.heroBtn,
                  isSaved
                    ? { borderWidth: 1, borderColor: colors.primary }
                    : { backgroundColor: colors.primary },
                  { opacity: pressed || isPending ? 0.8 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved, busy: isPending }}
                accessibilityLabel={isSaved ? `Remove ${name} from saved organisers` : `Save ${name}`}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={isSaved ? colors.primary : "#FFFFFF"} />
                ) : (
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={16}
                    color={isSaved ? colors.primary : "#FFFFFF"}
                  />
                )}
                <Text style={[styles.heroBtnText, { color: isSaved ? colors.primary : "#FFFFFF" }]}>
                  {isSaved ? "Saved" : "Save organiser"}
                </Text>
              </Pressable>
            ) : null}
            {website ? (
              <Pressable
                onPress={openWebsite}
                style={({ pressed }) => [
                  styles.heroBtn,
                  { borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
                accessibilityRole="link"
                accessibilityLabel={`Visit ${name}'s website`}
              >
                <Ionicons name="globe-outline" size={16} color={colors.foreground} />
                <Text style={[styles.heroBtnText, { color: colors.foreground }]}>Website</Text>
              </Pressable>
            ) : null}
          </View>
          {saveError ? (
            <Text style={[styles.error, { color: colors.destructive }]} accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : !saved.enabled && isAuthenticated ? null : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Saved organisers are private to you and listed on your profile.
            </Text>
          )}
        </GlassSurface>

        {isEmptyLoad ? (
          <SectionState kind="loading" message="Loading events…" />
        ) : eventsError && !events.length ? (
          <SectionState kind="error" message={eventsError} onRetry={() => void refreshEvents()} />
        ) : (
          <>
            <ProfileStatGrid
              stats={[
                { label: "Upcoming", value: upcoming.length, icon: "calendar-outline" },
                { label: "Hosted", value: hosted.length, icon: "albums-outline" },
              ]}
            />

            <ProfileSection title="Upcoming events">
              {upcoming.length ? (
                <View style={styles.list}>
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} variant="compact" inset={0} />
                  ))}
                </View>
              ) : (
                <SectionState
                  kind="empty"
                  icon="calendar-outline"
                  title="No upcoming events"
                  message={
                    isSaved
                      ? "Nothing scheduled right now. You'll find new events here when they're published."
                      : "Nothing scheduled right now. Save this organiser to find them again quickly."
                  }
                />
              )}
            </ProfileSection>

            {past.length ? (
              <ProfileSection title="Past events">
                <View style={styles.list}>
                  {past.slice(0, 5).map((event) => (
                    <EventCard key={event.id} event={event} variant="compact" inset={0} />
                  ))}
                </View>
              </ProfileSection>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best: string | undefined;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 22 },
  hero: { alignItems: "center", padding: 20, gap: 8, borderRadius: 22 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4 },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  heroBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  error: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 4 },
  list: { gap: 10 },
});
