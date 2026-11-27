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
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
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
  inline = false,
  onClose,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: ChatAction[];
  layout?: "grid" | "list";
  /** Docked in the chat layout (like the emoji panel) instead of a full-screen modal — keeps the composer visible above it, WhatsApp-style. */
  inline?: boolean;
  onClose: () => void;
}) {
  const colors = useChatColors();
  const insets = useAppSafeAreaInsets();
  const isGrid = layout === "grid";

  if (inline && !visible) return null;

  const body = (
    <>
      {!inline ? <View style={styles.handle} /> : null}

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
        <View style={[styles.gridContainer, inline && styles.gridContainerCompact]}>
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
                inline && styles.gridItemCompact,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.93 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.gridCircle,
                  inline && styles.gridCircleCompact,
                  {
                    backgroundColor: inline
                      ? colors.secondary
                      : action.iconBg ?? (action.destructive ? "#EF4444" : "#8B5CF6"),
                  },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={inline ? 16 : 26}
                  color={
                    inline
                      ? action.iconBg ?? (action.destructive ? "#EF4444" : colors.primary)
                      : action.iconColor ?? "#FFFFFF"
                  }
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.gridLabel,
                  inline && styles.gridLabelCompact,
                  { color: colors.foreground },
                ]}
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
          {!inline ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={[styles.cancel, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.cancelLabel, { color: colors.foreground }]}>
                Cancel
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </>
  );

  if (inline) {
    return (
      <View
        accessibilityViewIsModal
        style={[
          styles.inlinePanel,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
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
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {body}
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
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  /* Docked panel below the composer, like the emoji picker — no overlay/backdrop. */
  inlinePanel: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
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
  gridContainerCompact: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  gridItem: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  gridItemCompact: {
    width: "25%",
    paddingVertical: 4,
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
  /* Compact, WhatsApp-sized circle for the panel docked above the keyboard. */
  gridCircleCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  gridLabel: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
    textAlign: "center",
  },
  gridLabelCompact: {
    marginTop: 4,
    fontSize: 10,
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
