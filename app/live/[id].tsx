import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { LiveWatchEntry } from "@/components/live/LiveWatchEntry";

export default function SharedLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: "#060A17" }}>
      {user && id ? (
        <LiveWatchEntry
          id={id}
          person={{
            id: user.id,
            name: user.organisation?.name ?? user.username,
            avatar: user.organisation?.logoUrl ?? user.avatarUrl,
          }}
          onClose={() => router.replace("/(tabs)/live" as any)}
        />
      ) : null}
    </View>
  );
}
