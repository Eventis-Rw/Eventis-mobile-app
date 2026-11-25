import { Stack } from "expo-router";
import { View } from "react-native";
import { useChatColors } from "@/hooks/useChatColors";

export default function ChatLayout() {
  const colors = useChatColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" dangerouslySingular />
        <Stack.Screen name="[id]" dangerouslySingular />
        <Stack.Screen name="search" options={{ animation: "none" }} />
      </Stack>
    </View>
  );
}
