import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useLiveDirectory } from "@/hooks/useLiveDirectory";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";
import { LiveDiscovery } from "./LiveDiscovery";
import { LiveBroadcastEntry } from "./LiveBroadcastEntry";
import { LiveWatchEntry } from "./LiveWatchEntry";
import { liveColors as c, liveStyles as s } from "./LivePrimitives";

export default function LiveScreen() {
  const { user } = useAuth();
  const shared = useLiveDirectory();
  const { events } = useOrganiserEvents();
  const [hosting, setHosting] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  if (!user)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text style={s.heading}>Sign in to explore Live</Text>
      </View>
    );
  const person = {
    id: user.id,
    name: user.organisation?.name ?? user.username,
    avatar: user.organisation?.logoUrl ?? user.avatarUrl,
  };
  const close = () => {
    setHosting(false);
    setWatchId(null);
    void shared.refresh();
  };
  return (
    <>
      <LiveDiscovery
        rooms={[]}
        busy={false}
        onHost={() => setHosting(true)}
        onRoom={() => {}}
        liveRooms={shared.rooms}
        liveLoading={shared.loading}
        liveError={shared.error}
        onRefresh={() => void shared.refresh()}
        onWatch={(room) => setWatchId(room.id)}
      />
      {hosting ? (
        <LiveBroadcastEntry
          person={person}
          events={events.filter((e) => e.status === "published")}
          onClose={close}
        />
      ) : null}
      {watchId ? (
        <LiveWatchEntry id={watchId} person={person} onClose={close} />
      ) : null}
    </>
  );
}
