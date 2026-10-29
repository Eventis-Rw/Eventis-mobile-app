import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { useFindLoveDemo, type LoveActivity, type LoveActivityType } from "@/context/FindLoveDemoContext";
import { useColors } from "@/hooks/useColors";

const ACTIVITY_ICONS: Record<LoveActivityType, keyof typeof Ionicons.glyphMap> = {
  connection: "heart-circle-outline",
  request: "person-add-outline",
  gift: "gift-outline",
  purchase: "card-outline",
  message: "chatbubble-ellipses-outline",
};

/** FindLove notifications on their own page, opened from the Home bell. Kept apart from the Inbox and chats. */
export default function LoveNotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activity } = useFindLoveDemo();

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/love" as any);
  };

  // Requests are answered in Inbox › Pending; everything else is information only.
  const open = (entry: LoveActivity) => {
    if (entry.type === "request") router.navigate({ pathname: "/love/messages", params: { tab: "pending", at: String(Date.now()) } } as any);
    else if (entry.type === "purchase" || entry.type === "gift") router.push("/love/wallet" as any);
  };

  return (
    <LoveScreenShell title="Notifications" onBack={back}>
      {activity.length ? (
        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {activity.map((entry, index) => {
            const tappable = entry.type === "request" || entry.type === "purchase" || entry.type === "gift";
            return (
              <Pressable
                key={entry.id}
                onPress={() => open(entry)}
                disabled={!tappable}
                accessibilityRole={tappable ? "button" : undefined}
                style={({ pressed }) => [
                  styles.row,
                  index < activity.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: colors.secondary },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: colors.glass }]}>
                  <Ionicons name={ACTIVITY_ICONS[entry.type]} size={20} color={colors.primary} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{entry.title}</Text>
                  <Text style={[styles.description, { color: colors.mutedForeground }]}>{entry.description}</Text>
                </View>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{entry.createdAt}</Text>
              </Pressable>
            );
          })}
        </View>
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
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: { minHeight: 76, flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  description: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  time: { fontSize: 10, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 68, height: 68, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16 },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
});
