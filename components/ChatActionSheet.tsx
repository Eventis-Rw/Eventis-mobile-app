import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useChatColors } from "@/hooks/useChatColors";

export interface ChatAction {
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  iconBg?: string;
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.55)" }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss actions"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.handle} />
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
          <ScrollView showsVerticalScrollIndicator={false}>
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
                <View
                  style={[
                    styles.actionIconBox,
                    {
                      backgroundColor:
                        action.iconBg ??
                        (action.destructive
                          ? "rgba(239, 68, 68, 0.12)"
                          : colors.secondary),
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={22}
                    color={
                      action.iconColor ??
                      (action.destructive ? colors.destructive : colors.primary)
                    }
                  />
                </View>
                <View style={styles.actionTextBox}>
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
                  {action.subtitle ? (
                    <Text
                      style={[
                        styles.actionSubtitle,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {action.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.mutedForeground}
                  style={{ opacity: 0.5 }}
                />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={[styles.cancel, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.cancelLabel, { color: colors.foreground }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    maxHeight: "82%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150, 150, 150, 0.4)",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  action: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextBox: {
    flex: 1,
    gap: 2,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  actionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  cancel: {
    minHeight: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  cancelLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
