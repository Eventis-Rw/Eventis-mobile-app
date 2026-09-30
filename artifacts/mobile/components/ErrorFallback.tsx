import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View className="h-full w-full flex-1 items-center justify-center bg-background p-6 dark:bg-background-dark">
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          className="absolute right-4 z-10 h-11 w-11 flex-row items-center justify-center rounded-lg bg-card dark:bg-card-dark"
          style={({ pressed }) => [
            { top: insets.top + 16, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View className="w-full max-w-[600px] items-center justify-center gap-4">
        <Text className="text-center text-[28px] font-bold leading-10 text-foreground dark:text-foreground-dark">
          Something went wrong
        </Text>

        <Text className="text-center text-base leading-6 text-muted-foreground dark:text-muted-foreground-dark">
          Please reload the app to continue.
        </Text>

        <Pressable
          onPress={handleRestart}
          className="min-w-[200px] rounded-lg bg-primary px-6 py-4 shadow-sm"
          style={({ pressed }) => ({
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text className="text-center text-base font-semibold text-primary-foreground">
            Try Again
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="h-[90%] w-full rounded-t-xl bg-background dark:bg-background-dark">
              <View className="flex-row items-center justify-between border-b border-border px-4 pb-3 pt-4 dark:border-border-dark">
                <Text className="text-xl font-semibold text-foreground dark:text-foreground-dark">
                  Error Details
                </Text>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: insets.bottom + 16,
                }}
                showsVerticalScrollIndicator
              >
                <View className="w-full overflow-hidden rounded-lg bg-card p-4 dark:bg-card-dark">
                  <Text
                    className="w-full text-xs leading-[18px] text-foreground dark:text-foreground-dark"
                    style={{ fontFamily: monoFont }}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
