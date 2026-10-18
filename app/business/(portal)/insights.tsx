import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrganiserAnalytics } from "@/components/OrganiserAnalytics";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { useAuth } from "@/context/AuthContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

export default function OrganiserInsightsScreen() {
  const palette = useOrganiserPalette();
  const { user } = useAuth();
  const { events, isLoading, hasLoaded, error, refresh } = useOrganiserEvents();
  const { refresh: refreshAnalytics } = useAnalytics();
  const reload = async () => { await Promise.all([refresh(), refreshAnalytics()]); };

  return <View style={[styles.root, { backgroundColor: palette.canvas }]} testID="organiser-insights-screen">
    <OrganiserAtmosphere />
    <OrganiserPortalHeader title="Insights" />
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading && hasLoaded} onRefresh={() => void reload()} tintColor={palette.accent} />}>
      {isLoading && !hasLoaded ? <View style={styles.state}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.muted }}>Loading insights…</Text></View>
        : error ? <View style={[styles.error, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <Text accessibilityRole="alert" style={[styles.message, { color: palette.muted }]}>{error}</Text>
          <Pressable onPress={() => void reload()} accessibilityRole="button" style={[styles.retry, { backgroundColor: palette.blue }]}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View> : user ? <OrganiserAnalytics key={user.id} ownerId={user.id} events={events} /> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, paddingBottom: 32 }, state: { paddingVertical: 48, alignItems: "center", gap: 12 },
  error: { padding: 24, borderWidth: 1, borderRadius: 20, gap: 16, alignItems: "center" }, message: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 20, borderRadius: 13 }, retryText: { color: "white", fontFamily: "Inter_600SemiBold" },
});
