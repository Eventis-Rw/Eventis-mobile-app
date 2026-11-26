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
  layout = "grid",
  onClose,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: ChatAction[];
  layout?: "grid" | "list";
  onClose: () => void;
}) {
  const colors = useChatColors();
  const isGrid = layout === "grid";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.52)" }]}>
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
          {/* WhatsApp-style pill drag handle */}
          <View style={styles.handle} />

          {title && !isGrid ? (
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.foreground }]}
            >
              {title}
            </Text>
          ) : null}

          {subtitle && !isGrid ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          ) : null}

          {isGrid ? (
            /* WhatsApp-style attachment grid */
            <View style={styles.gridContainer}>
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
                    styles.gridItem,
                    {
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.93 : 1 }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.gridCircle,
                      {
                        backgroundColor:
                          action.iconBg ??
                          (action.destructive ? "#EF4444" : "#8B5CF6"),
                      },
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={26}
                      color={action.iconColor ?? "#FFFFFF"}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.gridLabel, { color: colors.foreground }]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            /* Classic list format (for message actions / reporting) */
            <>
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
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.52)",
  },
  sheet: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    maxHeight: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150, 150, 150, 0.4)",
    alignSelf: "center",
    marginBottom: 16,
  },
  /* WhatsApp-style Grid Layout */
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  gridItem: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  gridCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  gridLabel: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
    textAlign: "center",
  },
  /* List Layout (for context / message actions) */
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  action: {
    minHeight: 54,
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
