import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

export default function ChatLayout() {
  const { notification, dismissNotification, getContact, getConversation } =
    useChat();
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismissNotification, 6000);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);
  const contact = notification
    ? getContact(getConversation(notification.conversationId)?.contactId ?? "")
    : undefined;
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      />
      {notification ? (
        <View
          style={[
            styles.banner,
            {
              top: insets.top + 8,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              const id = notification.conversationId;
              dismissNotification();
              router.push({ pathname: "/chat/[id]", params: { id } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open new demo message from ${contact?.name ?? "contact"}`}
            style={{ flex: 1 }}
          >
            <Text style={[styles.name, { color: colors.primary }]}>
              Demo message · {contact?.name}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.text, { color: colors.foreground }]}
            >
              {notification.text}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismissNotification}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    width: "94%",
    maxWidth: 700,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    elevation: 8,
    boxShadow: "0 3px 18px rgba(0,0,0,0.15)",
  },
  name: { fontFamily: "Inter_700Bold", fontSize: 12, marginBottom: 5 },
  text: { fontSize: 13, lineHeight: 19 },
  close: {
    width: 35,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
