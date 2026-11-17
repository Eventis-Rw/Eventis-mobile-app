import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MembershipBadge } from "@/components/love/MembershipBadge";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useLoveProfilesState } from "@/context/LoveProfilesContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { LOVE_REQUEST_MESSAGE_MAX } from "@/utils/findLoveConnections";
import { canConnect, cheapestPlan, formatMembershipPrice } from "@/utils/findLoveMembership";

/** Explains that connecting with a Private member needs a Private membership. */
export function UpgradePrompt({
  username,
  onUpgrade,
  onClose,
}: {
  /** The Private member the viewer tried to connect with; null hides the prompt. */
  username: string | null;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  return (
    <Modal visible={!!username} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
        <Pressable
          accessibilityViewIsModal
          onPress={() => undefined}
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.iconWrap}>
            <Ionicons name="diamond" size={28} color="#D4A017" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
            Private membership needed
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.text, { color: colors.mutedForeground }]}>{username} has a</Text>
            <MembershipBadge type="private" size="sm" />
            <Text style={[styles.text, { color: colors.mutedForeground }]}>account.</Text>
          </View>
          <Text style={[styles.text, styles.center, { color: colors.mutedForeground }]}>
            Only Private members can send connection requests to Private members. Upgrade from{" "}
            {formatMembershipPrice(cheapestPlan("private").price)} / {cheapestPlan("private").periodLabel} (weekly, monthly or
            yearly) to connect with anyone.
          </Text>
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Upgrade to Private</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Asks for an optional note before a connection request is sent. The note is
 * the sender's one message before the other member answers.
 */
export function ConnectNoteSheet({
  profile,
  onSend,
  onClose,
}: {
  /** The member to connect with; null hides the sheet. */
  profile: LoveProfile | null;
  /** Sends the request; resolves true when it was sent. */
  onSend: (note: string | undefined) => Promise<boolean>;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const close = () => {
    if (sending) return;
    setNote("");
    onClose();
  };

  const send = async () => {
    if (sending) return;
    setSending(true);
    const sent = await onSend(note.trim() || undefined);
    setSending(false);
    if (sent) setNote("");
  };

  return (
    <Modal visible={!!profile} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={close} accessibilityLabel="Close" accessibilityRole="button">
          <Pressable
            accessibilityViewIsModal
            onPress={() => undefined}
            style={[styles.sheet, styles.noteSheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}
          >
            <View style={[styles.handle, styles.noteHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
              Connect with {profile?.username}
            </Text>
            <Text style={[styles.text, styles.center, { color: colors.mutedForeground }]}>
              Add a note so they know why you&apos;re reaching out. It&apos;s optional, and it&apos;s the one message you can
              send before they answer.
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={`Say hi to ${profile?.username ?? "them"} (optional)`}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              multiline
              maxLength={LOVE_REQUEST_MESSAGE_MAX}
              editable={!sending}
              accessibilityLabel={`Note to ${profile?.username ?? "this member"}, optional`}
            />
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>
              {note.length}/{LOVE_REQUEST_MESSAGE_MAX}
            </Text>
            <Pressable
              onPress={() => void send()}
              disabled={sending}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed || sending ? 0.85 : 1 }]}
              accessibilityRole="button"
              accessibilityState={{ busy: sending, disabled: sending }}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>{note.trim() ? "Send request with note" : "Send request"}</Text>
              )}
            </Pressable>
            <Pressable onPress={close} disabled={sending} style={styles.secondary} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Connect with membership rules applied: a Public member trying to reach a
 * Private one gets the upgrade prompt instead of a request. The server checks
 * again, and its "membership required" answer opens the same prompt.
 */
export function useLoveConnect() {
  const router = useRouter();
  const { accountType } = useMyLoveProfile();
  const { sendConnectionRequest, getConnectionStatus } = useLoveProfilesState();
  const [upgradeFor, setUpgradeFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<LoveProfile | null>(null);

  /** Resolves true when the request was sent (or accepted), false otherwise. */
  const connect = useCallback(
    async (profile: LoveProfile, message?: string): Promise<boolean> => {
      // Accepting someone who asked first needs no particular membership.
      const accepting = getConnectionStatus(profile.id) === "received";
      if (!accepting && !canConnect(accountType, profile.accountType).allowed) {
        if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setUpgradeFor(profile.username);
        return false;
      }
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await sendConnectionRequest(profile.id, message);
      if (result === "upgrade_required") setUpgradeFor(profile.username);
      return result === "sent";
    },
    [accountType, getConnectionStatus, sendConnectionRequest],
  );

  /**
   * The Connect button: asks for an optional note first, then sends the request.
   * Accepting someone who asked first, or a blocked membership, skips the note.
   */
  const connectWithNote = useCallback(
    async (profile: LoveProfile): Promise<void> => {
      const accepting = getConnectionStatus(profile.id) === "received";
      if (accepting || !canConnect(accountType, profile.accountType).allowed) {
        await connect(profile);
        return;
      }
      setNoteFor(profile);
    },
    [accountType, connect, getConnectionStatus],
  );

  const sendWithNote = useCallback(
    async (note: string | undefined) => {
      if (!noteFor) return false;
      const sent = await connect(noteFor, note);
      // Closes either way: on failure the screen shows the error behind it.
      setNoteFor(null);
      return sent;
    },
    [connect, noteFor],
  );

  const upgradePrompt = (
    <>
      <ConnectNoteSheet profile={noteFor} onSend={sendWithNote} onClose={() => setNoteFor(null)} />
      <UpgradePrompt
      username={upgradeFor}
      onClose={() => setUpgradeFor(null)}
      onUpgrade={() => {
        setUpgradeFor(null);
        router.push({ pathname: "/love/membership", params: { from: "upgrade" } } as any);
      }}
    />
    </>
  );

  return { connect, connectWithNote, upgradePrompt };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noteSheet: { alignItems: "stretch" },
  noteHandle: { alignSelf: "center" },
  input: {
    minHeight: 90,
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { width: "100%", maxWidth: 560, alignSelf: "center", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 22, paddingTop: 10, alignItems: "center", gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  iconWrap: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(212,160,23,0.16)" },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "center" },
  badgeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  text: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  center: { textAlign: "center" },
  primary: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondary: { minHeight: 44, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
