import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChatActionSheet, type ChatAction } from "@/components/ChatActionSheet";
import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";
import {
  DEMO_SELF_ID,
  type ChatConversation,
  type ChatGroupMember,
} from "@/services/chatService";

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const { user } = useAuth();
  const yourUserId = chat.isDemoMode ? DEMO_SELF_ID : user?.id;

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [members, setMembers] = useState<ChatGroupMember[]>([]);
  const [requests, setRequests] = useState<ChatGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatGroupMember | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editRequiresApproval, setEditRequiresApproval] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const result = await chat.refreshGroup(id);
      setConversation(result.conversation);
      setMembers(result.members);
      const self = result.members.find((m) => m.userId === yourUserId);
      const isAdmin = self?.role === "OWNER" || self?.role === "ADMIN";
      if (isAdmin && result.conversation.requiresApproval) {
        setRequests(await chat.listJoinRequests(id));
      } else {
        setRequests([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this group.");
    } finally {
      setLoading(false);
    }
  }, [chat, id, yourUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/chat"));

  const self = members.find((m) => m.userId === yourUserId);
  const isOwner = self?.role === "OWNER";
  const isAdmin = isOwner || self?.role === "ADMIN";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const openEdit = () => {
    if (!conversation) return;
    setEditTitle(conversation.title ?? "");
    setEditDescription(conversation.description ?? "");
    setEditCategory(conversation.category ?? "");
    setEditIsPublic(conversation.isPublic ?? false);
    setEditRequiresApproval(conversation.requiresApproval ?? false);
    setEditError(null);
    setEditOpen(true);
  };

  async function saveEdit() {
    if (!id) return;
    setBusy(true);
    setEditError(null);
    try {
      await chat.updateGroupSettings(id, {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || null,
        category: editCategory.trim() || null,
        isPublic: editIsPublic,
        requiresApproval: editIsPublic ? editRequiresApproval : false,
      });
      setEditOpen(false);
      await load();
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : "Could not save group settings.");
    } finally {
      setBusy(false);
    }
  }

  async function changeAvatar() {
    if (!id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    await run(() => chat.updateGroupAvatar(id, result.assets[0].uri).then(() => undefined));
  }

  const memberActions = (member: ChatGroupMember): ChatAction[] => {
    if (member.userId === yourUserId) return [];
    const actions: ChatAction[] = [];
    if (isAdmin && member.role !== "OWNER") {
      if (member.role === "MEMBER") {
        actions.push({
          label: "Make admin",
          icon: "shield-checkmark-outline",
          onPress: () => void run(() => chat.setGroupMemberRole(id!, member.userId, "ADMIN")),
        });
      } else if (isOwner) {
        actions.push({
          label: "Remove admin",
          icon: "shield-outline",
          onPress: () => void run(() => chat.setGroupMemberRole(id!, member.userId, "MEMBER")),
        });
      }
    }
    if (isOwner && member.role !== "OWNER") {
      actions.push({
        label: "Make group owner",
        icon: "ribbon-outline",
        onPress: () => void run(() => chat.transferGroupOwnership(id!, member.userId)),
      });
    }
    if (isAdmin && (member.role === "MEMBER" || isOwner)) {
      actions.push({
        label: "Remove from group",
        icon: "person-remove-outline",
        destructive: true,
        onPress: () => void run(() => chat.removeGroupMember(id!, member.userId)),
      });
      actions.push({
        label: "Ban from group",
        icon: "ban-outline",
        destructive: true,
        onPress: () => void run(() => chat.setGroupMemberBan(id!, member.userId, true)),
      });
    }
    return actions;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>{error ?? "Group not found."}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={styles.icon}>
            <Ionicons name="chevron-back" size={27} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Group info</Text>
          {isAdmin ? (
            <Pressable onPress={openEdit} accessibilityRole="button" accessibilityLabel="Edit group" style={styles.icon}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.icon} />
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <View style={styles.profile}>
            <Pressable onPress={isAdmin ? () => void changeAvatar() : undefined} disabled={!isAdmin}>
              {conversation.avatarUrl ? (
                <Image source={{ uri: conversation.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="people" size={34} color={colors.mutedForeground} />
                </View>
              )}
              {isAdmin ? (
                <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>{conversation.title}</Text>
            {conversation.description ? (
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {conversation.description}
              </Text>
            ) : null}
            <View style={styles.badgeRow}>
              {conversation.category ? (
                <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.badgeText, { color: colors.foreground }]}>{conversation.category}</Text>
                </View>
              ) : null}
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.foreground }]}>
                  {conversation.isPublic ? "Public" : "Private"}
                </Text>
              </View>
              {conversation.requiresApproval ? (
                <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.badgeText, { color: colors.foreground }]}>Approval required</Text>
                </View>
              ) : null}
            </View>
            {conversation.inviteCode ? (
              <Text style={[styles.inviteCode, { color: colors.mutedForeground }]}>
                Invite code: {conversation.inviteCode}
              </Text>
            ) : null}
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          {requests.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                Pending requests ({requests.length})
              </Text>
              {requests.map((request) => (
                <View key={request.userId} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                  {request.avatarUrl ? (
                    <Image source={{ uri: request.avatarUrl }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="person" size={16} color={colors.mutedForeground} />
                    </View>
                  )}
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{request.name}</Text>
                  <Pressable
                    disabled={busy}
                    onPress={() => void run(() => chat.approveJoinRequest(id!, request.userId))}
                    style={[styles.pillBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.pillBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => void run(() => chat.rejectJoinRequest(id!, request.userId))}
                    style={[styles.pillBtn, { backgroundColor: colors.secondary }]}
                  >
                    <Text style={[styles.pillBtnText, { color: colors.foreground }]}>Reject</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {members.length} member{members.length === 1 ? "" : "s"}
            </Text>
            {members.map((member) => (
              <Pressable
                key={member.userId}
                onPress={() => setSelectedMember(member)}
                disabled={member.userId === yourUserId}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
              >
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="person" size={16} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={[styles.memberName, { color: colors.foreground }]}>
                  {member.userId === yourUserId ? "You" : member.name}
                </Text>
                {member.role !== "MEMBER" ? (
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {member.role === "OWNER" ? "Owner" : "Admin"}
                    </Text>
                  </View>
                ) : null}
                {member.userId !== yourUserId ? (
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.mutedForeground} />
                ) : null}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setConfirmLeave(true)}
            style={styles.leaveRow}
            accessibilityRole="button"
          >
            <Ionicons name="exit-outline" size={20} color={colors.destructive} />
            <Text style={[styles.leaveText, { color: colors.destructive }]}>Leave group</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ChatActionSheet
        visible={Boolean(selectedMember)}
        layout="list"
        title={selectedMember?.name}
        actions={selectedMember ? memberActions(selectedMember) : []}
        onClose={() => setSelectedMember(null)}
      />

      <ChatConfirmDialog
        visible={confirmLeave}
        title="Leave group?"
        description="You will need to be re-invited or re-request to join."
        confirmLabel="Leave"
        destructive
        busy={busy}
        onConfirm={() =>
          void run(() => chat.leaveGroup(id!).then(() => back()))
        }
        onClose={() => setConfirmLeave(false)}
      />

      {editOpen ? (
        <View style={[styles.editOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.editSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Edit group</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Group name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Category"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            />
            <View style={styles.switchRow}>
              <Text style={{ color: colors.foreground, flex: 1 }}>Public group</Text>
              <Switch value={editIsPublic} onValueChange={setEditIsPublic} />
            </View>
            {editIsPublic ? (
              <View style={styles.switchRow}>
                <Text style={{ color: colors.foreground, flex: 1 }}>Require approval to join</Text>
                <Switch value={editRequiresApproval} onValueChange={setEditRequiresApproval} />
              </View>
            ) : null}
            {editError ? <Text style={{ color: colors.destructive, fontSize: 12.5 }}>{editError}</Text> : null}
            <View style={styles.editActions}>
              <Pressable
                onPress={() => setEditOpen(false)}
                disabled={busy}
                style={[styles.modalActionBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveEdit()}
                disabled={busy}
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  profile: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20, gap: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 10, textAlign: "center" },
  description: { fontSize: 14, textAlign: "center" },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inviteCode: { fontSize: 12, marginTop: 8 },
  errorText: { fontSize: 13, textAlign: "center", paddingHorizontal: 20, paddingBottom: 8 },
  section: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 12.5, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", marginBottom: 6 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: { width: 38, height: 38, borderRadius: 19 },
  memberName: { flex: 1, fontSize: 14.5, fontFamily: "Inter_500Medium" },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginLeft: 6 },
  pillBtnText: { color: "#FFFFFF", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  leaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  leaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  editOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  editSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
