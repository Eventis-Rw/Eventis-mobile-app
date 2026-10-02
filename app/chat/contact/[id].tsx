import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatActionSheet } from "@/components/ChatActionSheet";
import { ContactNameEditor } from "@/components/ContactNameEditor";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

export default function ContactDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const contact = chat.getContact(id);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<"block" | "report" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");
  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    }
  }
  if (!contact)
    return (
      <View style={styles.center}>
        <Text>Contact unavailable</Text>
        <Pressable onPress={back} accessibilityRole="button">
          <Text>Go back</Text>
        </Pressable>
      </View>
    );
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Contact details
          </Text>
        </View>
        <View style={styles.identity}>
          <Image
            source={{ uri: contact.avatarUrl }}
            style={styles.avatar}
            accessibilityLabel={`Photo of ${contact.name}`}
          />
          <Text style={[styles.name, { color: colors.foreground }]}>
            {contact.name}
          </Text>
          <Text style={[styles.phone, { color: colors.mutedForeground }]}>
            {contact.phone}
          </Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            {contact.isEventisUser
              ? "Eventis contact · demo"
              : "Not on Eventis · demo"}
          </Text>
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            About
          </Text>
          <Text style={[styles.about, { color: colors.foreground }]}>
            {contact.headline}
          </Text>
        </View>
        <Pressable
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          style={[styles.row, { borderBottomColor: colors.border }]}
        >
          <Ionicons name="pencil-outline" size={21} color={colors.primary} />
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>
            Edit saved contact name
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
        {contact.isEventisUser ? (
          <Pressable
            onPress={() =>
              void run(async () => {
                const conversation = await chat.startConversation(id);
                router.dismissTo({
                  pathname: "/chat/[id]",
                  params: { id: conversation.id },
                });
              })
            }
            disabled={contact.blocked}
            accessibilityRole="button"
            style={styles.row}
          >
            <Ionicons
              name="chatbubble-outline"
              size={21}
              color={contact.blocked ? colors.disabled : colors.primary}
            />
            <Text
              style={[
                styles.rowLabel,
                {
                  color: contact.blocked ? colors.disabled : colors.foreground,
                },
              ]}
            >
              Message
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setAction("block")}
          accessibilityRole="button"
          style={styles.row}
        >
          <Ionicons name="ban-outline" size={21} color={colors.destructive} />
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>
            {contact.blocked ? "Unblock contact" : "Block contact"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAction("report")}
          accessibilityRole="button"
          style={styles.row}
        >
          <Ionicons name="flag-outline" size={21} color={colors.destructive} />
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>
            Report contact
          </Text>
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Local demo: blocking applies on this device. Reports are saved locally
          and are not submitted to a moderation team.
        </Text>
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.notice, { color: colors.primary }]}
          >
            {notice}
          </Text>
        ) : null}
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.notice, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <ContactNameEditor
        contact={editing ? contact : null}
        onClose={() => setEditing(false)}
        onSave={chat.updateContactName}
      />
      <ChatActionSheet
        visible={action === "block"}
        title={
          contact.blocked ? "Unblock this contact?" : "Block this contact?"
        }
        subtitle={
          contact.blocked
            ? "You will be able to message this contact again."
            : "You will not be able to send or simulate receiving messages from this contact on this device."
        }
        actions={[
          {
            label: contact.blocked ? "Unblock" : "Block",
            icon: "ban-outline",
            destructive: !contact.blocked,
            onPress: () =>
              void run(() => chat.setBlocked(id, !contact.blocked)),
          },
        ]}
        onClose={() => setAction(null)}
      />
      <ChatActionSheet
        visible={action === "report"}
        title="Why are you reporting?"
        subtitle="Choose a reason. This demo saves the report locally only."
        actions={["Spam", "Harassment", "Inappropriate content", "Other"].map(
          (reason) => ({
            label: reason,
            icon: "flag-outline",
            onPress: () =>
              void run(async () => {
                await chat.reportContact(id, reason);
                setNotice("Report saved locally — not submitted");
              }),
          }),
        )}
        onClose={() => setAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  content: { width: "100%", maxWidth: 640, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 15 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { width: 44, height: 44, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  identity: { alignItems: "center", paddingVertical: 28, gap: 7 },
  avatar: { width: 108, height: 108, borderRadius: 54, marginBottom: 10 },
  name: { fontFamily: "Inter_800ExtraBold", fontSize: 24, textAlign: "center" },
  phone: { fontSize: 14 },
  subtitle: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  card: { padding: 18, borderWidth: 1, borderRadius: 18, marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 7 },
  about: { fontFamily: "Inter_500Medium", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  rowLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14 },
  disclaimer: { fontSize: 11, lineHeight: 18, marginTop: 22 },
  notice: { fontSize: 13, lineHeight: 20, marginTop: 12 },
});
