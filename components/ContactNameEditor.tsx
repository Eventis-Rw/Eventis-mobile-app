import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
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

import { useChatColors } from "@/hooks/useChatColors";
import type { ChatContact } from "@/services/chatService";

interface ContactNameEditorProps {
  contact: ChatContact | null;
  onClose: () => void;
  onSave: (contactId: string, name: string) => Promise<void>;
}

export function ContactNameEditor({
  contact,
  onClose,
  onSave,
}: ContactNameEditorProps) {
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(contact?.name ?? "");
    setError(null);
  }, [contact?.id, contact?.name]);

  async function save() {
    const nextName = name.trim();
    if (!contact || !nextName || saving) return;
    setSaving(true);
    try {
      await onSave(contact.id, nextName);
      onClose();
    } catch {
      setError("Could not save the name. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={Boolean(contact)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Close contact editor"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.titleRow}>
            <View style={[styles.icon, { backgroundColor: colors.glass }]}>
              <Ionicons
                name="person-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.titleCopy}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Contact name
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                This saved name appears everywhere in Chat.
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="pencil-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Contact name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoFocus
              selectTextOnFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              accessibilityLabel="Contact name"
            />
          </View>
          <Text style={[styles.phone, { color: colors.mutedForeground }]}>
            {contact?.phone}
          </Text>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive, marginTop: 8 }}
            >
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Text
                style={[styles.secondaryLabel, { color: colors.foreground }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void save()}
              disabled={!name.trim() || saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: !name.trim() || saving }}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: name.trim()
                    ? colors.primary
                    : colors.disabled,
                },
              ]}
            >
              <Text style={styles.primaryLabel}>
                {saving ? "Saving..." : "Save name"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 640,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCopy: { flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  inputWrap: {
    height: 50,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  phone: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 8,
    marginLeft: 4,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  primaryButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 },
});
