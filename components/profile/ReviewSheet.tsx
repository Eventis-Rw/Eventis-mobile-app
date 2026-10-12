import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { REVIEW_COMMENT_MAX, validateReview } from "@/services/profileService";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function StarRating({
  rating,
  size = 16,
  onChange,
}: {
  rating: number;
  size?: number;
  /** Omit for a read-only display. */
  onChange?: (rating: number) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={styles.stars}
      accessibilityRole={onChange ? "adjustable" : "text"}
      accessibilityLabel={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = (
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? colors.warning : colors.mutedForeground}
          />
        );
        return onChange ? (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={4}
            style={styles.starBtn}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
            accessibilityState={{ selected: star === rating }}
          >
            {icon}
          </Pressable>
        ) : (
          <React.Fragment key={star}>{icon}</React.Fragment>
        );
      })}
    </View>
  );
}

interface ReviewSheetProps {
  visible: boolean;
  eventTitle: string;
  initialRating?: number;
  initialComment?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

/** Bottom sheet to rate and review an attended event. Stays open with the error if saving fails. */
export function ReviewSheet({
  visible,
  eventTitle,
  initialRating = 0,
  initialComment = "",
  onSubmit,
  onClose,
}: ReviewSheetProps) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setComment(initialComment);
      setError(null);
    }
  }, [visible, initialRating, initialComment]);

  const save = async () => {
    const problem = validateReview({ rating, comment });
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your review.");
    } finally {
      setSaving(false);
    }
  };

  const remaining = REVIEW_COMMENT_MAX - comment.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={saving ? undefined : onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={saving ? undefined : onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 },
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
            {initialRating ? "Edit your review" : "Rate this event"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
            {eventTitle}
          </Text>

          <View style={styles.ratingBlock}>
            <StarRating
              rating={rating}
              size={34}
              onChange={(value) => {
                setRating(value);
                setError(null);
              }}
            />
            <Text style={[styles.ratingLabel, { color: rating ? colors.foreground : colors.mutedForeground }]}>
              {rating ? RATING_LABELS[rating] : "Tap a star to rate"}
            </Text>
          </View>

          <TextInput
            value={comment}
            onChangeText={(text) => {
              setComment(text);
              setError(null);
            }}
            placeholder="What stood out? (optional)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={REVIEW_COMMENT_MAX + 50}
            editable={!saving}
            style={[
              styles.input,
              { color: colors.foreground, borderColor: remaining < 0 ? colors.destructive : colors.border, backgroundColor: colors.card },
            ]}
            accessibilityLabel="Review comment"
          />
          <Text style={[styles.counter, { color: remaining < 0 ? colors.destructive : colors.mutedForeground }]}>
            {remaining} characters left
          </Text>

          {error ? (
            <View style={styles.errorRow} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.buttons}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary, opacity: saving || pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ busy: saving }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Save review</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  ratingBlock: { alignItems: "center", gap: 6, paddingVertical: 8 },
  ratingLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  starBtn: { padding: 4 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  counter: { fontSize: 12, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  buttons: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
