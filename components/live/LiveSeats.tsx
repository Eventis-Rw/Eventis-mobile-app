import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LiveVoice } from "@/hooks/useLiveBroadcast";
import { LIVE_LIMITS, type LivePerson } from "@/services/liveState";
import { LiveAvatar, liveColors as c } from "./LivePrimitives";
import { LiveSpeakingAvatar } from "./LiveSpeakingIndicator";

export function LiveSeats({ guests, me, host, requested, voice, disabled, onEmpty, onSeat }: {
  guests: LivePerson[];
  me: LivePerson;
  host: boolean;
  requested: boolean;
  voice?: LiveVoice;
  disabled?: boolean;
  onEmpty: () => void;
  onSeat: (person: LivePerson) => void;
}) {
  const onStage = guests.some((g) => g.id === me.id);
  const seats = Array.from({ length: LIVE_LIMITS.guests }, (_, i) => guests[i] ?? null);
  const firstEmpty = seats.findIndex((s) => !s);
  return (
    <View style={styles.row}>
      {seats.map((guest, index) => {
        if (guest) {
          const own = guest.id === me.id;
          const state = voice?.[guest.id];
          return (
            <Pressable
              key={guest.id}
              accessibilityRole="button"
              accessibilityLabel={`${own ? "You" : guest.name}, seat ${index + 1}${state?.speaking ? ", speaking" : ""}${state && !state.microphone ? ", muted" : ""}`}
              disabled={!own && !host}
              onPress={() => onSeat(guest)}
              style={styles.seat}
            >
              <LiveSpeakingAvatar size="small" speaking={!!state?.speaking}>
                <LiveAvatar person={guest} size={34} />
              </LiveSpeakingAvatar>
              {state && !state.microphone ? (
                <View style={styles.muted}>
                  <Ionicons name="mic-off" size={9} color="#FFF" />
                </View>
              ) : null}
              <Text numberOfLines={1} style={styles.name}>{own ? "You" : guest.name}</Text>
            </Pressable>
          );
        }
        const pending = requested && index === firstEmpty;
        const action = host ? "Invite" : pending ? "Requested" : "Join";
        const inactive = disabled || onStage || (requested && !pending);
        return (
          <Pressable
            key={`empty-${index}`}
            accessibilityRole="button"
            accessibilityLabel={host ? `Invite someone to seat ${index + 1}` : pending ? "Cancel your request to join" : `Request to join seat ${index + 1}`}
            accessibilityState={{ disabled: inactive }}
            disabled={inactive}
            onPress={onEmpty}
            style={({ pressed }) => [styles.seat, { opacity: inactive ? 0.45 : pressed ? 0.6 : 1 }]}
          >
            <View style={[styles.empty, pending && styles.pending]}>
              <Ionicons name={pending ? "hourglass-outline" : host ? "person-add-outline" : "add"} size={pending || host ? 16 : 22} color="#FFF" />
            </View>
            <Text numberOfLines={1} style={[styles.name, pending && { color: c.blue }]}>{onStage ? `Seat ${index + 1}` : action}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  seat: { width: 54, alignItems: "center", gap: 2 },
  empty: {
    width: 44,
    height: 44,
    margin: 4,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FFFFFF8C",
    backgroundColor: "#050A1466",
    alignItems: "center",
    justifyContent: "center",
  },
  pending: { borderStyle: "solid", borderColor: c.blue, backgroundColor: "#0B2A40CC" },
  muted: {
    position: "absolute",
    top: 34,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.red,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    maxWidth: 50,
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
});
