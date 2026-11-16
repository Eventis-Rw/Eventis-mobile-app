import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  LIVE_REPORT_DETAILS_MAX,
  LIVE_REPORT_REASONS,
  reportLive,
  type LiveReportReason,
  type LiveReportReceipt,
} from "@/services/liveReportService";
import type { LivePerson, LiveRoom } from "@/services/liveState";
import { LiveButton, liveColors as c, liveStyles as s } from "./LivePrimitives";

export function LiveReportForm({ room, person, broadcast, onLeave, onDone }: {
  room: LiveRoom;
  person: LivePerson;
  broadcast: boolean;
  onLeave: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<LiveReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<LiveReportReceipt | null>(null);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError("");
    try {
      setReceipt(await reportLive({ roomId: room.id, hostId: room.host.id, reporterId: person.id, reason, details, broadcast }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your report couldn't be sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  if (receipt)
    return (
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 8 }}>
        <Ionicons name="shield-checkmark" size={52} color="#22C55E" />
        <Text style={[s.heading, { textAlign: "center" }]}>Thanks for letting us know</Text>
        <Text style={[s.body, { textAlign: "center" }]}>
          Our safety team will review this Live. {room.host.name} won't see who reported it.
        </Text>
        <Text selectable style={s.pill}>Reference {receipt.reference}</Text>
        <LiveButton danger label="Leave this Live" onPress={onLeave} />
        <LiveButton secondary label="Keep watching" onPress={onDone} />
      </View>
    );

  return (
    <>
      <Text style={s.body}>Why are you reporting {room.host.name}'s Live? Your report is anonymous.</Text>
      <View style={{ gap: 8 }}>
        {LIVE_REPORT_REASONS.map((r) => {
          const active = reason === r.key;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setReason(r.key)}
              style={[ui.reason, active ? ui.reasonActive : null]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.label, { fontSize: 14 }]}>{r.label}</Text>
                <Text style={[s.body, { fontSize: 12, lineHeight: 17 }]}>{r.hint}</Text>
              </View>
              <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={20} color={active ? c.red : c.muted} />
            </Pressable>
          );
        })}
      </View>
      {reason ? (
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Anything else? <Text style={s.body}>(optional)</Text></Text>
          <TextInput
            accessibilityLabel="Report details"
            value={details}
            onChangeText={setDetails}
            maxLength={LIVE_REPORT_DETAILS_MAX}
            multiline
            placeholder="What happened, and when?"
            placeholderTextColor="#6B7590"
            style={[s.input, { minHeight: 88, textAlignVertical: "top", fontSize: 14 }]}
          />
          <Text style={[s.body, { fontSize: 11, textAlign: "right" }]}>{details.length}/{LIVE_REPORT_DETAILS_MAX}</Text>
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <LiveButton danger label={sending ? "Sending…" : "Submit report"} disabled={!reason || sending} onPress={() => void submit()} />
      <Text style={[s.body, { fontSize: 11, textAlign: "center" }]}>
        If someone is in immediate danger, call 112.
      </Text>
    </>
  );
}

const ui = StyleSheet.create({
  reason: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line },
  reasonActive: { borderColor: c.red, backgroundColor: "#EF444414" },
});
