import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import type { LoveActivity, LoveActivityType } from "@/context/FindLoveDemoContext";
import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useColors } from "@/hooks/useColors";

type ConnectionsTab = "connections" | "pending" | "activity";

const ACTIVITY_ICONS: Record<LoveActivityType, keyof typeof Ionicons.glyphMap> = {
  connection: "heart-circle-outline",
  request: "time-outline",
  gift: "gift-outline",
  purchase: "card-outline",
  message: "chatbubble-ellipses-outline",
};

export default function LoveConnectionsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: ConnectionsTab }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const initialTab = tab === "pending" || tab === "activity" ? tab : "connections";
  const [activeTab, setActiveTab] = useState<ConnectionsTab>(initialTab);
  const { connections, pendingProfiles, activity, tokenBalance } = useFindLoveDemo();

  const tabs = useMemo(() => [
    { id: "connections" as const, label: "Connections", count: connections.length },
    { id: "pending" as const, label: "Pending", count: pendingProfiles.length },
    { id: "activity" as const, label: "Activity", count: activity.length },
  ], [connections.length, pendingProfiles.length, activity.length]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Your Love space</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Connections, requests, and activity</Text>
        </View>
        <Pressable onPress={() => router.push("/love/wallet" as any)} style={[styles.balanceBadge, { backgroundColor: colors.glass }]} accessibilityRole="button" accessibilityLabel={`${tokenBalance} gift tokens`}>
          <Ionicons name="gift-outline" size={16} color={colors.primary} />
          <Text style={[styles.balanceText, { color: colors.primary }]}>{tokenBalance}</Text>
        </Pressable>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {tabs.map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable key={item.id} onPress={() => setActiveTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.tab, selected && { borderBottomColor: colors.primary }]}>
              <Text style={[styles.tabText, { color: selected ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
              <View style={[styles.countBadge, { backgroundColor: selected ? colors.glass : colors.secondary }]}>
                <Text style={[styles.countText, { color: selected ? colors.primary : colors.mutedForeground }]}>{item.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        {activeTab === "connections" ? (
          connections.length ? connections.map((profile) => (
            <View key={profile.id} style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: profile.imageUrl }} style={styles.avatar} accessibilityLabel={`Profile photo of ${profile.name}`} />
              <View style={styles.profileCopy}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}, {profile.age}</Text>
                  {profile.verified ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{profile.city} · {profile.occupation}</Text>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => router.push({ pathname: "/love/chat/[id]", params: { id: profile.id } } as any)} style={[styles.primaryAction, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel={`Message ${profile.name}`}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Message</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push({ pathname: "/love/chat/[id]", params: { id: profile.id, gift: "1" } } as any)} style={[styles.iconAction, { backgroundColor: colors.secondary, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`Send a gift to ${profile.name}`}>
                    <Ionicons name="gift-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any)} style={[styles.iconAction, { backgroundColor: colors.secondary, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`View ${profile.name}'s profile`}>
                    <Ionicons name="person-outline" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>
            </View>
          )) : <EmptyState icon="people-outline" title="No connections yet" body="Accepted connections will appear here." colors={colors} />
        ) : null}

        {activeTab === "pending" ? (
          pendingProfiles.length ? pendingProfiles.map((profile) => (
            <Pressable key={profile.id} onPress={() => router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any)} style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: profile.imageUrl }} style={styles.pendingAvatar} />
              <View style={styles.profileCopy}>
                <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}, {profile.age}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{profile.city} · Request awaiting response</Text>
              </View>
              <View style={[styles.pendingBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>Pending</Text>
              </View>
            </Pressable>
          )) : <EmptyState icon="time-outline" title="No pending requests" body="New connection requests will appear here." colors={colors} />
        ) : null}

        {activeTab === "activity" ? (
          activity.length ? activity.map((entry) => <ActivityRow key={entry.id} entry={entry} colors={colors} />) : <EmptyState icon="pulse-outline" title="No activity yet" body="Connections, messages, and gifts will appear here." colors={colors} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function ActivityRow({ entry, colors }: { entry: LoveActivity; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.activityRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.activityIcon, { backgroundColor: colors.glass }]}>
        <Ionicons name={ACTIVITY_ICONS[entry.type]} size={20} color={colors.primary} />
      </View>
      <View style={styles.profileCopy}>
        <Text style={[styles.activityTitle, { color: colors.foreground }]}>{entry.title}</Text>
        <Text style={[styles.activityDescription, { color: colors.mutedForeground }]}>{entry.description}</Text>
      </View>
      <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{entry.createdAt}</Text>
    </View>
  );
}

function EmptyState({ icon, title, body, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Ionicons name={icon} size={32} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  backButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { fontSize: 21, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  balanceBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, height: 38, borderRadius: 14 },
  balanceText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 12 },
  tab: { flex: 1, minHeight: 52, borderBottomWidth: 2, borderBottomColor: "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  countBadge: { minWidth: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  countText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 16 },
  connectionCard: { flexDirection: "row", gap: 13, borderWidth: 1, borderRadius: 21, padding: 12, marginBottom: 12 },
  avatar: { width: 88, height: 112, borderRadius: 17, backgroundColor: "#E5E7EB" },
  profileCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 16, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  cardActions: { flexDirection: "row", gap: 7, marginTop: 15 },
  primaryAction: { flex: 1, minHeight: 39, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  primaryActionText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  iconAction: { width: 40, height: 40, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  pendingCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 11, marginBottom: 11 },
  pendingAvatar: { width: 58, height: 58, borderRadius: 16, backgroundColor: "#E5E7EB" },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 99 },
  pendingText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  activityRow: { minHeight: 86, flexDirection: "row", alignItems: "flex-start", gap: 12, borderBottomWidth: 1, paddingVertical: 14 },
  activityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  activityDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  activityTime: { fontSize: 10, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 68, height: 68, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16 },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
});
