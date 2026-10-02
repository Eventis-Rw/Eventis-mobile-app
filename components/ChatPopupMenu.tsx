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

export interface ChatMenuAction {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
  onPress: () => void;
}

export function ChatPopupMenu({
  visible,
  actions,
  onClose,
  top,
}: {
  visible: boolean;
  actions: ChatMenuAction[];
  onClose: () => void;
  top?: number;
}) {
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.menu,
            {
              top: top ?? insets.top + 52,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            {actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.action,
                  pressed && { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={21}
                  color={
                    action.destructive ? colors.destructive : colors.foreground
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    right: 10,
    width: 280,
    maxHeight: "76%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    elevation: 12,
    boxShadow: "0 8px 28px rgba(0,0,0,0.24)",
    overflow: "hidden",
  },
  content: { paddingVertical: 6 },
  action: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
  },
  label: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15 },
});
