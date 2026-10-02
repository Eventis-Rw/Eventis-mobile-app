import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatColors } from "@/hooks/useChatColors";

export interface ChatAction {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
  onPress: () => void;
}

export function ChatActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ChatAction[];
  onClose: () => void;
}) {
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Dismiss actions"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.foreground }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          ) : null}
          <ScrollView>
            {actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: pressed ? colors.secondary : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={21}
                  color={
                    action.destructive ? colors.destructive : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: action.destructive
                        ? colors.destructive
                        : colors.foreground,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={[styles.cancel, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "80%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  action: {
    minHeight: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 10,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cancel: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
});
