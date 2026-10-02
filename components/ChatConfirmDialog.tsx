import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useChatColors } from "@/hooks/useChatColors";

export function ChatConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const colors = useChatColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.foreground }]}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
            >
              {description}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={busy}
              style={styles.button}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              disabled={busy}
              style={styles.button}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: destructive ? colors.destructive : colors.primary },
                ]}
              >
                {busy ? "Please wait…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 22,
    elevation: 14,
    boxShadow: "0 10px 32px rgba(0,0,0,0.26)",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  description: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20,
  },
  button: {
    minHeight: 44,
    minWidth: 82,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
