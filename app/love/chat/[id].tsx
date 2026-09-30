import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useLoveProfiles } from "@/context/LoveProfilesContext";
import { useColors } from "@/hooks/useColors";

interface DemoMessage {
  id: string;
  text: string;
  time: string;
  own: boolean;
  giftAmount?: number;
}

const GIFT_AMOUNTS = [5, 10, 25, 50];

export default function LoveChatScreen() {
  const { id, gift } = useLocalSearchParams<{ id: string; gift?: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getProfileById } = useLoveProfiles();
  const { tokenBalance, sendGift, recordMessage } = useFindLoveDemo();
  const profile = getProfileById(id ?? "");
  const [composer, setComposer] = useState("");
  const [giftOpen, setGiftOpen] = useState(gift === "1");
  const [selectedGift, setSelectedGift] = useState(10);
  const [messages, setMessages] = useState<DemoMessage[]>(() => [
    { id: "message-1", text: `Hey! Great to connect here. Are you going to any events this weekend?`, time: "10:24", own: false },
    { id: "message-2", text: "I was thinking about the Kigali Jazz Night. It looks like a good one.", time: "10:27", own: true },
    { id: "message-3", text: "Same! I have been meaning to check it out. We should say hi there.", time: "10:29", own: false },
  ]);

  const canSend = composer.trim().length > 0;
  const giftAffordable = tokenBalance >= selectedGift;
  const subtitle = useMemo(() => profile ? `${profile.city} · Connected` : "Connection", [profile]);

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

  function sendMessage() {
    const text = composer.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: `message-${Date.now()}`, text, time: "Now", own: true }]);
    setComposer("");
    recordMessage(chatProfile);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function confirmGift() {
    if (!sendGift(chatProfile, selectedGift)) return;
    setMessages((current) => [
      ...current,
      {
        id: `gift-${Date.now()}`,
        text: `You sent ${selectedGift} gift tokens`,
        time: "Now",
        own: true,
        giftAmount: selectedGift,
      },
    ]);
    setGiftOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 9, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Image source={{ uri: profile.imageUrl }} style={styles.avatar} accessibilityLabel={`Profile photo of ${profile.name}`} />
        <View style={styles.headerCopy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}</Text>
            <View style={[styles.demoBadge, { backgroundColor: colors.glass }]}><Text style={[styles.demoText, { color: colors.primary }]}>DEMO</Text></View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <Pressable onPress={() => setGiftOpen(true)} style={[styles.headerGift, { backgroundColor: colors.glass }]} accessibilityRole="button" accessibilityLabel={`Send gift tokens to ${profile.name}`}>
          <Ionicons name="gift-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.verificationNote, { backgroundColor: colors.secondary }]}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
        <Text style={[styles.verificationText, { color: colors.mutedForeground }]}>Demo chat · Phone verification will be required in production</Text>
      </View>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.own ? styles.ownRow : styles.otherRow]}>
              <View style={[
                styles.bubble,
                item.own
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                item.giftAmount ? styles.giftBubble : null,
              ]}>
                {item.giftAmount ? <Ionicons name="gift" size={24} color="#FFFFFF" /> : null}
                <Text style={[styles.messageText, { color: item.own ? "#FFFFFF" : colors.foreground }]}>{item.text}</Text>
                <Text style={[styles.messageTime, { color: item.own ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{item.time}</Text>
              </View>
            </View>
          )}
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable onPress={() => setGiftOpen(true)} style={[styles.composerGift, { backgroundColor: colors.secondary }]} accessibilityRole="button" accessibilityLabel="Open gifts">
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
          </Pressable>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            placeholder={`Message ${profile.name}`}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            multiline
            maxLength={500}
            accessibilityLabel={`Message ${profile.name}`}
          />
          <Pressable onPress={sendMessage} disabled={!canSend} style={[styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.disabled }]} accessibilityRole="button" accessibilityLabel="Send message">
            <Ionicons name="arrow-up" size={21} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={giftOpen} transparent animationType="slide" onRequestClose={() => setGiftOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGiftOpen(false)} accessibilityLabel="Close gift picker" />
          <View style={[styles.giftSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetTitleRow}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Send a gift</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Show {profile.name} a little appreciation</Text>
              </View>
              <View style={[styles.sheetBalance, { backgroundColor: colors.glass }]}>
                <Ionicons name="sparkles" size={15} color={colors.primary} />
                <Text style={[styles.sheetBalanceText, { color: colors.primary }]}>{tokenBalance}</Text>
              </View>
            </View>
            <View style={styles.giftOptions}>
              {GIFT_AMOUNTS.map((amount) => {
                const selected = amount === selectedGift;
                return (
                  <Pressable key={amount} onPress={() => setSelectedGift(amount)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.giftOption, { backgroundColor: selected ? colors.glass : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                    <Ionicons name="gift" size={22} color={colors.primary} />
                    <Text style={[styles.giftAmount, { color: colors.foreground }]}>{amount}</Text>
                    <Text style={[styles.tokenLabel, { color: colors.mutedForeground }]}>tokens</Text>
                  </Pressable>
                );
              })}
            </View>
            {giftAffordable ? (
              <Pressable onPress={confirmGift} style={[styles.confirmGift, { backgroundColor: colors.primary }]} accessibilityRole="button">
                <Text style={styles.confirmGiftText}>Send {selectedGift} tokens</Text>
                <Ionicons name="heart" size={18} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable onPress={() => { setGiftOpen(false); router.push("/love/wallet" as any); }} style={[styles.confirmGift, { backgroundColor: colors.primary }]} accessibilityRole="button">
                <Text style={styles.confirmGiftText}>Get more tokens</Text>
                <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
              </Pressable>
            )}
            <Text style={[styles.giftNotice, { color: colors.mutedForeground }]}>Demo tokens have no cash value.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  headerButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#E5E7EB" },
  headerCopy: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  demoBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  demoText: { fontSize: 7, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerGift: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  verificationNote: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  verificationText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  keyboardView: { flex: 1 },
  messages: { flexGrow: 1, justifyContent: "flex-end", padding: 16, gap: 10 },
  messageRow: { width: "100%", flexDirection: "row" },
  ownRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 19, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  giftBubble: { minWidth: 190, alignItems: "center", paddingVertical: 16 },
  messageText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  messageTime: { fontSize: 8, fontFamily: "Inter_500Medium", alignSelf: "flex-end", marginTop: 5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  composerGift: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 43, maxHeight: 110, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  sendButton: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  giftSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sheetSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  sheetBalance: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13 },
  sheetBalanceText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  giftOptions: { flexDirection: "row", gap: 7, marginTop: 22 },
  giftOption: { flex: 1, minHeight: 105, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  giftAmount: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 5 },
  tokenLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  confirmGift: { minHeight: 55, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 },
  confirmGiftText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  giftNotice: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundTitle: { fontSize: 19, fontFamily: "Inter_700Bold", marginTop: 14 },
  goBack: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 18 },
});
