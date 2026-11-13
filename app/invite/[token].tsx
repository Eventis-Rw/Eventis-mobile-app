import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

const PENDING_INVITE_KEY = "@eventis_pending_invite";

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { acceptInvitation } = useChat();
  const colors = useChatColors();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    if (!token) {
      setError("This invitation link is invalid or incomplete.");
      return;
    }
    if (!isAuthenticated || !user || user.isDemo) {
      void AsyncStorage.setItem(PENDING_INVITE_KEY, token)
        .catch(() => undefined)
        .finally(() => {
          if (active) router.replace("/auth/login" as never);
        });
      return;
    }
    void (async () => {
      try {
        const conversation = await acceptInvitation(token);
        await AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => undefined);
        if (active) {
          router.replace({
            pathname: "/chat/[id]",
            params: { id: conversation.id },
          });
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "This invitation could not be accepted.",
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token, isLoading, isAuthenticated, user?.id, user?.isDemo, acceptInvitation, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Ionicons name="people-outline" size={42} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Eventis invitation
        </Text>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.message, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
        {error ? (
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/chat")
            }
            accessibilityRole="button"
            style={[styles.action, { backgroundColor: colors.secondary }]}
          >
            <Text style={{ color: colors.primary }}>Go back</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  message: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  action: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22 },
});
