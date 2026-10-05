import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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

export interface ChatMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ChatPopupMenu({
  visible,
  actions,
  onClose,
  top,
  anchor,
  align = "right",
}: {
  visible: boolean;
  actions: ChatMenuAction[];
  onClose: () => void;
  top?: number;
  anchor?: ChatMenuAnchor;
  align?: "left" | "right";
}) {
  const colors = useChatColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const menuWidth = Math.min(280, windowWidth - 20);
  const anchoredLeft = anchor
    ? align === "left"
      ? anchor.x
      : anchor.x + anchor.width - menuWidth
    : undefined;
  const left =
    anchoredLeft === undefined
      ? undefined
      : Math.max(10, Math.min(anchoredLeft, windowWidth - menuWidth - 10));
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
              top:
                top ??
                (anchor
                  ? Math.max(insets.top + 4, anchor.y + anchor.height + 6)
                  : insets.top + 52),
              left,
              right: left === undefined ? 10 : undefined,
              width: menuWidth,
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
