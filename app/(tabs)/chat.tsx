import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton } from "@/components/SkeletonLoader";
import { ContactNameEditor } from "@/components/ContactNameEditor";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import type { ChatContact, ChatConversation, PhoneLookupResult } from "@/services/chatService";

type ChatSection = "chats" | "people";

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { weekday: "short" });
}

function Avatar({ contact, size = 54 }: { contact: ChatContact; size?: number }) {
  const colors = useColors();
  return (
    <View>
      <Image source={{ uri: contact.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.secondary }} accessibilityLabel={`Profile photo of ${contact.name}`} />
      {contact.isOnline ? <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.background }]} /> : null}
    </View>
  );
}

function ActionButton({ label, icon, onPress, disabled = false }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={({ pressed }) => [styles.actionButton, { backgroundColor: disabled ? colors.secondary : colors.glass, opacity: pressed ? 0.72 : 1 }]}>
      <Ionicons name={icon} size={16} color={disabled ? colors.mutedForeground : colors.primary} />
      <Text style={[styles.actionLabel, { color: disabled ? colors.mutedForeground : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function ConversationRow({ conversation, contact, onPress }: { conversation: ChatConversation; contact: ChatContact; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open conversation with ${contact.name}`} style={({ pressed }) => [styles.conversationRow, { opacity: pressed ? 0.68 : 1 }]}>
      <Avatar contact={contact} size={58} />
      <View style={[styles.conversationCopy, { borderBottomColor: colors.border }]}>
        <View style={styles.rowTopLine}>
          <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>{contact.name}</Text>
          <Text style={[styles.time, { color: conversation.unreadCount ? colors.primary : colors.mutedForeground }]}>{formatConversationTime(conversation.lastMessageAt)}</Text>
        </View>
        <View style={styles.rowBottomLine}>
          <Text style={[styles.lastMessage, { color: conversation.unreadCount ? colors.foreground : colors.mutedForeground }, conversation.unreadCount ? styles.unreadMessage : null]} numberOfLines={1}>{conversation.lastMessage}</Text>
          {conversation.unreadCount > 0 ? <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}><Text style={styles.unreadCount}>{conversation.unreadCount}</Text></View> : null}
        </View>
      </View>
    </Pressable>
  );
}

function ContactRow({ contact, onMessage, onInvite, onEdit }: { contact: ChatContact; onMessage: (contact: ChatContact) => void; onInvite: (contact: ChatContact) => void; onEdit: (contact: ChatContact) => void }) {
  const colors = useColors();
  return (
    <View style={styles.contactRow}>
      <Avatar contact={contact} size={50} />
      <Pressable onPress={() => onEdit(contact)} accessibilityRole="button" accessibilityLabel={`Edit saved name for ${contact.name}`} style={styles.contactCopy}>
        <View style={styles.editableNameRow}><Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>{contact.name}</Text><Ionicons name="pencil-outline" size={12} color={colors.mutedForeground} /></View>
        <Text style={[styles.contactDetail, { color: colors.mutedForeground }]} numberOfLines={1}>{contact.headline}</Text>
      </Pressable>
      {contact.isEventisUser ? (
        <ActionButton label="Message" icon="chatbubble-ellipses-outline" onPress={() => onMessage(contact)} />
      ) : (
        <ActionButton label={contact.invited ? "Invited" : "Invite"} icon={contact.invited ? "checkmark" : "person-add-outline"} onPress={() => onInvite(contact)} disabled={contact.invited} />
      )}
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contacts, conversations, isLoading, error, refresh, getContact, startConversation, inviteContact, updateContactName, lookupPhone } = useChat();
  const [section, setSection] = useState<ChatSection>("chats");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupResult, setLookupResult] = useState<PhoneLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [editingContact, setEditingContact] = useState<ChatContact | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const contact = getContact(conversation.contactId);
    return !normalizedQuery || `${contact?.name ?? ""} ${conversation.lastMessage}`.toLowerCase().includes(normalizedQuery);
  }), [conversations, getContact, normalizedQuery]);
  const filteredContacts = useMemo(() => contacts.filter((contact) => !normalizedQuery || `${contact.name} ${contact.phone} ${contact.headline}`.toLowerCase().includes(normalizedQuery)), [contacts, normalizedQuery]);
  const eventisContacts = filteredContacts.filter((contact) => contact.isEventisUser);
  const inviteContacts = filteredContacts.filter((contact) => !contact.isEventisUser);

  const openConversation = useCallback((conversationId: string) => router.push({ pathname: "/chat/[id]", params: { id: conversationId } } as never), [router]);
  const messageContact = useCallback(async (contact: ChatContact) => {
    const conversation = await startConversation(contact.id);
    openConversation(conversation.id);
  }, [openConversation, startConversation]);
  const invite = useCallback(async (contact: ChatContact) => {
    await inviteContact(contact.id);
    if (lookupResult?.kind === "invite" && lookupResult.contact.id === contact.id) setLookupResult({ kind: "invite", contact: { ...contact, invited: true } });
  }, [inviteContact, lookupResult]);
  const findPhone = useCallback(async () => {
    if (phone.replace(/\D/g, "").length < 9) return;
    setIsLookingUp(true);
    setLookupResult(await lookupPhone(phone));
    setIsLookingUp(false);
  }, [lookupPhone, phone]);
  const saveContactName = useCallback(async (contactId: string, name: string) => {
    await updateContactName(contactId, name);
    setLookupResult((current) => {
      if (!current || current.kind === "not_found" || current.contact.id !== contactId) return current;
      return { ...current, contact: { ...current.contact, name } };
    });
  }, [updateContactName]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: (Platform.OS === "web" ? 52 : insets.top) + 14, paddingBottom: 120 }]}>
        <View style={styles.headingRow}>
          <View><Text style={[styles.title, { color: colors.foreground }]}>Chat</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Keep the connection going</Text></View>
          <View style={[styles.demoBadge, { backgroundColor: colors.glass }]}><View style={[styles.demoDot, { backgroundColor: colors.primary }]} /><Text style={[styles.demoBadgeText, { color: colors.primary }]}>DEMO</Text></View>
        </View>

        <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput value={query} onChangeText={setQuery} placeholder={section === "chats" ? "Search conversations" : "Search people or phone"} placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" accessibilityLabel="Search chat" />
          {query ? <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={20} color={colors.mutedForeground} /></Pressable> : null}
        </View>

        <View style={[styles.segment, { backgroundColor: colors.secondary }]}>
          {(["chats", "people"] as ChatSection[]).map((item) => {
            const selected = section === item;
            return <Pressable key={item} onPress={() => setSection(item)} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.segmentItem, selected ? { backgroundColor: colors.background } : null]}><Ionicons name={item === "chats" ? "chatbubbles-outline" : "people-outline"} size={17} color={selected ? colors.primary : colors.mutedForeground} /><Text style={[styles.segmentLabel, { color: selected ? colors.foreground : colors.mutedForeground }]}>{item === "chats" ? "Chats" : "People"}</Text></Pressable>;
          })}
        </View>

        {isLoading ? (
          <View style={styles.loadingList} accessibilityLabel="Loading chats">{[0, 1, 2, 3].map((item) => <View key={item} style={styles.loadingRow}><Skeleton width={56} height={56} borderRadius={28} /><View style={styles.loadingCopy}><Skeleton width="45%" height={16} /><Skeleton width="78%" height={13} style={styles.loadingGap} /></View></View>)}</View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="cloud-offline-outline" size={34} color={colors.mutedForeground} /><Text style={[styles.stateTitle, { color: colors.foreground }]}>Could not load chat</Text><Text style={[styles.stateText, { color: colors.mutedForeground }]}>{error}</Text><ActionButton label="Try again" icon="refresh" onPress={() => void refresh()} /></View>
        ) : section === "chats" ? (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent conversations</Text><Pressable onPress={() => setSection("people")} accessibilityRole="button"><Text style={[styles.newChat, { color: colors.primary }]}>New chat</Text></Pressable></View>
            {filteredConversations.length ? filteredConversations.map((conversation) => {
              const contact = getContact(conversation.contactId);
              return contact ? <ConversationRow key={conversation.id} conversation={conversation} contact={contact} onPress={() => openConversation(conversation.id)} /> : null;
            }) : <View style={styles.emptyState}><View style={[styles.emptyIcon, { backgroundColor: colors.glass }]}><Ionicons name="chatbubbles-outline" size={28} color={colors.primary} /></View><Text style={[styles.stateTitle, { color: colors.foreground }]}>No conversations found</Text><Text style={[styles.stateText, { color: colors.mutedForeground }]}>Start a chat with someone in your Eventis contacts.</Text><ActionButton label="Find people" icon="people-outline" onPress={() => setSection("people")} /></View>}
          </View>
        ) : (
          <View style={styles.listSection}>
            <View style={[styles.phoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.phoneTitleRow}><View style={[styles.phoneIcon, { backgroundColor: colors.glass }]}><Ionicons name="phone-portrait-outline" size={20} color={colors.primary} /></View><View style={styles.phoneHeadingCopy}><Text style={[styles.phoneTitle, { color: colors.foreground }]}>Find by phone number</Text><Text style={[styles.phoneHint, { color: colors.mutedForeground }]}>Try a demo number ending in 001, 005, or 999</Text></View></View>
              <View style={styles.phoneSearchRow}><TextInput value={phone} onChangeText={(value) => { setPhone(value); setLookupResult(null); }} onSubmitEditing={() => void findPhone()} placeholder="+250 700 100 001" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" returnKeyType="search" style={[styles.phoneInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]} accessibilityLabel="Phone number" /><Pressable onPress={() => void findPhone()} disabled={phone.replace(/\D/g, "").length < 9 || isLookingUp} accessibilityRole="button" accessibilityLabel="Find phone number" style={[styles.findButton, { backgroundColor: phone.replace(/\D/g, "").length >= 9 ? colors.primary : colors.disabled }]}><Text style={styles.findButtonText}>{isLookingUp ? "..." : "Find"}</Text></Pressable></View>
              {lookupResult?.kind === "not_found" ? (
                <View style={[styles.lookupNotice, { backgroundColor: colors.secondary }]}><Ionicons name="person-remove-outline" size={20} color={colors.mutedForeground} /><View style={styles.lookupCopy}><Text style={[styles.lookupTitle, { color: colors.foreground }]}>No user found</Text><Text style={[styles.lookupText, { color: colors.mutedForeground }]}>This number is not in your demo contacts.</Text></View></View>
              ) : lookupResult ? (
                <View style={[styles.lookupNotice, { backgroundColor: colors.secondary }]}><Avatar contact={lookupResult.contact} size={44} /><View style={styles.lookupCopy}><Text style={[styles.lookupTitle, { color: colors.foreground }]}>{lookupResult.contact.name}</Text><Text style={[styles.lookupText, { color: colors.mutedForeground }]}>{lookupResult.kind === "eventis" ? "On Eventis" : "Not on Eventis yet"}</Text></View>{lookupResult.kind === "eventis" ? <ActionButton label="Message" icon="chatbubble-outline" onPress={() => void messageContact(lookupResult.contact)} /> : <ActionButton label={lookupResult.contact.invited ? "Invited" : "Invite"} icon={lookupResult.contact.invited ? "checkmark" : "person-add-outline"} disabled={lookupResult.contact.invited} onPress={() => void invite(lookupResult.contact)} />}</View>
              ) : null}
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>On Eventis</Text>
            {eventisContacts.map((contact) => <ContactRow key={contact.id} contact={contact} onMessage={messageContact} onInvite={invite} onEdit={setEditingContact} />)}
            <Text style={[styles.sectionTitle, styles.inviteTitle, { color: colors.foreground }]}>Invite to Eventis</Text>
            {inviteContacts.length ? inviteContacts.map((contact) => <ContactRow key={contact.id} contact={contact} onMessage={messageContact} onInvite={invite} onEdit={setEditingContact} />) : <Text style={[styles.noContacts, { color: colors.mutedForeground }]}>No contacts match your search.</Text>}
          </View>
        )}
      </ScrollView>
      <ContactNameEditor
        contact={editingContact ? contacts.find((contact) => contact.id === editingContact.id) ?? editingContact : null}
        onClose={() => setEditingContact(null)}
        onSave={saveContactName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { paddingHorizontal: 18 }, headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Inter_800ExtraBold", fontSize: 31, letterSpacing: -1 }, subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  demoBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 }, demoDot: { width: 6, height: 6, borderRadius: 3 }, demoBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  search: { height: 48, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginTop: 22 }, searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 0 },
  segment: { flexDirection: "row", padding: 4, borderRadius: 15, marginTop: 12 }, segmentItem: { flex: 1, height: 39, borderRadius: 12, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, segmentLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  listSection: { marginTop: 22 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15 }, newChat: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  conversationRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 78 }, conversationCopy: { flex: 1, minHeight: 78, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: "center", gap: 7 }, rowTopLine: { flexDirection: "row", alignItems: "center", gap: 10 }, rowBottomLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  contactName: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 15 }, time: { fontFamily: "Inter_500Medium", fontSize: 10 }, lastMessage: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12 }, unreadMessage: { fontFamily: "Inter_600SemiBold" }, unreadBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center" }, unreadCount: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 },
  onlineDot: { position: "absolute", width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, right: 0, bottom: 1 }, loadingList: { marginTop: 22, gap: 20 }, loadingRow: { flexDirection: "row", alignItems: "center", gap: 13 }, loadingCopy: { flex: 1 }, loadingGap: { marginTop: 10 },
  stateCard: { marginTop: 24, padding: 24, borderWidth: 1, borderRadius: 20, alignItems: "center", gap: 10 }, emptyState: { alignItems: "center", paddingHorizontal: 26, paddingVertical: 50, gap: 10 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 }, stateTitle: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" }, stateText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center", marginBottom: 4 },
  actionButton: { height: 34, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10 }, actionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  phoneCard: { borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 24 }, phoneTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 }, phoneIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, phoneHeadingCopy: { flex: 1 }, phoneTitle: { fontFamily: "Inter_700Bold", fontSize: 14 }, phoneHint: { fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 2 },
  phoneSearchRow: { flexDirection: "row", gap: 8, marginTop: 14 }, phoneInput: { flex: 1, height: 44, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "Inter_500Medium", fontSize: 13 }, findButton: { width: 62, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }, findButtonText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 },
  lookupNotice: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 10, marginTop: 12 }, lookupCopy: { flex: 1 }, lookupTitle: { fontFamily: "Inter_700Bold", fontSize: 12 }, lookupText: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  contactRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 11 }, contactCopy: { flex: 1 }, editableNameRow: { flexDirection: "row", alignItems: "center", gap: 5 }, contactDetail: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 4 }, inviteTitle: { marginTop: 24, marginBottom: 4 }, noContacts: { fontFamily: "Inter_400Regular", fontSize: 12, paddingVertical: 20 },
});
