import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, type EventCategory } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

const NON_ALL_CATEGORIES = CATEGORIES.filter((c) => c !== "All") as Exclude<EventCategory, "All">[];

interface FormState {
  title: string;
  description: string;
  category: Exclude<EventCategory, "All"> | "";
  location: string;
  date: string;
  time: string;
  capacity: string;
  isPaid: boolean;
  price: string;
  websiteUrl: string;
}

const INITIAL: FormState = {
  title: "",
  description: "",
  category: "",
  location: "",
  date: "",
  time: "",
  capacity: "",
  isPaid: false,
  price: "",
  websiteUrl: "",
};

function Field({
  label,
  children,
  required,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label}
        {required && <Text style={{ color: colors.primary }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function CreateEventScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isValid =
    form.title.trim() &&
    form.description.trim() &&
    form.category &&
    form.location.trim() &&
    form.date.trim() &&
    form.time.trim() &&
    form.capacity.trim();

  async function handleSubmit() {
    if (!isValid || submitting) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    router.replace("/business/dashboard" as any);
  }

  const inputStyle = [styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic info */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Info</Text>

            <Field label="Event Title" required colors={colors}>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Summer Jazz Night"
                placeholderTextColor={colors.mutedForeground}
                value={form.title}
                onChangeText={(v) => set("title", v)}
              />
            </Field>

            <Field label="Description" required colors={colors}>
              <TextInput
                style={[inputStyle, styles.textarea]}
                placeholder="Tell attendees what to expect..."
                placeholderTextColor={colors.mutedForeground}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Category" required colors={colors}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
              >
                {NON_ALL_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor:
                          form.category === cat ? colors.primary : colors.secondary,
                        borderColor:
                          form.category === cat ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => set("category", cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: form.category === cat ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Field>
          </Animated.View>

          {/* Location & time */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Location &amp; Time
            </Text>

            <Field label="Venue / Address" required colors={colors}>
              <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.iconInputText, { color: colors.foreground }]}
                  placeholder="e.g. Roundhouse, Camden"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.location}
                  onChangeText={(v) => set("location", v)}
                />
              </View>
            </Field>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Date" required colors={colors}>
                  <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.iconInputText, { color: colors.foreground }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.date}
                      onChangeText={(v) => set("date", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Start Time" required colors={colors}>
                  <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.iconInputText, { color: colors.foreground }]}
                      placeholder="19:00"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.time}
                      onChangeText={(v) => set("time", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </Field>
              </View>
            </View>

            <Field label="Capacity" required colors={colors}>
              <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.iconInputText, { color: colors.foreground }]}
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.capacity}
                  onChangeText={(v) => set("capacity", v)}
                  keyboardType="number-pad"
                />
              </View>
            </Field>
          </Animated.View>

          {/* Ticketing */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ticketing</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.label, { color: colors.foreground }]}>Paid Event</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
                  Customers pay on your website
                </Text>
              </View>
              <Switch
                value={form.isPaid}
                onValueChange={(v) => set("isPaid", v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            {form.isPaid && (
              <>
                <Field label="Ticket Price (GBP)" colors={colors}>
                  <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>£</Text>
                    <TextInput
                      style={[styles.iconInputText, { color: colors.foreground }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.price}
                      onChangeText={(v) => set("price", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </Field>

                <Field label="Booking / Payment URL" required colors={colors}>
                  <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.iconInputText, { color: colors.foreground }]}
                      placeholder="https://yourticketing.com/event"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.websiteUrl}
                      onChangeText={(v) => set("websiteUrl", v)}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>
                </Field>

                <View style={[styles.infoBox, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "44" }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    Eventis redirects customers to your URL for payment. We do not process payments directly.
                  </Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Submit */}
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}
          >
            <Pressable
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isValid ? colors.primary : colors.border,
                  opacity: submitting ? 0.75 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || submitting}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? "Publishing..." : "Publish Event"}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },

  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  iconInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  iconInputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  currencySymbol: { fontSize: 16, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", gap: 10 },

  catRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: { flex: 1, gap: 2 },
  switchSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
