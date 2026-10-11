import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { InlineError } from "@/components/profile/ProfileSection";
import type { Event } from "@/constants/events";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import {
  PROMOTION_DURATIONS,
  PROMOTION_PLACEMENTS,
  validatePromotionRequest,
  type PromotionPlacement,
  type PromotionRequest,
} from "@/services/publisherService";

interface PromotionSheetProps {
  visible: boolean;
  /** Upcoming, live events the business can promote. */
  events: Event[];
  initialEventId?: string;
  onSubmit: (input: PromotionRequest) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Request a paid home page placement. Nothing is charged here: Eventis reviews
 * the request and confirms the price, which depends on placement, duration,
 * reach, category and area.
 */
export function PromotionSheet({ visible, events, initialEventId, onSubmit, onClose }: PromotionSheetProps) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [eventId, setEventId] = useState<string | undefined>(initialEventId);
  const [placement, setPlacement] = useState<PromotionPlacement | undefined>();
  const [durationDays, setDurationDays] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (visible) {
      setEventId(initialEventId ?? (events.length === 1 ? events[0].id : undefined));
      setPlacement(undefined);
      setDurationDays(undefined);
      setError(null);
      setSent(false);
    }
  }, [visible, initialEventId, events]);

  const submit = async () => {
    const event = events.find((e) => e.id === eventId);
    const input = { eventId, eventTitle: event?.title, placement, durationDays };
    const problem = validatePromotionRequest(input);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(input as PromotionRequest);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send your request.");
    } finally {
      setSaving(false);
    }
  };

  const option = (selected: boolean) => [
    styles.option,
    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.card },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={saving ? undefined : onClose}>
      <View style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={saving ? undefined : onClose} accessibilityLabel="Close" />
        <View
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {sent ? (
            <View style={styles.sent}>
              <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>Request sent</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                The Eventis team will review it and send you a price before anything goes live. You can follow its
                status under Promotions.
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
                Promote an event
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground, textAlign: "left" }]}>
                Home page placements are paid. Pricing depends on placement, duration, reach, category and area, and
                is confirmed before you're charged.
              </Text>

              <Text style={[styles.label, { color: colors.foreground }]}>Event</Text>
              {events.length ? (
                events.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => setEventId(event.id)}
                    style={option(eventId === event.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: eventId === event.id }}
                  >
                    <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={[styles.optionText, { color: colors.mutedForeground }]}>{event.date}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.optionText, { color: colors.mutedForeground }]}>
                  You need a live, upcoming event to promote.
                </Text>
              )}

              <Text style={[styles.label, { color: colors.foreground }]}>Placement</Text>
              {PROMOTION_PLACEMENTS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPlacement(p.key)}
                  style={option(placement === p.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: placement === p.key }}
                >
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{p.title}</Text>
                  <Text style={[styles.optionText, { color: colors.mutedForeground }]}>{p.description}</Text>
                </Pressable>
              ))}

              <Text style={[styles.label, { color: colors.foreground }]}>Duration</Text>
              <View style={styles.durations}>
                {PROMOTION_DURATIONS.map((days) => (
                  <Pressable
                    key={days}
                    onPress={() => setDurationDays(days)}
                    style={[option(durationDays === days), styles.duration]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: durationDays === days }}
                  >
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>{days} days</Text>
                  </Pressable>
                ))}
              </View>

              {error ? <InlineError message={error} /> : null}

              <Pressable
                onPress={submit}
                disabled={saving || !events.length}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: saving || pressed || !events.length ? 0.75 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ busy: saving, disabled: !events.length }}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Send for review</Text>}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  form: { gap: 10, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  body: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center" },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  option: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  optionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  durations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  duration: { minWidth: 80, alignItems: "center" },
  primaryBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sent: { alignItems: "center", gap: 10, paddingVertical: 16 },
});
