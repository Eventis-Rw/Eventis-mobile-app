import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-background p-5 dark:bg-background-dark">
        <Text className="text-xl font-bold text-foreground dark:text-foreground-dark">
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/" className="mt-[15px] py-[15px]">
          <Text className="text-sm text-primary">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
