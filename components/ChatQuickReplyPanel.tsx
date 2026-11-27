import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useChatColors } from "@/hooks/useChatColors";
import { useQuickReplies } from "@/hooks/useQuickReplies";

export function ChatQuickReplyPanel({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (text: string) => void;
  onClose: () => void;
}) {
  const colors = useChatColors();
  const { replies, addReply, updateReply, removeReply } = useQuickReplies();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  if (!visible) return null;

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraft("");
  };
  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setAdding(false);
    setDraft(text);
  };
  const cancelEdit = () => {
    setAdding(false);
    setEditingId(null);
    setDraft("");
  };
  const saveDraft = () => {
    const text = draft.trim();
    if (!text) {
      cancelEdit();
      return;
    }
    if (editingId) updateReply(editingId, text);
    else addReply(text);
    cancelEdit();
  };
  const editing = adding || editingId !== null;

  return (
    <View
      accessibilityViewIsModal
      style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Quick replies</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close quick replies"
          style={styles.close}
        >
          <Ionicons name="close" size={23} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {editing ? (
        <View style={[styles.editRow, { borderColor: colors.border }]}>
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a quick reply…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.editInput, { color: colors.foreground }]}
          />
          <Pressable
            onPress={cancelEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.editAction}
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={saveDraft}
            accessibilityRole="button"
            accessibilityLabel="Save quick reply"
            style={styles.editAction}
          >
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
        {!editing ? (
          <Pressable
            onPress={startAdd}
            accessibilityRole="button"
            accessibilityLabel="Add a quick reply"
            style={[styles.row, { borderColor: colors.border }]}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.primary }]}>Add a quick reply</Text>
          </Pressable>
        ) : null}
        {replies.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Save a reply you send often, then tap it here to insert it instantly.
          </Text>
        ) : (
          replies.map((reply) => (
            <Pressable
              key={reply.id}
              onPress={() => onSelect(reply.text)}
              accessibilityRole="button"
              accessibilityLabel={`Insert quick reply: ${reply.text}`}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <Text numberOfLines={2} style={[styles.rowText, { color: colors.foreground }]}>
                {reply.text}
              </Text>
              <Pressable
                onPress={() => startEdit(reply.id, reply.text)}
                accessibilityRole="button"
                accessibilityLabel="Edit quick reply"
                style={styles.rowAction}
              >
                <Ionicons name="pencil-outline" size={17} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => removeReply(reply.id)}
                accessibilityRole="button"
                accessibilityLabel="Delete quick reply"
                style={styles.rowAction}
              >
                <Ionicons name="trash-outline" size={17} color={colors.destructive} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    maxHeight: 280,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    minHeight: 42,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  close: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  editRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  editInput: { flex: 1, fontSize: 14, maxHeight: 80, paddingVertical: 2 },
  editAction: { padding: 4 },
  list: { paddingHorizontal: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  rowText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_500Medium" },
  rowAction: { padding: 4 },
  empty: {
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
});
