import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

const MAX_OPTIONS = 12;
const MIN_OPTIONS = 2;

export default function CreatePollScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const trimmedOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options],
  );
  const uniqueCount = useMemo(
    () => new Set(trimmedOptions.map((option) => option.toLowerCase())).size,
    [trimmedOptions],
  );
  const canSubmit =
    question.trim().length > 0 &&
    trimmedOptions.length >= MIN_OPTIONS &&
    uniqueCount === trimmedOptions.length &&
    !busy;

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");

  const updateOption = (index: number, value: string) => {
    setOptions((current) =>
      current.map((option, i) => (i === index ? value : option)),
    );
  };
  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((current) => [...current, ""]);
  };
  const removeOption = (index: number) => {
    setOptions((current) =>
      current.length > MIN_OPTIONS ? current.filter((_, i) => i !== index) : current,
    );
  };

  async function submit() {
    if (!conversationId || !canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await chat.createPoll(conversationId, question.trim(), trimmedOptions);
      router.dismissTo({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create this poll.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.workspace, { paddingTop: insets.top + 4 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.icon}
            >
              <Ionicons name="chevron-back" size={27} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Create a poll
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }}
          >
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Question</Text>
              <TextInput
                autoFocus
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask a question…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={300}
                style={[
                  styles.input,
                  styles.questionInput,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Options</Text>
              {options.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.mutedForeground}
                    maxLength={120}
                    style={[
                      styles.input,
                      { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                    ]}
                  />
                  {options.length > MIN_OPTIONS ? (
                    <Pressable
                      onPress={() => removeOption(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove option ${index + 1}`}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {options.length < MAX_OPTIONS ? (
                <Pressable
                  onPress={addOption}
                  accessibilityRole="button"
                  accessibilityLabel="Add an option"
                  style={styles.addOption}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.addOptionText, { color: colors.primary }]}>Add option</Text>
                </Pressable>
              ) : null}
              {uniqueCount !== trimmedOptions.length ? (
                <Text style={[styles.hint, { color: colors.destructive }]}>
                  Options must be unique.
                </Text>
              ) : null}
            </View>

            {error ? (
              <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <Pressable
            onPress={() => void submit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create poll"
            style={[
              styles.submit,
              { backgroundColor: canSubmit ? colors.primary : colors.border },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Create Poll</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 820 },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 19 },
  field: { gap: 8 },
  label: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  questionInput: { minHeight: 70, textAlignVertical: "top" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeBtn: { padding: 4 },
  addOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  submit: {
    margin: 16,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
