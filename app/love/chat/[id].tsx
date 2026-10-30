import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { VoiceNoteBubble } from "@/components/VoiceNoteBubble";
import { useFindLoveChat } from "@/context/FindLoveChatContext";
import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useConnectionActions } from "@/components/love/ConnectionRequests";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { useLoveConnect } from "@/components/love/UpgradePrompt";
import { useColors } from "@/hooks/useColors";
import { LOVE_REQUEST_MESSAGE_MAX, messagesLeft } from "@/utils/findLoveConnections";
import { formatChatDay, formatMessageTime, startsNewDay, type LoveChatContent, type LoveChatMessage } from "@/utils/findLoveChat";
import { presenceLabel } from "@/utils/findLoveDiscovery";

const NO_MESSAGES: LoveChatMessage[] = [];

/** Bigger files are refused until uploads go through the API. */
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordingTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function LoveChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { isLoading, getProfileById, getConnectionStatus } = useLoveProfiles();
  const { recordMessage, recordConnection } = useFindLoveDemo();
  const { threads, sendMessage: saveMessage, markRead } = useFindLoveChat();
  const { connect, upgradePrompt } = useLoveConnect();
  const { accept } = useConnectionActions();
  const profile = getProfileById(id ?? "");
  const status = profile ? getConnectionStatus(profile.id) : "none";
  const connected = status === "connected";
  const messages = (profile && threads[profile.id]?.messages) || NO_MESSAGES;
  // Before connecting, each side gets one message: with the request, or as a reply.
  const left = messagesLeft(status, profile ? threads[profile.id] : undefined);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recordingSession = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const listRef = useRef<FlatList<LoveChatMessage>>(null);

  const canSend = composer.trim().length > 0;
  const subtitle = useMemo(() => {
    if (!profile) return "Connection";
    if (status === "pending") return "Request sent · waiting for an answer";
    if (status === "received") return "Wants to connect with you";
    if (status === "none") return "Not connected yet";
    return presenceLabel(profile) ?? `${profile.city} · Connected`;
  }, [profile, status]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  // While the chat is open, anything that arrives counts as read.
  useEffect(() => {
    if (id) markRead(id);
  }, [id, messages, markRead]);

  // expo-audio releases the recorder itself; only put the audio mode back.
  useEffect(() => () => {
    if (recordingSession.current) void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, []);

  if (!profile && isLoading) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="chatbubble-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Conversation unavailable</Text>
        <Pressable onPress={() => router.back()}><Text style={[styles.goBack, { color: colors.primary }]}>Go back</Text></Pressable>
      </View>
    );
  }

  const chatProfile = profile;

  function append(content: LoveChatContent) {
    saveMessage(chatProfile.id, content);
    recordMessage(chatProfile);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function sendMessage() {
    const text = composer.trim();
    if (!text || sending) return;
    if (connected || status !== "none") {
      append({ kind: "text", text });
      setComposer("");
      return;
    }
    // No request yet: the message goes with a new connection request.
    setSending(true);
    const sent = await connect(chatProfile, text);
    setSending(false);
    if (!sent) return;
    append({ kind: "text", text });
    recordConnection("request", `Request sent to ${chatProfile.username}`, "Your message went with it. You'll be told when they answer.");
    setComposer("");
  }

  async function attachDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > MAX_DOCUMENT_BYTES) {
        setNotice(`Choose a file under ${formatBytes(MAX_DOCUMENT_BYTES)}.`);
        return;
      }
      append({ kind: "document", name: file.name, size: file.size });
    } catch {
      setNotice("We couldn't open your files. Please try again.");
    }
  }

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setNotice("Allow microphone access in your phone settings to record a voice note.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingSession.current = true;
      setRecording(true);
    } catch {
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setNotice("Voice recording could not start.");
    }
  }

  async function finishRecording(send: boolean) {
    if (!recording) return;
    const durationMs = recorderState.durationMillis;
    try {
      await recorder.stop();
      const uri = recorder.uri ?? recorderState.url;
      if (!send) return;
      if (durationMs < 500) {
        setNotice("Hold on a little longer to record a voice note.");
        return;
      }
      if (!uri) throw new Error("missing recording");
      append({ kind: "voice", uri, durationMs });
    } catch {
      setNotice("The voice note could not be saved.");
    } finally {
      setRecording(false);
      recordingSession.current = false;
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
  }

  // Calls need the calling service; the buttons are in place for when it ships.
  const startCall = (kind: "Voice" | "Video") => setNotice(`${kind} calls are coming soon.`);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 9, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Image source={{ uri: profile.imageUrl }} style={styles.avatar} accessibilityLabel={`Profile photo of ${profile.username}`} />
        <View style={styles.headerCopy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{profile.username}</Text>
            <MembershipBadge type={profile.accountType} size="sm" iconOnly />
            <View style={[styles.demoBadge, { backgroundColor: colors.glass }]}><Text style={[styles.demoText, { color: colors.primary }]}>DEMO</Text></View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        {connected ? (
        <>
        <Pressable onPress={() => startCall("Voice")} style={[styles.headerAction, { backgroundColor: colors.glass }]} accessibilityRole="button" accessibilityLabel={`Voice call ${profile.username}`}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => startCall("Video")} style={[styles.headerAction, { backgroundColor: colors.glass }]} accessibilityRole="button" accessibilityLabel={`Video call ${profile.username}`}>
          <Ionicons name="videocam-outline" size={21} color={colors.primary} />
        </Pressable>
        </>
        ) : null}
      </View>

      <View style={[styles.verificationNote, { backgroundColor: colors.secondary }]}>
        <Ionicons name={notice ? "information-circle-outline" : "shield-checkmark-outline"} size={15} color={notice ? colors.primary : colors.success} />
        <Text style={[styles.verificationText, { color: notice ? colors.foreground : colors.mutedForeground }]} accessibilityLiveRegion="polite">
          {notice ?? (connected ? "Demo chat · Phone verification will be required in production" : "You can send one message before you connect")}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          // Open on the latest message and follow new ones.
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={34} color={colors.primary} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
                {connected ? `Say hello to ${profile.username} 👋` : `Introduce yourself to ${profile.username}. Your message goes with your connection request.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            // Voice and file bubbles stay light so the pink play button and icons show on both sides.
            const plain = item.kind !== "text";
            const textColor = item.own && !plain ? "#FFFFFF" : colors.foreground;
            return (
              <>
              {startsNewDay(item, messages[index - 1]) ? (
                <View style={[styles.dayDivider, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.dayText, { color: colors.mutedForeground }]}>{formatChatDay(item.sentAt)}</Text>
                </View>
              ) : null}
              <View style={[styles.messageRow, item.own ? styles.ownRow : styles.otherRow]}>
                <View style={[
                  styles.bubble,
                  item.own && !plain
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: item.own ? colors.glass : colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}>
                  {item.kind === "text" ? (
                    <Text style={[styles.messageText, { color: textColor }]}>{item.text}</Text>
                  ) : item.kind === "voice" ? (
                    <VoiceNoteBubble uri={item.uri} durationMs={item.durationMs} />
                  ) : (
                    <View style={styles.documentRow} accessibilityLabel={`Document ${item.name}`}>
                      <View style={[styles.documentIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.documentCopy}>
                        <Text style={[styles.documentName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
                        {item.size ? <Text style={[styles.documentSize, { color: colors.mutedForeground }]}>{formatBytes(item.size)}</Text> : null}
                      </View>
                    </View>
                  )}
                  <Text style={[styles.messageTime, { color: item.own && !plain ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{formatMessageTime(item.sentAt)}</Text>
                </View>
              </View>
              </>
            );
          }}
        />

        {!connected ? (
          <View style={[styles.composer, styles.requestComposer, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
            {left > 0 ? (
              <View style={styles.requestRow}>
                <TextInput
                  value={composer}
                  onChangeText={setComposer}
                  placeholder={status === "received" ? `Reply to ${profile.username}` : `Write a message to ${profile.username}`}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  multiline
                  maxLength={LOVE_REQUEST_MESSAGE_MAX}
                  accessibilityLabel={`Message ${profile.username}`}
                />
                <Pressable
                  onPress={() => void sendMessage()}
                  disabled={!canSend || sending}
                  style={[styles.sendButton, { backgroundColor: colors.primary, opacity: canSend && !sending ? 1 : 0.5 }]}
                  accessibilityRole="button"
                  accessibilityLabel={status === "none" ? "Send message and connection request" : "Send message"}
                >
                  {sending ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="arrow-up" size={21} color="#FFFFFF" />}
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.requestText, { color: colors.mutedForeground }]}>
                {status === "received"
                  ? `Accept ${profile.username}'s request to keep chatting.`
                  : `Message sent. You can keep chatting once ${profile.username} accepts.`}
              </Text>
            )}
            {status === "received" ? (
              <Pressable
                onPress={() => void accept(chatProfile)}
                style={({ pressed }) => [styles.acceptButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.acceptText}>Accept request</Text>
              </Pressable>
            ) : null}
            {left > 0 ? (
              <Text style={[styles.requestHint, { color: colors.mutedForeground }]}>
                {composer.length}/{LOVE_REQUEST_MESSAGE_MAX} · one message until you're connected
              </Text>
            ) : null}
          </View>
        ) : recording ? (
          <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable onPress={() => void finishRecording(false)} style={[styles.composerSide, { backgroundColor: colors.secondary }]} accessibilityRole="button" accessibilityLabel="Cancel voice note">
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </Pressable>
            <View style={[styles.recordingStatus, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <View style={[styles.recordingDot, { backgroundColor: colors.destructive, opacity: Math.floor(recorderState.durationMillis / 500) % 2 ? 0.35 : 1 }]} />
              <Text style={[styles.recordingTime, { color: colors.foreground }]} accessibilityLiveRegion="polite">
                {formatRecordingTime(recorderState.durationMillis)}
              </Text>
              <Text style={[styles.recordingHint, { color: colors.mutedForeground }]}>Recording…</Text>
            </View>
            <Pressable onPress={() => void finishRecording(true)} style={[styles.sendButton, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Send voice note">
              <Ionicons name="arrow-up" size={21} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable onPress={() => void attachDocument()} style={[styles.composerSide, { backgroundColor: colors.secondary }]} accessibilityRole="button" accessibilityLabel="Attach a document">
              <Ionicons name="attach-outline" size={22} color={colors.primary} />
            </Pressable>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder={`Message ${profile.username}`}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              multiline
              maxLength={500}
              accessibilityLabel={`Message ${profile.username}`}
            />
            {canSend ? (
              <Pressable onPress={() => void sendMessage()} style={[styles.sendButton, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Send message">
                <Ionicons name="arrow-up" size={21} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable onPress={() => void startRecording()} style={[styles.sendButton, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Record a voice note">
                <Ionicons name="mic-outline" size={21} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
      {upgradePrompt}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  headerButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#E5E7EB" },
  headerCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  demoBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  demoText: { fontSize: 7, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerAction: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  verificationNote: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  verificationText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  keyboardView: { flex: 1 },
  messages: { flexGrow: 1, justifyContent: "flex-end", padding: 16, gap: 10 },
  messageRow: { width: "100%", flexDirection: "row" },
  dayDivider: { alignSelf: "center", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 4, marginVertical: 4 },
  dayText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  emptyChatText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  ownRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 19, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  messageText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  messageTime: { fontSize: 10, fontFamily: "Inter_500Medium", alignSelf: "flex-end", marginTop: 5 },
  documentRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
  documentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  documentCopy: { flexShrink: 1 },
  documentName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  documentSize: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  composerSide: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 43, maxHeight: 110, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  recordingStatus: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  recordingDot: { width: 9, height: 9, borderRadius: 5 },
  recordingTime: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  recordingHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  requestComposer: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  requestRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  requestText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 6 },
  requestHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  acceptButton: { minHeight: 46, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  acceptText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sendButton: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundTitle: { fontSize: 19, fontFamily: "Inter_700Bold", marginTop: 14 },
  notFoundText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  goBack: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 18 },
});
