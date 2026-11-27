import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ComponentRef, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { ChatListRow } from "@/components/ChatListRow";
import {
  ChatPopupMenu,
  type ChatMenuAnchor,
} from "@/components/ChatPopupMenu";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import type { ChatContact, ChatConversation } from "@/services/chatService";

export default function ChatScreen() {
  const colors = useChatColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const chat = useChat();
  const menuButton = useRef<ComponentRef<typeof View>>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [options, setOptions] = useState<ChatConversation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatConversation | null>(
    null,
  );
  const [about, setAbout] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ChatMenuAnchor>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Group creation & joining state
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchGroupQuery, setSearchGroupQuery] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupModalError, setGroupModalError] = useState<string | null>(null);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<string | null>(null);

  const availableContacts = useMemo(
    () => chat.contacts.filter((c) => !c.blocked && !c.isGroup && !c.id.startsWith("group:")),
    [chat.contacts],
  );

  const discoverableGroups = useMemo(
    () => [
      {
        id: "chelsea-fc-rwanda",
        name: "Chelsea FC Rwanda Fans",
        icon: "football",
        desc: "1,420 members · Premier League matchday meetups & debates",
        category: "Sports",
        requiresApproval: false,
      },
      {
        id: "chelsea-worldwide",
        name: "Chelsea Blues Worldwide",
        icon: "football",
        desc: "3,890 members · Global fan club & live match chats",
        category: "Sports",
        requiresApproval: true,
      },
      {
        id: "arsenal-supporters-kgl",
        name: "Arsenal Supporters Kigali",
        icon: "football",
        desc: "980 members · Match screenings at BK Arena lounge",
        category: "Sports",
        requiresApproval: false,
      },
      {
        id: "eventis-fiesta-2026",
        name: "Eventis Fiesta 2026",
        icon: "sparkles",
        desc: "2,150 members · Official Festival announcements & afterparties",
        category: "Events",
        requiresApproval: false,
      },
      {
        id: "bk-arena-fans",
        name: "BK Arena Fans Club",
        icon: "basketball",
        desc: "840 members · Basketball, Concerts & Ticket drops",
        category: "Entertainment",
        requiresApproval: false,
      },
      {
        id: "kigali-nightlife-vip",
        name: "Kigali Nightlife VIP",
        icon: "moon",
        desc: "612 members · Weekend DJ sets, lounges & guestlists",
        category: "Nightlife",
        requiresApproval: true,
      },
      {
        id: "kigali-tech-devs",
        name: "Kigali Tech & Developers",
        icon: "code-slash",
        desc: "560 members · Hackathons, Startups & AI meetups",
        category: "Tech",
        requiresApproval: false,
      },
    ],
    [],
  );

  const filteredGroups = useMemo(() => {
    const q = searchGroupQuery.trim().toLowerCase();
    if (!q) return discoverableGroups;
    return discoverableGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.desc.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q),
    );
  }, [discoverableGroups, searchGroupQuery]);

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      setGroupModalError("Please enter a group name.");
      return;
    }
    setGroupBusy(true);
    setGroupModalError(null);
    try {
      const convo = await chat.createGroup(groupTitle.trim(), selectedMembers);
      setCreateGroupOpen(false);
      setGroupTitle("");
      setSelectedMembers([]);
      router.navigate({
        pathname: "/chat/[id]",
        params: { id: convo.id },
      });
    } catch (err) {
      setGroupModalError(err instanceof Error ? err.message : "Could not create group.");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleJoinGroup = async (groupNameOrId?: string, requiresApproval = false) => {
    const target = (groupNameOrId ?? searchGroupQuery).trim();
    if (!target) {
      setGroupModalError("Please enter or select a group to join.");
      return;
    }
    setGroupBusy(true);
    setGroupModalError(null);
    if (requiresApproval) {
      setJoinSuccessNotice(`Admin approved your request! Joining ${target}...`);
      await new Promise((res) => setTimeout(res, 600));
    }
    try {
      const convo = await chat.joinGroup(target);
      setJoinGroupOpen(false);
      setSearchGroupQuery("");
      setJoinSuccessNotice(null);
      router.navigate({
        pathname: "/chat/[id]",
        params: { id: convo.id },
      });
    } catch (err) {
      setGroupModalError(err instanceof Error ? err.message : "Could not join group.");
      setJoinSuccessNotice(null);
    } finally {
      setGroupBusy(false);
    }
  };

  const toggleMemberSelection = (contactId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const totalUnread = useMemo(
    () => chat.conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
    [chat.conversations],
  );

  // Real data: only include contacts who are genuinely online and not blocked
  const activeContacts = useMemo(() => {
    const list: ChatContact[] = [];
    const seen = new Set<string>();

    for (const c of chat.contacts) {
      if (c.isOnline && !c.blocked && !seen.has(c.id)) {
        seen.add(c.id);
        list.push(c);
      }
    }

    for (const conv of chat.conversations) {
      const c = chat.getContact(conv.contactId);
      if (c && c.isOnline && !c.blocked && !seen.has(c.id)) {
        seen.add(c.id);
        list.push(c);
      }
    }

    return list;
  }, [chat.contacts, chat.conversations, chat.getContact]);

  const syncContacts = async () => {
    if (syncing) return;
    setSyncing(true);
    setActionError(null);
    setSyncNotice(null);
    try {
      const count = await chat.syncDeviceContacts();
      setSyncNotice(
        count
          ? `Found ${count} phone contact${count === 1 ? "" : "s"}.`
          : "Your phone contacts are already up to date.",
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Contacts could not be synced.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Please try again.",
      );
    }
  };

  const conversations = chat.conversations.filter(
    (item) => !unreadOnly || item.unreadCount > 0,
  );
  const search = () => router.push("/chat/search");
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");
  const openMenu = () => {
    if (!menuButton.current) {
      setAbout(true);
      return;
    }
    menuButton.current.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setAbout(true);
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.workspace}>
        {/* Unified Social Media Navigation Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 6,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.topNavRow}>
            <View style={styles.navLeft}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to Eventis"
                onPress={back}
                style={styles.backBtn}
                hitSlop={8}
              >
                <Ionicons
                  name="chevron-back"
                  size={26}
                  color={colors.foreground}
                />
              </Pressable>
              <View style={styles.titleWrap}>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  Messages
                </Text>
                {totalUnread > 0 ? (
                  <View style={[styles.unreadCountBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadCountBadgeText}>{totalUnread}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.navRight}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New chat or group"
                onPress={() => setActionSheetOpen(true)}
                style={[styles.headerIconBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="add" size={24} color={colors.foreground} />
              </Pressable>
              <Pressable
                ref={menuButton}
                accessibilityRole="button"
                accessibilityLabel="Chat options"
                onPress={openMenu}
                style={[styles.headerIconBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.foreground}
                />
              </Pressable>
            </View>
          </View>

          {/* Integrated Search Bar sharing the page */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search contacts and messages"
            onPress={search}
            style={[
              styles.search,
              {
                backgroundColor: colors.secondary,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <Text
              numberOfLines={1}
              style={[styles.searchText, { color: colors.mutedForeground }]}
            >
              Search chats or people...
            </Text>
          </Pressable>

          {/* Filter Chips Bar */}
          <View style={styles.filters}>
            {[false, true].map((unread) => {
              const selected = unreadOnly === unread;
              return (
                <Pressable
                  key={String(unread)}
                  onPress={() => setUnreadOnly(unread)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selected ? "#FFFFFF" : colors.mutedForeground,
                        fontFamily: selected ? "Inter_700Bold" : "Inter_500Medium",
                      },
                    ]}
                  >
                    {unread ? `Unread (${totalUnread})` : "All"}
                  </Text>
                </Pressable>
              );
            })}
            {chat.isDemoMode ? (
              <Text style={[styles.demoLabel, { color: colors.mutedForeground }]}>
                Local demo
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sync phone contacts"
                disabled={syncing}
                onPress={() => void syncContacts()}
                style={[
                  styles.chip,
                  { backgroundColor: colors.secondary, marginLeft: "auto" },
                ]}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="sync-outline" size={14} color={colors.primary} />
                )}
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  Sync
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {syncNotice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.notice, { color: colors.mutedForeground }]}
          >
            {syncNotice}
          </Text>
        ) : null}
        {actionError || chat.error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading chats"
            onPress={() => void run(chat.refresh)}
            style={styles.notice}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive }}
            >
              {actionError ?? chat.error} Tap to retry.
            </Text>
          </Pressable>
        ) : null}

        {chat.isLoading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: 4,
              paddingBottom: insets.bottom + 92,
              flexGrow: 1,
            }}
            renderItem={({ item }) => {
              const contact = chat.getContact(item.contactId);
              if (!contact) return null;
              return (
                <ChatListRow
                  contact={contact}
                  subtitle={item.lastMessage || "Start a conversation"}
                  lastMessageStatus={item.lastMessageStatus}
                  time={item.lastMessageAt}
                  unreadCount={item.unreadCount}
                  muted={item.muted}
                  onPress={() =>
                    router.navigate({
                      pathname: "/chat/[id]",
                      params: { id: item.id },
                    })
                  }
                  onLongPress={() => setOptions(item)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name={
                    unreadOnly
                      ? "checkmark-done-outline"
                      : "chatbubbles-outline"
                  }
                  size={44}
                  color={colors.primary}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {unreadOnly ? "You're all caught up" : "Start a conversation"}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  {unreadOnly
                    ? "Your unread chats will appear here."
                    : "Find a contact and say hello."}
                </Text>
                <Pressable
                  onPress={search}
                  accessibilityRole="button"
                  style={styles.notice}
                >
                  <Text style={{ color: colors.primary }}>Find a contact</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
      {/* Floating Action Button for Starting Chat or Group */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start chat, group, or join"
        onPress={() => setActionSheetOpen(true)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 20,
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Start Chat / Group Action Sheet Bottom Sheet */}
      <Modal
        visible={actionSheetOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActionSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActionSheetOpen(false)}
            accessibilityLabel="Dismiss actions"
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Start a Conversation
            </Text>

            {/* Active / Online users row inside the bottom sheet */}
            {activeContacts.length > 0 ? (
              <View style={styles.sheetActiveSection}>
                <View style={styles.sheetActiveHeader}>
                  <View style={styles.sheetOnlineDot} />
                  <Text style={[styles.sheetActiveTitle, { color: colors.mutedForeground }]}>
                    Active Now ({activeContacts.length})
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sheetActiveScroll}
                >
                  {activeContacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      style={styles.sheetActiveItem}
                      onPress={() => {
                        setActionSheetOpen(false);
                        void chat.startConversation(contact.id).then((convo) => {
                          router.navigate({
                            pathname: "/chat/[id]",
                            params: { id: convo.id },
                          });
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Chat with ${contact.name}`}
                    >
                      <View style={styles.activeAvatarBox}>
                        {contact.avatarUrl ? (
                          <Image
                            source={{ uri: contact.avatarUrl }}
                            style={styles.activeAvatarImg}
                          />
                        ) : (
                          <View
                            style={[
                              styles.activeAvatarImg,
                              styles.activeAvatarFallback,
                              { backgroundColor: colors.secondary },
                            ]}
                          >
                            <Ionicons name="person" size={19} color={colors.mutedForeground} />
                          </View>
                        )}
                        <View
                          style={[
                            styles.activeOnlineDot,
                            { backgroundColor: "#22C55E", borderColor: colors.card },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.activeContactName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {contact.name.split(" ")[0]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New direct message"
              onPress={() => {
                setActionSheetOpen(false);
                search();
              }}
              style={[styles.actionOption, { borderBottomColor: colors.border }]}
            >
              <View
                style={[
                  styles.actionOptionIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>
                  New Direct Message
                </Text>
                <Text
                  style={[styles.actionOptionDesc, { color: colors.mutedForeground }]}
                >
                  Chat with one person privately
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a new group"
              onPress={() => {
                setActionSheetOpen(false);
                setGroupTitle("");
                setSelectedMembers([]);
                setGroupModalError(null);
                setCreateGroupOpen(true);
              }}
              style={[styles.actionOption, { borderBottomColor: colors.border }]}
            >
              <View
                style={[
                  styles.actionOptionIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons name="people-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>
                  New Group Chat
                </Text>
                <Text
                  style={[styles.actionOptionDesc, { color: colors.mutedForeground }]}
                >
                  Create a group and add friends
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Explore and join groups"
              onPress={() => {
                setActionSheetOpen(false);
                setSearchGroupQuery("");
                setGroupModalError(null);
                setJoinSuccessNotice(null);
                setJoinGroupOpen(true);
              }}
              style={[styles.actionOption, { borderBottomColor: "transparent" }]}
            >
              <View
                style={[
                  styles.actionOptionIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons name="compass-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>
                  Explore & Join Groups
                </Text>
                <Text
                  style={[styles.actionOptionDesc, { color: colors.mutedForeground }]}
                >
                  Search group name (e.g. Chelsea, Arsenal, Fiesta)
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setActionSheetOpen(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        visible={createGroupOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setCreateGroupOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: "90%" }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Create Group
            </Text>

            <TextInput
              value={groupTitle}
              onChangeText={setGroupTitle}
              placeholder="Group name (e.g. Kigali Nightlife, Tech Fest)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              autoFocus
            />

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.mutedForeground }]}>
                Add Members ({selectedMembers.length} selected)
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 240, marginVertical: 6 }}
              showsVerticalScrollIndicator={false}
            >
              {availableContacts.length === 0 ? (
                <Text style={[styles.emptyPrompt, { color: colors.mutedForeground }]}>
                  No contacts available to add.
                </Text>
              ) : (
                availableContacts.map((contact) => {
                  const isSelected = selectedMembers.includes(contact.id);
                  return (
                    <Pressable
                      key={contact.id}
                      onPress={() => toggleMemberSelection(contact.id)}
                      style={[
                        styles.contactRowSelect,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.contactSelectAvatarBox}>
                        {contact.avatarUrl ? (
                          <Image
                            source={{ uri: contact.avatarUrl }}
                            style={styles.contactSelectAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.contactSelectAvatar,
                              { backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
                            ]}
                          >
                            <Ionicons name="person" size={16} color={colors.mutedForeground} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.contactSelectName,
                          { color: colors.foreground, flex: 1 },
                        ]}
                      >
                        {contact.name}
                      </Text>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? colors.primary : colors.mutedForeground,
                            backgroundColor: isSelected ? colors.primary : "transparent",
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {groupModalError ? (
              <Text style={[styles.modalErrorText, { color: colors.destructive }]}>
                {groupModalError}
              </Text>
            ) : null}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setCreateGroupOpen(false)}
                disabled={groupBusy}
                style={[styles.modalActionBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateGroup}
                disabled={groupBusy}
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
              >
                {groupBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                    Create Group
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Explore & Search Groups Modal */}
      <Modal
        visible={joinGroupOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setJoinGroupOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: "90%" }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Explore & Join Groups
            </Text>
            <Text style={[styles.modalSubDesc, { color: colors.mutedForeground }]}>
              Search for groups by name, team, or event and join directly.
            </Text>

            <View
              style={[
                styles.modalSearchBox,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                value={searchGroupQuery}
                onChangeText={setSearchGroupQuery}
                placeholder="Search group name (e.g. Chelsea, Arsenal, Tech)..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.modalSearchInput, { color: colors.foreground }]}
                autoFocus
              />
              {searchGroupQuery ? (
                <Pressable onPress={() => setSearchGroupQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            {joinSuccessNotice ? (
              <View style={[styles.noticeBadge, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={{ color: "#166534", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
                  {joinSuccessNotice}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.sectionHeading, { color: colors.mutedForeground, marginTop: 10, marginBottom: 8 }]}>
              {searchGroupQuery.trim()
                ? `Results for "${searchGroupQuery.trim()}" (${filteredGroups.length})`
                : "Discover Popular Groups"}
            </Text>

            <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
              {filteredGroups.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    No group matching "{searchGroupQuery}"
                  </Text>
                  <Pressable
                    onPress={() => void handleJoinGroup(searchGroupQuery.trim())}
                    style={[styles.createAndJoinBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Create & Join "{searchGroupQuery.trim()}"
                    </Text>
                  </Pressable>
                </View>
              ) : (
                filteredGroups.map((group) => (
                  <View
                    key={group.id}
                    style={[styles.featuredGroupCard, { backgroundColor: colors.secondary }]}
                  >
                    <View style={[styles.featuredGroupIcon, { backgroundColor: colors.primary }]}>
                      <Ionicons name={group.icon as any} size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featuredGroupName, { color: colors.foreground }]}>
                        {group.name}
                      </Text>
                      <Text style={[styles.featuredGroupDesc, { color: colors.mutedForeground }]}>
                        {group.desc}
                      </Text>
                      <View style={styles.groupBadgeRow}>
                        <View
                          style={[
                            styles.groupBadge,
                            {
                              backgroundColor: group.requiresApproval
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(34, 197, 94, 0.15)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.groupBadgeText,
                              {
                                color: group.requiresApproval
                                  ? "#D97706"
                                  : "#16A34A",
                              },
                            ]}
                          >
                            {group.requiresApproval
                              ? "Admin Approval"
                              : "Instant Join"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Join ${group.name}`}
                      onPress={() => void handleJoinGroup(group.name, group.requiresApproval)}
                      disabled={groupBusy}
                      style={[styles.joinPillBtn, { backgroundColor: colors.primary }]}
                    >
                      {groupBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.joinPillBtnText}>Join</Text>
                      )}
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            {groupModalError ? (
              <Text style={[styles.modalErrorText, { color: colors.destructive }]}>
                {groupModalError}
              </Text>
            ) : null}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setJoinGroupOpen(false)}
                disabled={groupBusy}
                style={[styles.modalActionBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ChatPopupMenu
        visible={about}
        anchor={menuAnchor}
        align="right"
        actions={[
          { label: "New chat", icon: "chatbubble-outline", onPress: search },
          { label: "Search", icon: "search-outline", onPress: search },
        ]}
        onClose={() => setAbout(false)}
      />
      <ChatPopupMenu
        visible={Boolean(options)}
        actions={
          options
            ? [
                {
                  label: options.muted ? "Unmute" : "Mute",
                  icon: "notifications-off-outline",
                  onPress: () =>
                    void run(() => chat.setMuted(options.id, !options.muted)),
                },
                ...(chat.isDemoMode
                  ? [
                      {
                        label: "Receive a demo message",
                        icon: "flask-outline" as const,
                        onPress: () =>
                          void run(() => chat.simulateIncoming(options.id)),
                      },
                    ]
                  : []),
                {
                  label: "Delete conversation",
                  icon: "trash-outline",
                  destructive: true,
                  onPress: () => setConfirmDelete(options),
                },
              ]
            : []
        }
        onClose={() => setOptions(null)}
      />
      <ChatConfirmDialog
        visible={Boolean(confirmDelete)}
        title="Delete conversation?"
        description="This removes the chat and messages from this device. You can still start a new conversation with this contact."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const selected = confirmDelete;
          setConfirmDelete(null);
          if (selected)
            void run(() => chat.clearConversation(selected.id, true));
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    paddingBottom: 6,
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  unreadCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    height: 42,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14 },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 32,
    justifyContent: "center",
    borderRadius: 16,
  },
  chipText: { fontSize: 13 },
  demoLabel: { marginLeft: "auto", fontSize: 11 },
  notice: { padding: 16 },
  loading: { marginTop: 50 },
  activeTray: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  activeTrayHeading: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeTrayScroll: {
    paddingHorizontal: 12,
    gap: 12,
  },
  activeContactItem: {
    alignItems: "center",
    width: 58,
    gap: 5,
  },
  activeAvatarBox: {
    position: "relative",
  },
  activeAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activeAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  activeContactName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    textAlign: "center",
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,150,150,0.4)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  sheetActiveSection: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.18)",
    marginBottom: 8,
  },
  sheetActiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sheetOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  sheetActiveTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sheetActiveScroll: {
    gap: 12,
    paddingHorizontal: 2,
  },
  sheetActiveItem: {
    alignItems: "center",
    width: 58,
    gap: 4,
  },
  modalSubDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
    lineHeight: 18,
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionOptionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  actionOptionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    borderWidth: 1,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    marginTop: 6,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyPrompt: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 16,
    textAlign: "center",
  },
  contactRowSelect: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactSelectAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  contactSelectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  contactSelectName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalErrorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    marginBottom: 2,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredGroupCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  featuredGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredGroupName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  featuredGroupDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  modalSearchBox: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    minHeight: 40,
  },
  noticeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 4,
  },
  groupBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  groupBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  groupBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  joinPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  joinPillBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  createAndJoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
