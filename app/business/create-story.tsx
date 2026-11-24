import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, BackHandler, Image, Keyboard, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";

import { KeyboardStickyView } from "@/components/KeyboardCompat";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { STORY_BACKGROUNDS, StoryCanvas, type StoryOverlay } from "@/components/StoryCanvas";
import { StoryVideo } from "@/components/StoryVideo";
import { useAuth } from "@/context/AuthContext";
import { useStories } from "@/context/StoriesContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { describeStatusError, publishStatus, type StatusCreateInput, type StatusMediaAsset, type StatusMediaType } from "@/services/statusService";

const StoryFooter = Platform.OS === "web" ? View : KeyboardStickyView;
const MAX_LAYERS = 8;
const MAX_ITEMS = 10;
const TEXT_COLORS = ["#FFFFFF", "#08111F", "#70BDF5", "#FACC15", "#EF4444", "#22C55E", "#EC4899", "#A855F7"];
const STICKERS = ["🔥", "✨", "🎶", "🎉", "💙", "📍", "😍", "🙌", "🥳", "🎤", "🍹", "🎟️", "Tonight", "New drop", "See you there", "Tickets out", "Sold out", "Last chance"];
const TEXT_STYLES = ["bold", "classic", "label"] as const;
const STYLE_LABEL: Record<StoryOverlay["style"], string> = { bold: "Bold", classic: "Classic", label: "Label" };
const TEMPLATES = [
  { id: "fiesta", title: "Friday energy", image: require("../../assets/images/friday-fiesta.jpeg"), message: "Your Friday plans, sorted. 🔥" },
  { id: "grill", title: "Live moments", image: require("../../assets/images/grill-and-chill.jpeg"), message: "Good music. Great company. ✨" },
  { id: "rewind", title: "What's happening", image: require("../../assets/images/thursday-rewind.jpeg"), message: "Something good is on the way. 🎶" },
] as const;
/** Controls drawn on top of the photo stay white-on-dark in both themes so they read on any picture. */
const OVER = { text: "#FFFFFF", accent: "#70BDF5", danger: "#FF6B6B" };
type Palette = ReturnType<typeof useOrganiserPalette>;
type Ink = { bg: string; surface: string; raised: string; line: string; text: string; muted: string; accent: string; send: string; onSend: string; danger: string };
const inkFrom = (palette: Palette): Ink => ({
  bg: palette.canvas, surface: palette.surface, raised: palette.surfaceRaised, line: palette.line, text: palette.text,
  muted: palette.muted, accent: palette.accent, send: palette.blue, onSend: palette.onBlue, danger: palette.danger,
});
/** Follows the app's light/dark theme (and the system setting when the app does). */
function useComposerTheme() {
  const palette = useOrganiserPalette();
  const ink = inkFrom(palette);
  const key = Object.values(ink).join("|");
  // `key` changes whenever any theme colour does, so styles rebuild on a theme switch.
  const styles = useMemo(() => createStyles(ink), [key]);
  return { ink, styles };
}

type Draft = {
  key: string;
  image?: ImageSourcePropType;
  videoUri?: string;
  mediaFileName?: string;
  mediaMimeType?: string;
  backgroundIndex: number;
  fit: "cover" | "contain";
  overlays: StoryOverlay[];
  caption: string;
};

const hasMedia = (draft: Draft) => Boolean(draft.image || draft.videoUri);
const hasText = (draft: Draft) => draft.overlays.some((layer) => layer.text.trim());
const isEmpty = (draft: Draft) => !hasMedia(draft) && !hasText(draft);

async function resolveDraftMedia(draft: Draft, mediaType: StatusMediaType): Promise<StatusMediaAsset | undefined> {
  if (mediaType === "text") return undefined;
  const imageUri = draft.image && typeof draft.image === "object" && !Array.isArray(draft.image)
    ? (draft.image as { uri?: string }).uri
    : undefined;
  const uri = draft.videoUri || imageUri;
  if (uri) return { uri, fileName: draft.mediaFileName, mimeType: draft.mediaMimeType };
  if (mediaType === "image" && typeof draft.image === "number") {
    const asset = Asset.fromModule(draft.image);
    if (!asset.localUri) await asset.downloadAsync();
    return { uri: asset.localUri ?? asset.uri, fileName: `${asset.name}.${asset.type}` };
  }
  return undefined;
}

