import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { useFindLoveDemo, type LoveActivity, type LoveActivityType } from "@/context/FindLoveDemoContext";
import { useColors } from "@/hooks/useColors";

type Palette = ReturnType<typeof useColors>;

function toneFor(type: LoveActivityType, colors: Palette): { icon: keyof typeof Ionicons.glyphMap; background: string; color: string } {
  switch (type) {
    case "request":
      return { icon: "mail-unread-outline", background: colors.glass, color: colors.primary };
    case "connection":
      return { icon: "heart-circle-outline", background: "rgba(34,197,94,0.14)", color: colors.success };
    case "gift":
      return { icon: "gift-outline", background: "rgba(212,160,23,0.16)", color: colors.warning };
    case "purchase":
      return { icon: "card-outline", background: "rgba(212,160,23,0.16)", color: colors.warning };
    case "message":
      return { icon: "chatbubble-ellipses-outline", background: colors.glass, color: colors.primary };
  }
}

/** FindLove notifications on their own page, opened from the Home bell. Kept apart from the Inbox and chats. */
export default function LoveNotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activity } = useFindLoveDemo();

  const groups = useMemo(() => {
    const requests = activity.filter((entry) => entry.type === "request");
    const updates = activity.filter((entry) => entry.type !== "request");
    return [
      { key: "requests", title: "Requests", entries: requests },
      { key: "updates", title: "Activity", entries: updates },
    ].filter((group) => group.entries.length > 0);
  }, [activity]);

  const requestCount = groups.find((group) => group.key === "requests")?.entries.length ?? 0;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/love" as any);
  };

  const open = (entry: LoveActivity) => {
    if (entry.type === "request") {
      router.navigate({ pathname: "/love/messages", params: { tab: entry.tab ?? "received", at: String(Date.now()) } } as any);
    } else if (entry.type === "purchase" || entry.type === "gift") {
      router.push("/love/wallet" as any);
    }
  };

  return (
    <LoveScreenShell title="Notifications" onBack={back}>
      {activity.length ? (
        <>
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.glass }]}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                {activity.length} recent {activity.length === 1 ? "update" : "updates"}
              </Text>
              <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
                {requestCount
                  ? `${requestCount} request${requestCount === 1 ? "" : "s"} in your Inbox.`
                  : "Connection news and updates appear here."}
              </Text>
            </View>
          </View>

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{group.title.toUpperCase()}</Text>
                <View style={[styles.groupCount, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.groupCountText, { color: colors.mutedForeground }]}>{group.entries.length}</Text>
                </View>
              </View>

              <View style={styles.groupList}>
                {group.entries.map((entry) => {
                  const tone = toneFor(entry.type, colors);
                  const tappable = entry.type === "request" || entry.type === "purchase" || entry.type === "gift";

                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => open(entry)}
                      disabled={!tappable}
                      accessibilityRole={tappable ? "button" : undefined}
                      style={({ pressed }) => [
                        styles.card,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        pressed && tappable && styles.pressed,
                      ]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
                        <Ionicons name={tone.icon} size={20} color={tone.color} />
                      </View>
                      <View style={styles.copy}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{entry.title}</Text>
                          <Text style={[styles.time, { color: colors.mutedForeground }]}>{entry.createdAt}</Text>
                        </View>
                        <Text style={[styles.description, { color: colors.mutedForeground }]}>{entry.description}</Text>
                        {tappable ? (
                          <View style={styles.actionRow}>
                            <Text style={[styles.actionText, { color: colors.primary }]}>
                              {entry.type === "request" ? "Answer request" : "Open wallet"}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="notifications-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Connection requests and new matches will appear here.</Text>
        </View>
      )}
    </LoveScreenShell>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 20, padding: 14 },
  summaryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  group: { gap: 9 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  groupTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  groupCount: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  groupCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  groupList: { gap: 9 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderRadius: 18, padding: 13 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: "Inter_700Bold" },
  time: { flexShrink: 0, fontSize: 10, fontFamily: "Inter_500Medium", paddingTop: 2 },
  description: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 8 },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 68, height: 68, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16 },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
});
