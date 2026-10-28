import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { ApiError } from "@/utils/apiClient";
import {
  liveDirectoryApi,
  liveRequestId,
} from "@/services/liveDirectoryService";
import {
  watchSession,
  type BroadcastSession,
} from "@/services/liveBroadcastProtocol";
import type { LivePerson } from "@/services/liveState";
import { LiveBroadcastEntry } from "./LiveBroadcastEntry";
import { LiveButton, liveColors as c, liveStyles as s } from "./LivePrimitives";

export function LiveWatchEntry({
  id,
  person,
  onClose,
}: {
  id: string;
  person: LivePerson;
  onClose: () => void;
}) {
  const [session, setSession] = useState<BroadcastSession | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setSession(null);
    setError("");
    setUnavailable(false);
    void liveDirectoryApi
      .watch(id)
      .then((value) => {
        if (!disposed) setSession(watchSession(value, person, liveRequestId()));
      })
      .catch((e) => {
        if (!disposed) {
          setError(
            e instanceof Error ? e.message : "This Live is unavailable.",
          );
          setUnavailable(e instanceof ApiError && e.status === 404);
        }
      });
    return () => {
      disposed = true;
    };
  }, [id, person.id, attempt]);
  if (session?.listing?.id === id)
    return (
      <LiveBroadcastEntry
        key={session.code}
        person={person}
        initialSession={session}
        onClose={onClose}
      />
    );
  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 28,
          gap: 20,
          backgroundColor: c.bg,
        }}
      >
        {error ? (
          <>
            <Text style={s.heading}>
              {unavailable ? "This Live has ended" : "Couldn’t open this Live"}
            </Text>
            <Text accessibilityRole="alert" style={s.body}>
              {error}
            </Text>
            {!unavailable ? (
              <LiveButton
                label="Try again"
                onPress={() => setAttempt((n) => n + 1)}
              />
            ) : null}
          </>
        ) : (
          <>
            <ActivityIndicator color={c.blue} />
            <Text style={s.heading}>Joining the audience…</Text>
            <Text style={s.body}>Your camera and microphone stay off.</Text>
          </>
        )}
        <LiveButton secondary label="Back to Live" onPress={onClose} />
      </View>
    </Modal>
  );
}
