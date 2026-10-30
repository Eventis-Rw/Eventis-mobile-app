import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useFindLoveChat } from "@/context/FindLoveChatContext";
import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useLoveProfilesState } from "@/context/LoveProfilesContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { LOVE_REQUEST_MESSAGE_MAX, messagesLeft, validateLoveRequestMessage } from "@/utils/findLoveConnections";

type RequestsTab = "received" | "sent";

/** Accept, decline and cancel, with the matching notification and haptics. */
export function useConnectionActions() {
  const { respondToRequest, cancelRequest } = useLoveProfilesState();
  const { recordConnection } = useFindLoveDemo();
  const { keepRequestMessage } = useFindLoveChat();

  const accept = useCallback(async (profile: LoveProfile) => {
    if (!(await respondToRequest(profile.id, true))) return false;
    if (profile.requestMessage) keepRequestMessage(profile.id, profile.requestMessage);
    recordConnection("connection", `You connected with ${profile.username}`, "You can now message each other.");
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  }, [keepRequestMessage, recordConnection, respondToRequest]);

  const decline = useCallback(async (profile: LoveProfile) => {
    if (!(await respondToRequest(profile.id, false))) return false;
    recordConnection("request", `You declined ${profile.username}'s request`, "They won't be told you declined.");
    return true;
  }, [recordConnection, respondToRequest]);

  const cancel = useCallback(async (profile: LoveProfile) => {
    if (!(await cancelRequest(profile.id))) return false;
    recordConnection("request", `You cancelled your request to ${profile.username}`, "You can send a new one from their profile.");
    return true;
  }, [cancelRequest, recordConnection]);

  return { accept, decline, cancel };
}

