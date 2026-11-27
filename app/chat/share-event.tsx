import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { formatEventLocation } from "@/constants/eventPresentation";
import type { Event } from "@/constants/events";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import { useEvents } from "@/context/EventsContext";
import { eventShareText } from "@/utils/shareEvent";

export default function ShareEventScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const { events, isLoading, error: loadError } = useEvents();
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? events.filter((event) =>
          `${event.title} ${event.location} ${event.city}`.toLowerCase().includes(q),
        )
      : events;
    return [...list].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [events, query]);

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");

  async function share(event: Event) {
    if (!conversationId || sendingId) return;
    setSendingId(event.id);
    setError("");
    try {
      await chat.sendMessage(conversationId, eventShareText(event));
      router.dismissTo({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not share this event.",
      );
    } finally {
      setSendingId(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.workspace, { paddingTop: insets.top + 4 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.icon}
          >
            <Ionicons name="chevron-back" size={27} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Share an event
          </Text>
        </View>
        <View style={[styles.search, { backgroundColor: colors.input }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search events"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}
        {loadError && !events.length ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.foreground }}>{loadError}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void share(item)}
                disabled={Boolean(sendingId)}
                accessibilityRole="button"
                accessibilityLabel={`Share ${item.title}`}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      styles.thumbFallback,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
                    {formatEventLocation(item)}
                  </Text>
                </View>
                {sendingId === item.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="arrow-redo-outline" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              isLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.busy} />
              ) : (
                <View style={styles.empty}>
                  <Text style={{ color: colors.mutedForeground }}>No events found.</Text>
                </View>
              )
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 19 },
  search: {
    margin: 12,
    minHeight: 46,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
  },
  input: { flex: 1, minWidth: 0, fontSize: 15 },
  error: { paddingHorizontal: 18, paddingBottom: 8 },
  empty: { padding: 40, alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowSubtitle: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  busy: { marginTop: 40 },
});
