import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { EventScheduleFields } from "@/components/EventScheduleFields";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";
import { CoverImageCropper } from "@/components/media/CoverImageCropper";
import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { InlineError } from "@/components/profile/ProfileSection";
import { getEventImage } from "@/constants/eventImages";
import { CATEGORIES, type EventCategory } from "@/constants/events";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { describeProfileError } from "@/services/profileService";
import {
  createPublisherEvent,
  fetchPublisherEvent,
  updatePublisherEvent,
  validateEventInput,
  type PublisherEvent,
  type PublisherEventInput,
} from "@/services/publisherService";

const NON_ALL_CATEGORIES = CATEGORIES.filter((c) => c !== "All") as Exclude<EventCategory, "All">[];

interface FormState {
  image: string;
  imageMimeType: string;
  imageFileName: string;
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
  image: "",
  imageMimeType: "",
  imageFileName: "",
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

function toInput(form: FormState): PublisherEventInput {
  return {
    image: form.image,
    imageMimeType: form.imageMimeType || undefined,
    imageFileName: form.imageFileName || undefined,
    title: form.title,
    description: form.description,
    category: form.category as Exclude<EventCategory, "All">,
    location: form.location,
    date: form.date,
    time: form.time.trim(),
    capacity: form.capacity.trim() ? Number(form.capacity) : 0,
    isPaid: form.isPaid,
    // Blank price is allowed for paid entry; "5,000" style input is accepted.
    price: form.price.trim() ? Number(form.price.replace(/[\s,]/g, "")) : 0,
    websiteUrl: form.websiteUrl,
  };
}

function toForm(event: PublisherEvent): FormState {
  return {
    image: event.image,
    imageMimeType: "",
    imageFileName: "",
    title: event.title,
    description: event.description,
    category: event.category === "All" ? "" : event.category,
    location: event.location,
    date: event.date,
    time: event.time,
    capacity: event.capacity ? String(event.capacity) : "",
    isPaid: event.isPaid,
    price: event.isPaid && event.price > 0 ? String(event.price) : "",
    websiteUrl: event.organizerWebsite ?? "",
  };
}

function Field({
  label,
  children,
  required,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  colors: ReturnType<typeof useOrganiserColors>;
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
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  // `id` switches the screen to editing one of the publisher's own events.
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { user, consumePost } = useAuth();
  const { refreshEvents } = useEvents(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!!editId);
  const [cropSource, setCropSource] = useState<{ uri: string; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    fetchPublisherEvent(user.id, editId)
      .then((event) => {
        if (cancelled) return;
        if (event) setForm(toForm(event));
        else setError("This event no longer exists.");
      })
      .catch((err) => !cancelled && setError(describeProfileError(err, "We couldn't load this event.")))
      .finally(() => !cancelled && setLoadingEvent(false));
    return () => {
      cancelled = true;
    };
  }, [editId, user]);

  const set = (key: keyof FormState, value: string | boolean) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const isValid = Boolean(
    form.image.trim() &&
    form.title.trim() &&
    form.description.trim() &&
    form.category &&
    form.location.trim() &&
    form.date.trim() &&
    form.time.trim(),
  );

  async function chooseEventImage(source: "library" | "camera") {
    if (pickingImage) return;
    setPickingImage(true);
    setImageError(null);
    try {
      if (Platform.OS !== "web") {
        const permission = source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setImageError(
            source === "camera"
              ? "Allow camera access in your phone settings, or choose a photo from your gallery."
              : "Allow photo access in your phone settings so you can choose an event image.",
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.9,
      };
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const selected = result.canceled ? undefined : result.assets[0];
      if (selected) {
        setError(null);
        setCropSource({ uri: selected.uri, width: selected.width, height: selected.height });
      }
    } catch {
      setImageError(
        source === "camera"
          ? "We couldn't open the camera. Try choosing a photo instead."
          : "We couldn't open your photos. Check photo access and try again.",
      );
    } finally {
      setPickingImage(false);
    }
  }

  async function handleSubmit() {
    if (!isValid || submitting || !user) return;
    const input = toInput(form);
    const problem = validateEventInput(input);
    if (problem) {
      setError(problem);
      return;
    }
    if (!editId && user.organiserSubscription?.postsRemaining === 0) {
      setError("You've used all your posts. Buy more posts to publish another event.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editId) await updatePublisherEvent(user.id, editId, input);
      else {
        await createPublisherEvent(user.id, user.organisation?.name ?? user.username, { ...input, organisationId: user.organisation?.id });
        await consumePost();
      }
      void refreshEvents();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Back to wherever it was opened from (profile or organiser Overview).
      // Someone posting without an organisation has no dashboard to return to.
      if (!user.isBusinessAccount) router.replace("/(tabs)" as any);
      else if (router.canGoBack()) router.back();
      else router.replace("/business/dashboard" as any);
    } catch (err) {
      setError(describeProfileError(err, editId ? "We couldn't save your changes." : "We couldn't publish your event."));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }];

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <PortalScreenHeader title={editId ? "Edit Event" : "Create Event"} disabled={submitting} />

      {loadingEvent ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event" />
        </View>
      ) : (

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
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>01  Event details</Text>

              <Field label="Event image" required colors={colors}>
                {form.image ? (
                  <View style={[styles.imagePreview, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Image
                      source={getEventImage(form.image)}
                      style={styles.imagePreviewMedia}
                      resizeMode="cover"
                      accessibilityLabel="Selected event cover"
                    />
                    <View style={styles.imageReadyBadge}>
                      <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.imageReadyText}>Cover selected</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.imageEmpty,
                      { backgroundColor: colors.input, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
                    ]}
                    onPress={() => chooseEventImage("library")}
                    disabled={pickingImage}
                    accessibilityRole="button"
                    accessibilityLabel="Choose required event image"
                  >
                    <View style={[styles.imageEmptyIcon, { backgroundColor: `${colors.primary}18` }]}>
                      {pickingImage ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Ionicons name="image-outline" size={28} color={colors.primary} />
                      )}
                    </View>
                    <Text style={[styles.imageEmptyTitle, { color: colors.foreground }]}>Add your event cover</Text>
                    <Text style={[styles.imageEmptyCopy, { color: colors.mutedForeground }]}>Portrait artwork works best in the feed.</Text>
                  </Pressable>
                )}

                <View style={styles.imageActions}>
                  <Pressable
                    style={({ pressed }) => [styles.imageAction, { backgroundColor: `${colors.primary}14`, opacity: pressed ? 0.72 : 1 }]}
                    onPress={() => chooseEventImage("library")}
                    disabled={pickingImage}
                    accessibilityRole="button"
                    accessibilityLabel={form.image ? "Replace event image from gallery" : "Choose event image from gallery"}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.primary} />
                    <Text style={[styles.imageActionText, { color: colors.primary }]}>{form.image ? "Replace" : "Gallery"}</Text>
                  </Pressable>
                  {Platform.OS !== "web" ? (
                    <Pressable
                      style={({ pressed }) => [styles.imageAction, { backgroundColor: `${colors.primary}14`, opacity: pressed ? 0.72 : 1 }]}
                      onPress={() => chooseEventImage("camera")}
                      disabled={pickingImage}
                      accessibilityRole="button"
                      accessibilityLabel="Take event image with camera"
                    >
                      <Ionicons name="camera-outline" size={18} color={colors.primary} />
                      <Text style={[styles.imageActionText, { color: colors.primary }]}>Camera</Text>
                    </Pressable>
                  ) : null}
                  {form.image ? (
                    <Pressable
                      style={({ pressed }) => [styles.imageRemove, { opacity: pressed ? 0.65 : 1 }]}
                      onPress={() => set("image", "")}
                      disabled={pickingImage}
                      accessibilityRole="button"
                      accessibilityLabel="Remove event image"
                    >
                      <Ionicons name="trash-outline" size={18} color="#F87171" />
                    </Pressable>
                  ) : null}
                </View>
                {imageError ? (
                  <Text style={styles.imageError} accessibilityLiveRegion="polite">{imageError}</Text>
                ) : null}
              </Field>

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
                <LocationAutocompleteInput
                  value={form.location}
                  onChangeText={(v) => set("location", v)}
                  placeholder="e.g. Roundhouse, Camden"
                  colors={colors}
                />
              </Field>

              <EventScheduleFields date={form.date} time={form.time} onDate={(value) => set("date", value)} onTime={(value) => set("time", value)} />

              <Field label="Capacity (optional)" colors={colors}>
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
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>03  Tickets & entry (optional)</Text>
              <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Choose how people get in. Paid entry links to the platform where tickets are sold.</Text>

              <View style={styles.entryOptions} accessibilityRole="radiogroup">
                {([
                  { paid: false, title: "Free Entry", subtitle: "Anyone can come", icon: "people-outline" },
                  { paid: true, title: "Paid Entry", subtitle: "Tickets sold externally", icon: "ticket-outline" },
                ] as const).map((option) => {
                  const selected = form.isPaid === option.paid;
                  return (
                    <Pressable
                      key={option.title}
                      onPress={() => set("isPaid", option.paid)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${option.title}. ${option.subtitle}`}
                      style={({ pressed }) => [
                        styles.entryOption,
                        {
                          backgroundColor: selected ? colors.primary + "14" : colors.input,
                          borderColor: selected ? colors.primary : colors.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View style={styles.entryOptionHeader}>
                        <Ionicons name={option.icon} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                        <Ionicons
                          name={selected ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={selected ? colors.primary : colors.mutedForeground}
                        />
                      </View>
                      <Text style={[styles.label, { color: colors.foreground }]}>{option.title}</Text>
                      <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>{option.subtitle}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {!form.isPaid && (
                <View style={[styles.infoBox, { backgroundColor: colors.success + "11", borderColor: colors.success + "44" }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    No reservation needed · Free community access.
                  </Text>
                </View>
              )}

              {form.isPaid && (
                <>
                  <Field label="Ticket Price (RWF) · optional" colors={colors}>
                    <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>RWF</Text>
                      <TextInput
                        style={[styles.iconInputText, { color: colors.foreground }]}
                        placeholder="e.g. 5000"
                        placeholderTextColor={colors.mutedForeground}
                        value={form.price}
                        onChangeText={(v) => set("price", v)}
                        keyboardType="number-pad"
                      />
                    </View>
                  </Field>

                  <Field label="Ticket purchase link" required colors={colors}>
                    <View style={[styles.iconInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
                      <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.iconInputText, { color: colors.foreground }]}
                        placeholder="https://tickets.example.com/your-event"
                        placeholderTextColor={colors.mutedForeground}
                        value={form.websiteUrl}
                        onChangeText={(v) => set("websiteUrl", v)}
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Ticket purchase link"
                      />
                    </View>
                  </Field>

                  <View style={[styles.infoBox, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "44" }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                      Attendees tap Get Tickets and buy on this link (your website or a ticket platform). Eventis doesn't process payments. Leave the price blank to hide it.
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>

            {/* Submit */}
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}
              style={styles.submitBlock}
            >
              {error ? <InlineError message={error} /> : null}
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
                  {submitting ? (editId ? "Saving..." : "Publishing...") : editId ? "Save Changes" : "Publish Event"}
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <CoverImageCropper
        visible={!!cropSource}
        imageUri={cropSource?.uri ?? null}
        imageWidth={cropSource?.width ?? 0}
        imageHeight={cropSource?.height ?? 0}
        aspect={[4, 5]}
        onCancel={() => setCropSource(null)}
        onConfirm={(cropped) => {
          setForm((current) => ({
            ...current,
            image: cropped.uri,
            imageMimeType: cropped.mimeType,
            imageFileName: cropped.fileName,
          }));
          setCropSource(null);
          if (Platform.OS !== "web") void Haptics.selectionAsync();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  submitBlock: { gap: 10 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },

  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  imagePreview: {
    width: "100%",
    aspectRatio: 4 / 3,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
  },
  imagePreviewMedia: { width: "100%", height: "100%" },
  imageReadyBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(4, 12, 26, 0.82)",
  },
  imageReadyText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  imageEmpty: {
    minHeight: 178,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 20,
  },
  imageEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  imageEmptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  imageEmptyCopy: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  imageActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  imageAction: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 13,
  },
  imageActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  imageRemove: {
    width: 42,
    height: 42,
    marginLeft: "auto",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  },
  imageError: { color: "#FCA5A5", fontSize: 12, lineHeight: 18, fontFamily: "Inter_500Medium" },

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
    minHeight: 120,
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 14 },

  catRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  entryOptions: { flexDirection: "row", gap: 10 },
  entryOption: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 4 },
  entryOptionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
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