/** Inbox › Pending: requests the member received and requests they sent. */
export function PendingRequests({ received, sent }: { received: LoveProfile[]; sent: LoveProfile[] }) {
  const colors = useColors();
  const router = useRouter();
  const { error } = useLoveProfilesState();
  const { accept, decline, cancel } = useConnectionActions();
  // Start where there is something to answer.
  const [tab, setTab] = useState<RequestsTab>(received.length || !sent.length ? "received" : "sent");
  const [busy, setBusy] = useState<string | null>(null);
  const [messageFor, setMessageFor] = useState<LoveProfile | null>(null);
  const [cancelFor, setCancelFor] = useState<LoveProfile | null>(null);

  const run = async (profile: LoveProfile, action: (p: LoveProfile) => Promise<boolean>) => {
    setBusy(profile.id);
    await action(profile);
    setBusy(null);
  };

  const openProfile = (profile: LoveProfile) => router.push({ pathname: "/love/[id]", params: { id: profile.id } } as any);
  const list = tab === "received" ? received : sent;

  return (
    <View>
      <View style={[styles.segments, { backgroundColor: colors.secondary }]} accessibilityRole="tablist">
        {(["received", "sent"] as RequestsTab[]).map((option) => {
          const selected = tab === option;
          const count = option === "received" ? received.length : sent.length;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[styles.segment, selected && { backgroundColor: colors.card }]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.segmentText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
                {option === "received" ? "Received" : "Sent"} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name={tab === "received" ? "mail-unread-outline" : "paper-plane-outline"} size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {tab === "received" ? "No requests received" : "No requests sent"}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {tab === "received"
              ? "When someone wants to connect with you, they appear here."
              : "People you send a connection request to appear here until they answer."}
          </Text>
        </View>
      ) : (
        list.map((profile) => (
          <View key={profile.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => openProfile(profile)} style={styles.cardTop} accessibilityRole="button" accessibilityLabel={`View ${profile.username}'s profile`}>
              <Avatar profile={profile} />
              <View style={styles.copy}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{profile.username}</Text>
                  {profile.verified ? <Ionicons name="checkmark-circle" size={15} color={colors.primary} /> : null}
                  <MembershipBadge type={profile.accountType} size="sm" iconOnly />
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}
                </Text>
                {tab === "received" && profile.requestMessage ? (
                  <Text style={[styles.note, { color: colors.foreground }]} numberOfLines={2}>“{profile.requestMessage}”</Text>
                ) : null}
              </View>
              {tab === "sent" ? (
                <View style={[styles.status, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Pending</Text>
                </View>
              ) : null}
            </Pressable>

            {busy === profile.id ? (
              <ActivityIndicator style={styles.busy} color={colors.primary} />
            ) : tab === "received" ? (
              <View style={styles.actions}>
                <ActionButton label="Accept" icon="checkmark" kind="primary" onPress={() => void run(profile, accept)} />
                <ActionButton label="Decline" icon="close" kind="secondary" onPress={() => void run(profile, decline)} />
                <ActionButton label="Message" icon="chatbubble-ellipses-outline" kind="secondary" onPress={() => setMessageFor(profile)} />
              </View>
            ) : (
              <View style={styles.actions}>
                <ActionButton label="Cancel connection" icon="close-circle-outline" kind="danger" onPress={() => setCancelFor(profile)} />
              </View>
            )}
          </View>
        ))
      )}

      <RequestMessageSheet profile={messageFor} onClose={() => setMessageFor(null)} />
      <ChatConfirmDialog
        visible={!!cancelFor}
        title="Cancel this request?"
        description={cancelFor ? `${cancelFor.username} will no longer see your connection request.` : ""}
        confirmLabel="Cancel request"
        destructive
        onConfirm={() => {
          const profile = cancelFor;
          setCancelFor(null);
          if (profile) void run(profile, cancel);
        }}
        onClose={() => setCancelFor(null)}
      />
    </View>
  );
}

/**
 * Pop-up on a received request: their message, and one reply before accepting.
 * The reply is saved to the chat, so it is there once they're connected.
 */
export function RequestMessageSheet({ profile, onClose }: { profile: LoveProfile | null; onClose: () => void }) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { threads, sendMessage } = useFindLoveChat();
  const { getConnectionStatus } = useLoveProfilesState();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();

  const thread = profile ? threads[profile.id] : undefined;
  const left = profile ? messagesLeft(getConnectionStatus(profile.id), thread) : 0;
  const reply = thread?.messages.find((message) => message.own && message.kind === "text");

  const close = () => {
    setText("");
    setError(undefined);
    onClose();
  };

  const send = () => {
    if (!profile) return;
    const problem = validateLoveRequestMessage(text);
    if (problem) {
      setError(problem);
      return;
    }
    sendMessage(profile.id, { kind: "text", text: text.trim() });
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText("");
    setError(undefined);
  };

  return (
    <Modal visible={!!profile} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={close} accessibilityRole="button" accessibilityLabel="Close">
          <Pressable
            onPress={() => undefined}
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {profile ? (
              <>
                <View style={styles.sheetHead}>
                  <Avatar profile={profile} small />
                  <View style={styles.copy}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{profile.username}</Text>
                      <MembershipBadge type={profile.accountType} size="sm" iconOnly />
                    </View>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>Wants to connect with you</Text>
                  </View>
                </View>

                <View style={[styles.bubble, styles.theirs, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.bubbleText, { color: colors.foreground }]}>
                    {profile.requestMessage ?? `${profile.username} sent a request without a message.`}
                  </Text>
                </View>
                {reply && reply.kind === "text" ? (
                  <View style={[styles.bubble, styles.mine, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.bubbleText, { color: "#FFFFFF" }]}>{reply.text}</Text>
                  </View>
                ) : null}

                {left > 0 ? (
                  <>
                    <TextInput
                      value={text}
                      onChangeText={(value) => {
                        setText(value);
                        setError(undefined);
                      }}
                      placeholder={`Reply to ${profile.username}`}
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: error ? colors.destructive : colors.border }]}
                      multiline
                      maxLength={LOVE_REQUEST_MESSAGE_MAX}
                      accessibilityLabel={`Reply to ${profile.username}`}
                    />
                    <View style={styles.inputFoot}>
                      <Text style={[styles.hint, { color: error ? colors.destructive : colors.mutedForeground }]}>
                        {error ?? "You can send one message before you connect."}
                      </Text>
                      <Text style={[styles.hint, { color: colors.mutedForeground }]}>{text.length}/{LOVE_REQUEST_MESSAGE_MAX}</Text>
                    </View>
                    <Pressable
                      onPress={send}
                      style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                      <Text style={styles.sendText}>Send message</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={[styles.hint, styles.center, { color: colors.mutedForeground }]}>
                    Message sent. Accept the request to keep chatting.
                  </Text>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Avatar({ profile, small }: { profile: LoveProfile; small?: boolean }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const style = small ? styles.avatarSmall : styles.avatar;
  if (profile.imageUrl && !failed) return <Image source={{ uri: profile.imageUrl }} style={style} onError={() => setFailed(true)} />;
  return (
    <View style={[style, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.initials, { color: colors.primary }]}>{profile.username.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  kind,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  kind: "primary" | "secondary" | "danger";
  onPress: () => void;
}) {
  const colors = useColors();
  const tone =
    kind === "primary"
      ? { background: colors.primary, border: colors.primary, text: "#FFFFFF" }
      : kind === "danger"
        ? { background: colors.secondary, border: colors.border, text: colors.destructive }
        : { background: colors.secondary, border: colors.border, text: colors.foreground };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: tone.background, borderColor: tone.border, opacity: pressed ? 0.8 : 1 }]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={15} color={tone.text} />
      <Text style={[styles.actionText, { color: tone.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segments: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, marginBottom: 14 },
  segment: { flex: 1, minHeight: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 11, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 58, height: 58, borderRadius: 16, backgroundColor: "#E5E7EB" },
  avatarSmall: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E5E7EB" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  copy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 5 },
  status: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 6 },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  busy: { minHeight: 40 },
  empty: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 14 },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { width: "100%", maxWidth: 560, alignSelf: "center", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  theirs: { alignSelf: "flex-start", borderWidth: 1 },
  mine: { alignSelf: "flex-end" },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  input: { minHeight: 80, maxHeight: 140, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 10, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  inputFoot: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: -4 },
  hint: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  center: { textAlign: "center", paddingVertical: 8 },
  sendButton: { minHeight: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  sendText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