function RoundIcon({ icon, label, onPress, active = false, disabled = false, color = OVER.text }: {
  icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; active?: boolean; disabled?: boolean; color?: string;
}) {
  const { styles } = useComposerTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => [styles.roundIcon, { backgroundColor: active ? OVER.accent : "rgba(0,0,0,0.55)", opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={21} color={active ? "#08111F" : color} />
    </Pressable>
  );
}

function EntryAction({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; disabled?: boolean }) {
  const { ink, styles } = useComposerTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.entryAction, { opacity: pressed || disabled ? 0.65 : 1 }]}>
      <View style={styles.entryCircle}><Ionicons name={icon} size={26} color={ink.text} /></View>
      <Text style={styles.entryLabel}>{label}</Text>
    </Pressable>
  );
}

export default function CreateStoryScreen() {
  const palette = useOrganiserPalette();
  const { ink, styles } = useComposerTheme();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { user } = useAuth();
  const { refresh, openStories } = useStories();
  const { width, height } = useWindowDimensions();
  const textInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nextId = useRef(0);
  const publishLock = useRef(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [editingTextId, setEditingTextId] = useState<string>();
  const [stickersOpen, setStickersOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [picking, setPicking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string>();
  const [footerHeight, setFooterHeight] = useState(120);

  const editing = drafts.length > 0;
  const current = drafts[Math.min(index, drafts.length - 1)];
  const background = STORY_BACKGROUNDS[current?.backgroundIndex ?? 0] ?? STORY_BACKGROUNDS[0];
  const selected = current?.overlays.find((layer) => layer.id === selectedId);
  const editingLayer = current?.overlays.find((layer) => layer.id === editingTextId);
  const canPublish = editing && drafts.some((draft) => !isEmpty(draft)) && !publishing && !picking;
  const topBar = insets.top + 62;
  const canvasWidth = Math.max(160, Math.min(width, (height - topBar - footerHeight - 8) * 9 / 16));

  const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++nextId.current}`;
  const haptic = () => { if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {}); };
  const updateCurrent = (patch: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) => {
    setDrafts((list) => list.map((draft, i) => i === index ? { ...draft, ...(typeof patch === "function" ? patch(draft) : patch) } : draft));
  };
  const updateLayer = (id: string, patch: Partial<StoryOverlay>) => {
    updateCurrent((draft) => ({ overlays: draft.overlays.map((layer) => layer.id === id ? { ...layer, ...patch } : layer) }));
  };
  const removeLayer = (id: string) => {
    updateCurrent((draft) => ({ overlays: draft.overlays.filter((layer) => layer.id !== id) }));
    setSelectedId(undefined);
    haptic();
  };
  const addLayer = (text: string, kind: StoryOverlay["kind"]): string | undefined => {
    if (!current) return undefined;
    if (current.overlays.length >= MAX_LAYERS) {
      setError(`You can add up to ${MAX_LAYERS} texts and stickers. Remove one to add another.`);
      return undefined;
    }
    const id = newId("layer");
    const textOnly = !hasMedia(current);
    updateCurrent((draft) => ({ overlays: [...draft.overlays, {
      id, text, kind, x: 0.5,
      y: kind === "text" ? (textOnly && !draft.overlays.length ? 0.5 : 0.4) : 0.68 - (draft.overlays.length % 3) * 0.12,
      color: kind === "text" ? STORY_BACKGROUNDS[draft.backgroundIndex].foreground : "#FFFFFF",
      style: kind === "text" ? "bold" : "label",
      size: kind === "text" ? (textOnly ? 34 : 28) : 24,
    }] }));
    setSelectedId(id);
    setError(undefined);
    haptic();
    return id;
  };
  const openTextEditor = (id?: string) => {
    const targetId = id ?? addLayer("", "text");
    if (!targetId) return;
    setSelectedId(targetId);
    setEditingTextId(targetId);
  };
  const closeTextEditor = () => {
    Keyboard.dismiss();
    const id = editingTextId;
    setEditingTextId(undefined);
    if (!id) return;
    // Like WhatsApp: closing the editor on empty text removes that text.
    const layer = current?.overlays.find((item) => item.id === id);
    if (layer && !layer.text.trim()) {
      const remaining = current.overlays.filter((item) => item.id !== id);
      if (!hasMedia(current) && !remaining.length) { removeItem(index); return; }
      removeLayer(id);
    }
  };
  const removeItem = (at: number) => {
    const remaining = drafts.filter((_, i) => i !== at);
    setDrafts(remaining);
    setIndex(Math.max(0, Math.min(at, remaining.length - 1)));
    setSelectedId(undefined);
    setEditingTextId(undefined);
    setError(undefined);
  };
  const selectItem = (at: number) => {
    if (at === index) return;
    Keyboard.dismiss();
    setIndex(at); setSelectedId(undefined); setEditingTextId(undefined); setError(undefined);
    haptic();
  };
  const startTextStory = () => {
    const id = newId("layer");
    setDrafts([{ key: newId("item"), backgroundIndex: 1, fit: "contain", caption: "",
      overlays: [{ id, text: "", kind: "text", x: 0.5, y: 0.5, color: STORY_BACKGROUNDS[1].foreground, style: "bold", size: 34 }] }]);
    setIndex(0);
    setSelectedId(id);
    setEditingTextId(id);
    setError(undefined);
    haptic();
  };
  const useTemplate = (template: (typeof TEMPLATES)[number]) => {
    setDrafts([{ key: newId("item"), image: template.image, backgroundIndex: 0, fit: "cover", caption: "",
      overlays: [{ id: newId("layer"), kind: "text", text: template.message, x: 0.5, y: 0.83, color: "#FFFFFF", style: "label", size: 21 }] }]);
    setIndex(0);
    setSelectedId(undefined);
    setError(undefined);
    haptic();
  };
  const chooseMedia = async (camera = false) => {
    if (picking || publishing) return;
    const room = MAX_ITEMS - drafts.length;
    if (room <= 0) { setError(`You can share up to ${MAX_ITEMS} stories at once.`); return; }
    setPicking(true);
    setError(undefined);
    Keyboard.dismiss();
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Allow camera access in your phone settings, or choose from your gallery.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images", "videos"], quality: 0.85, allowsEditing: false,
        allowsMultipleSelection: !camera && room > 1, selectionLimit: room, orderedSelection: true, videoMaxDuration: 60,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets.length) return;
      const additions: Draft[] = result.assets.slice(0, room).map((asset) => ({
        key: newId("item"),
        image: asset.type === "video" ? undefined : { uri: asset.uri },
        videoUri: asset.type === "video" ? asset.uri : undefined,
        mediaFileName: asset.fileName ?? undefined,
        mediaMimeType: asset.mimeType ?? undefined,
        backgroundIndex: 0,
        fit: asset.width && asset.height && asset.height >= asset.width ? "cover" : "contain",
        overlays: [],
        caption: "",
      }));
      // An untouched text story is replaced instead of being left behind empty.
      const kept = drafts.filter((draft) => !isEmpty(draft));
      setDrafts([...kept, ...additions]);
      setIndex(kept.length);
      setSelectedId(undefined);
      setEditingTextId(undefined);
      haptic();
    } catch {
      setError(camera ? "We couldn't open the camera. Try your gallery instead." : "We couldn't open your photos. Check photo permissions and try again.");
    } finally {
      setPicking(false);
    }
  };
  const share = async () => {
    if (!canPublish || publishLock.current) return;
    if (!user) { setError("Sign in to publish your story."); return; }
    const ready = drafts.filter((draft) => !isEmpty(draft));
    publishLock.current = true;
    setPublishing(true);
    setError(undefined);
    setSelectedId(undefined);
    Keyboard.dismiss();
    let publishedCount = 0;
    try {
      const inputs: StatusCreateInput[] = [];
      for (const draft of ready) {
        const overlays = draft.overlays.filter((layer) => layer.text.trim());
        const mediaType: StatusMediaType = draft.videoUri ? "video" : draft.image ? "image" : "text";
        const layeredText = overlays.map((layer) => layer.text.trim()).join("\n");
        inputs.push({
          mediaType,
          media: await resolveDraftMedia(draft, mediaType),
          caption: (draft.caption.trim() || layeredText).slice(0, 1000) || undefined,
          background: STORY_BACKGROUNDS[draft.backgroundIndex].color,
          fit: draft.fit,
          overlays,
        });
      }
      for (const input of inputs) {
        await publishStatus(input);
        publishedCount += 1;
      }
      await refresh();
      setPublished(true);
    } catch (problem) {
      const message = describeStatusError(problem, "Your story could not be published. Your design is still here — please try again.");
      if (publishedCount > 0) {
        // Keep only what didn't go out, so retrying doesn't post duplicates.
        const sent = new Set(ready.slice(0, publishedCount).map((draft) => draft.key));
        setDrafts((list) => list.filter((draft) => !sent.has(draft.key)));
        setIndex(0);
        setError(`${publishedCount} of ${ready.length} stories published. ${message}`);
      } else {
        setError(message);
      }
    } finally {
      publishLock.current = false;
      setPublishing(false);
    }
  };
  const requestClose = () => {
    if (publishing) return;
    Keyboard.dismiss();
    if (drafts.some((draft) => !isEmpty(draft) || draft.caption.trim())) { setConfirmDiscard(true); return; }
    if (editing) { setDrafts([]); setIndex(0); setError(undefined); return; }
    if (router.canGoBack()) router.back(); else router.replace("/business/dashboard" as never);
  };

  useEffect(() => {
    if (!editingTextId) return;
    const frame = requestAnimationFrame(() => textInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editingTextId]);

  // Android back closes the innermost layer first, then asks before discarding work.
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (publishing) return true;
    if (confirmDiscard) { setConfirmDiscard(false); return true; }
    if (editingTextId) { closeTextEditor(); return true; }
    if (stickersOpen) { setStickersOpen(false); return true; }
    if (selectedId) { setSelectedId(undefined); return true; }
    if (editing) { requestClose(); return true; }
    return false;
  };
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => backRef.current());
    return () => subscription.remove();
  }, []);

  if (published) return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <PortalScreenHeader title="Story published" />
      <View style={styles.doneWrap}>
        <Ionicons name="checkmark-circle-outline" size={56} color={palette.accent} />
        <Text style={[styles.doneHeading, { color: palette.text }]}>Your story is ready to view</Text>
        <Text style={[styles.doneText, { color: palette.muted }]}>Published to your status feed for 24 hours. Your audience can see it at the top of their feed.</Text>
        <Pressable onPress={() => { if (user) openStories(user.id, true); }} accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: palette.blue }]}><Text style={styles.primaryText}>View your stories</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></Pressable>
        <Pressable onPress={() => router.replace("/business/dashboard")} accessibilityRole="button"><Text style={[styles.linkText, { color: palette.accent }]}>Back to dashboard</Text></Pressable>
      </View>
    </View>
  );

  const discardDialog = confirmDiscard ? (
    <View style={styles.dialogBackdrop}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>Discard this story?</Text>
        <Text style={styles.dialogText}>Your photos, text and stickers will be lost.</Text>
        <View style={styles.dialogActions}>
          <Pressable onPress={() => setConfirmDiscard(false)} accessibilityRole="button" style={styles.dialogButton}><Text style={styles.dialogButtonText}>Keep editing</Text></Pressable>
          <Pressable onPress={() => { setConfirmDiscard(false); setDrafts([]); setIndex(0); setSelectedId(undefined); setError(undefined); }} accessibilityRole="button" style={styles.dialogButton}><Text style={[styles.dialogButtonText, { color: ink.danger }]}>Discard</Text></Pressable>
        </View>
      </View>
    </View>
  ) : null;

  if (!editing || !current) return (
    <View style={[styles.root, { backgroundColor: ink.bg, paddingTop: insets.top }]}>
      <View style={styles.entryHeader}>
        <Pressable onPress={requestClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.headerIcon}><Ionicons name="close" size={28} color={ink.text} /></Pressable>
        <Text style={styles.entryTitle}>Add status</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.entryContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.entryActions}>
          <EntryAction icon="pencil" label="Text" onPress={startTextStory} />
          <EntryAction icon="camera-outline" label="Camera" onPress={() => void chooseMedia(true)} disabled={picking} />
          <EntryAction icon="images-outline" label="Gallery" onPress={() => void chooseMedia()} disabled={picking} />
        </View>
        {picking ? <ActivityIndicator color={ink.accent} accessibilityLabel="Opening media picker" /> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.entryError}>{error}</Text> : null}
        <Text style={styles.sectionTitle}>Templates</Text>
        <View style={styles.templateGrid}>
          {TEMPLATES.map((template) => (
            <Pressable key={template.id} onPress={() => useTemplate(template)} accessibilityRole="button" accessibilityLabel={`Use ${template.title} template`} style={({ pressed }) => [styles.templateTile, { opacity: pressed ? 0.8 : 1 }]}>
              <Image source={template.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.templateShade}><Text style={styles.templateTitle} numberOfLines={2}>{template.title}</Text></View>
            </Pressable>
          ))}
        </View>
        <Text style={styles.entryHint}>Stories disappear after 24 hours. Pick several photos or videos to share them together.</Text>
      </ScrollView>
      {discardDialog}
    </View>
  );

  const mediaItem = hasMedia(current);
  const backgroundVisible = !mediaItem || current.fit === "contain";
  return (
    <View style={[styles.root, { backgroundColor: ink.bg }]}>
      <View style={[styles.stage, { top: topBar, bottom: footerHeight }]}>
        <Pressable style={{ width: canvasWidth }} onPress={() => { setSelectedId(undefined); Keyboard.dismiss(); }} accessible={false}>
          <StoryCanvas
            image={current.image} background={background.color} fit={current.fit} overlays={current.overlays}
            editable={!editingTextId && !publishing} selectedId={selectedId}
            media={current.videoUri ? <StoryVideo key={current.videoUri} uri={current.videoUri} paused={publishing || Boolean(editingTextId)} fit={current.fit} /> : undefined}
            onSelect={(id) => { Keyboard.dismiss(); setSelectedId(id); }}
            onTapLayer={(id) => {
              const layer = current.overlays.find((item) => item.id === id);
              if (layer?.kind === "text") openTextEditor(id);
            }}
            onMove={(id, x, y) => updateLayer(id, { x, y })}
          />
        </Pressable>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <RoundIcon icon="close" label={drafts.length > 1 ? "Discard stories" : "Discard story"} onPress={requestClose} disabled={publishing} />
        <View style={styles.topTools}>
          {selected ? <RoundIcon icon="trash-outline" label="Remove selected text or sticker" color={OVER.danger} onPress={() => removeLayer(selected.id)} disabled={publishing} /> : null}
          {mediaItem ? <RoundIcon icon={current.fit === "cover" ? "contract-outline" : "expand-outline"} label={current.fit === "cover" ? "Fit whole photo" : "Fill the screen"}
            onPress={() => { updateCurrent({ fit: current.fit === "cover" ? "contain" : "cover" }); haptic(); }} disabled={publishing} /> : null}
          <RoundIcon icon="happy-outline" label="Add sticker" onPress={() => { Keyboard.dismiss(); setStickersOpen(true); }} disabled={publishing} />
          <RoundIcon icon="text" label="Add text" onPress={() => openTextEditor()} disabled={publishing} />
          {backgroundVisible ? <RoundIcon icon="color-palette-outline" label={`Background colour: ${background.name}. Tap to change`}
            onPress={() => {
              const next = (current.backgroundIndex + 1) % STORY_BACKGROUNDS.length;
              const previousForeground = STORY_BACKGROUNDS[current.backgroundIndex].foreground;
              // Keep text readable when switching between light and dark backgrounds.
              updateCurrent((draft) => ({ backgroundIndex: next, overlays: draft.overlays.map((layer) => layer.kind === "text" && layer.color === previousForeground ? { ...layer, color: STORY_BACKGROUNDS[next].foreground } : layer) }));
              haptic();
            }} disabled={publishing} /> : null}
        </View>
      </View>

      <StoryFooter offset={{ closed: 0, opened: insets.bottom }} style={styles.footerWrap}>
        <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom + 6) }]}>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.editorError}>{error}</Text> : null}
          {drafts.length > 1 || mediaItem ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow} keyboardShouldPersistTaps="handled">
              {drafts.map((draft, i) => {
                const active = i === index;
                return (
                  <Pressable key={draft.key} onPress={() => selectItem(i)} disabled={publishing} accessibilityRole="button" accessibilityLabel={`Story ${i + 1} of ${drafts.length}`} accessibilityState={{ selected: active }}
                    style={[styles.thumb, { borderColor: active ? ink.text : "transparent", backgroundColor: STORY_BACKGROUNDS[draft.backgroundIndex].color }]}>
                    {draft.image ? <Image source={draft.image} style={styles.thumbImage} resizeMode="cover" /> : null}
                    {draft.videoUri ? <Ionicons name="videocam" size={18} color="#FFFFFF" /> : null}
                    {!hasMedia(draft) ? <Text style={styles.thumbText} numberOfLines={2}>{draft.overlays.find((layer) => layer.text.trim())?.text || "Aa"}</Text> : null}
                    {active && drafts.length > 1 ? (
                      <Pressable onPress={() => removeItem(i)} disabled={publishing} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove story ${i + 1}`} style={styles.thumbRemove}>
                        <Ionicons name="close" size={13} color="#FFFFFF" />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
              {drafts.length < MAX_ITEMS ? (
                <Pressable onPress={() => void chooseMedia()} disabled={picking || publishing} accessibilityRole="button" accessibilityLabel="Add more photos or videos" style={[styles.thumb, styles.thumbAdd]}>
                  {picking ? <ActivityIndicator color={ink.text} size="small" /> : <Ionicons name="add" size={24} color={ink.text} />}
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}
          <View style={styles.captionRow}>
            {mediaItem ? (
              <View style={styles.captionBox}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={ink.muted} />
                <TextInput value={current.caption} onChangeText={(caption) => updateCurrent({ caption })} placeholder="Add a caption…" placeholderTextColor={ink.muted}
                  maxLength={1000} multiline editable={!publishing} accessibilityLabel="Story caption" style={styles.captionInput} />
              </View>
            ) : (
              <Pressable onPress={() => void chooseMedia()} disabled={picking || publishing} accessibilityRole="button" accessibilityLabel="Add a photo or video" style={[styles.captionBox, styles.textModeHint]}>
                <Ionicons name="images-outline" size={20} color={ink.muted} />
                <Text style={styles.textModeLabel} numberOfLines={1}>Tap the text to edit · add a photo</Text>
              </Pressable>
            )}
            <Pressable onPress={() => void share()} disabled={!canPublish} accessibilityRole="button" accessibilityLabel={drafts.length > 1 ? `Publish ${drafts.length} stories` : "Publish story"} accessibilityState={{ disabled: !canPublish, busy: publishing }}
              style={({ pressed }) => [styles.sendButton, { opacity: !canPublish && !publishing ? 0.45 : pressed ? 0.8 : 1 }]}>
              {publishing ? <ActivityIndicator color={ink.onSend} /> : <Ionicons name="send" size={22} color={ink.onSend} />}
              {drafts.length > 1 && !publishing ? <View style={styles.sendBadge}><Text style={styles.sendBadgeText}>{drafts.length}</Text></View> : null}
            </Pressable>
          </View>
        </View>
      </StoryFooter>

      {editingLayer ? (
        <View style={[styles.textEditor, { paddingTop: insets.top + 10 }]}>
          <View style={styles.textEditorBar}>
            <Pressable onPress={() => {
              const next = TEXT_STYLES[(TEXT_STYLES.indexOf(editingLayer.style) + 1) % TEXT_STYLES.length];
              updateLayer(editingLayer.id, { style: next }); haptic();
            }} accessibilityRole="button" accessibilityLabel={`Text style: ${STYLE_LABEL[editingLayer.style]}. Tap to change`} style={styles.pill}>
              <Text style={styles.pillText}>Aa · {STYLE_LABEL[editingLayer.style]}</Text>
            </Pressable>
            <View style={styles.sizeControls}>
              <Pressable onPress={() => updateLayer(editingLayer.id, { size: Math.max(16, editingLayer.size - 3) })} accessibilityRole="button" accessibilityLabel="Smaller text" style={styles.sizeButton}><Ionicons name="remove" size={20} color="#FFFFFF" /></Pressable>
              <Pressable onPress={() => updateLayer(editingLayer.id, { size: Math.min(46, editingLayer.size + 3) })} accessibilityRole="button" accessibilityLabel="Larger text" style={styles.sizeButton}><Ionicons name="add" size={20} color="#FFFFFF" /></Pressable>
            </View>
            <Pressable onPress={closeTextEditor} accessibilityRole="button" style={styles.donePill}><Text style={styles.donePillText}>Done</Text></Pressable>
          </View>
          <View style={styles.colorRow}>
            {TEXT_COLORS.map((color) => (
              <Pressable key={color} onPress={() => { updateLayer(editingLayer.id, { color }); haptic(); }} accessibilityRole="button" accessibilityLabel={`Text colour ${color}`} accessibilityState={{ selected: editingLayer.color === color }}
                style={[styles.colorDot, { backgroundColor: color, borderWidth: editingLayer.color === color ? 3 : 1.5, transform: [{ scale: editingLayer.color === color ? 1.15 : 1 }] }]} />
            ))}
          </View>
          <TextInput
            ref={textInputRef} value={editingLayer.text} onChangeText={(text) => updateLayer(editingLayer.id, { text })}
            placeholder="Type something…" placeholderTextColor="rgba(255,255,255,0.55)" multiline maxLength={200} textAlign="center"
            accessibilityLabel="Story text"
            style={[styles.textEditorInput, {
              color: editingLayer.color, fontSize: Math.min(40, editingLayer.size + 4), lineHeight: Math.min(40, editingLayer.size + 4) * 1.25,
              fontFamily: editingLayer.style === "classic" ? "Inter_500Medium" : "Inter_700Bold",
              backgroundColor: editingLayer.style === "label" ? (editingLayer.color === "#08111F" ? "#FFFFFF" : "#08111F") : "transparent",
            }]}
          />
        </View>
      ) : null}

      <Modal visible={stickersOpen} transparent animationType="slide" onRequestClose={() => setStickersOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setStickersOpen(false)} accessibilityLabel="Close stickers" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Stickers</Text>
            <Text style={styles.sheetCount}>{current.overlays.length}/{MAX_LAYERS}</Text>
          </View>
          <View style={styles.stickerGrid}>
            {STICKERS.map((sticker) => (
              <Pressable key={sticker} disabled={current.overlays.length >= MAX_LAYERS}
                onPress={() => { if (addLayer(sticker, "sticker")) setStickersOpen(false); }}
                accessibilityRole="button" accessibilityLabel={`Add ${sticker} sticker`}
                style={({ pressed }) => [styles.sticker, { opacity: current.overlays.length >= MAX_LAYERS ? 0.4 : pressed ? 0.7 : 1 }]}>
                <Text style={[styles.stickerText, sticker.length <= 2 && styles.stickerEmoji]}>{sticker}</Text>
              </Pressable>
            ))}
          </View>
          {current.overlays.length >= MAX_LAYERS ? <Text style={styles.sheetNote}>Remove a text or sticker to add another.</Text> : null}
        </View>
      </Modal>
      {discardDialog}
    </View>
  );
}

function createStyles(INK: Ink) {
  return StyleSheet.create({
  root: { flex: 1 },
  // Entry ("Add status")
  entryHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 10 },
  headerIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  entryTitle: { color: INK.text, fontSize: 22, fontFamily: "Inter_600SemiBold" },
  entryContent: { paddingHorizontal: 18, gap: 18 },
  entryActions: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  entryAction: { alignItems: "center", gap: 9, minWidth: 80 },
  entryCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: INK.raised, alignItems: "center", justifyContent: "center" },
  entryLabel: { color: INK.text, fontSize: 14, fontFamily: "Inter_500Medium" },
  entryError: { color: INK.danger, fontSize: 13, lineHeight: 19, textAlign: "center", fontFamily: "Inter_500Medium" },
  sectionTitle: { color: INK.muted, fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  templateGrid: { flexDirection: "row", gap: 8 },
  templateTile: { flex: 1, aspectRatio: 9 / 16, borderRadius: 12, overflow: "hidden", backgroundColor: INK.surface },
  templateShade: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: "rgba(0,0,0,0.45)" },
  templateTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryHint: { color: INK.muted, fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular" },
  // Editor
  stage: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  topTools: { flexDirection: "row", gap: 8 },
  roundIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  footerWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  footer: { backgroundColor: INK.bg, paddingTop: 8, paddingHorizontal: 12, gap: 10 },
  editorError: { color: INK.danger, fontSize: 13, lineHeight: 18, textAlign: "center", fontFamily: "Inter_500Medium" },
  thumbRow: { gap: 8, paddingVertical: 2 },
  thumb: { width: 48, height: 64, borderRadius: 8, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbImage: { ...StyleSheet.absoluteFill },
  thumbText: { color: "#FFFFFF", fontSize: 9, textAlign: "center", paddingHorizontal: 3, fontFamily: "Inter_600SemiBold" },
  thumbRemove: { position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center" },
  thumbAdd: { backgroundColor: INK.surface, borderColor: INK.line, borderStyle: "dashed" },
  captionRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  captionBox: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: INK.surface, borderRadius: 25, paddingHorizontal: 16 },
  captionInput: { flex: 1, color: INK.text, fontSize: 16, maxHeight: 110, paddingVertical: Platform.OS === "ios" ? 14 : 10, fontFamily: "Inter_400Regular" },
  textModeHint: { justifyContent: "flex-start" },
  textModeLabel: { flex: 1, color: INK.muted, fontSize: 14, fontFamily: "Inter_400Regular" },
  sendButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: INK.send, alignItems: "center", justifyContent: "center" },
  sendBadge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: INK.text, alignItems: "center", justifyContent: "center" },
  sendBadgeText: { color: INK.bg, fontSize: 11, fontFamily: "Inter_700Bold" },
  // Text editor
  textEditor: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.72)", paddingHorizontal: 16, gap: 16 },
  textEditorBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", justifyContent: "center" },
  pillText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sizeControls: { flexDirection: "row", gap: 6, flex: 1 },
  sizeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  donePill: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center" },
  donePillText: { color: "#08111F", fontSize: 14, fontFamily: "Inter_700Bold" },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderColor: "#FFFFFF" },
  textEditorInput: { alignSelf: "center", maxWidth: "100%", minWidth: 160, marginTop: 24, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, textAlignVertical: "center" },
  // Stickers
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: INK.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, gap: 14 },
  sheetHandle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: INK.line },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { color: INK.text, fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetCount: { color: INK.muted, fontSize: 13, fontFamily: "Inter_500Medium" },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sticker: { minWidth: 56, minHeight: 52, paddingHorizontal: 12, borderRadius: 14, backgroundColor: INK.raised, alignItems: "center", justifyContent: "center" },
  stickerText: { color: INK.text, fontSize: 14, fontFamily: "Inter_700Bold" },
  stickerEmoji: { fontSize: 28 },
  sheetNote: { color: INK.muted, fontSize: 12, textAlign: "center", fontFamily: "Inter_400Regular" },
  // Discard dialog
  dialogBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { width: "100%", maxWidth: 360, backgroundColor: INK.surface, borderRadius: 20, padding: 22, gap: 10 },
  dialogTitle: { color: INK.text, fontSize: 17, fontFamily: "Inter_700Bold" },
  dialogText: { color: INK.muted, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  dialogButton: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center" },
  dialogButtonText: { color: INK.accent, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Published
  doneWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, gap: 18 },
  doneHeading: { fontSize: 24, lineHeight: 30, textAlign: "center", fontFamily: "Inter_700Bold" },
  doneText: { fontSize: 14, lineHeight: 22, textAlign: "center", fontFamily: "Inter_400Regular" },
  primaryButton: { minHeight: 52, paddingHorizontal: 24, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  linkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
}
