import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";

import { KeyboardStickyView } from "@/components/KeyboardCompat";
import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { STORY_BACKGROUNDS, StoryCanvas, type StoryOverlay } from "@/components/StoryCanvas";
import { StoryVideo } from "@/components/StoryVideo";
import { StoryAvatar } from "@/components/StoryAvatar";
import { useAuth } from "@/context/AuthContext";
import { useStories } from "@/context/StoriesContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import {
  describeStatusError,
  publishStatus,
  type StatusCreateInput,
  type StatusMediaAsset,
  type StatusMediaType,
} from "@/services/statusService";
import { publishLocalStories, type PublishedStory, type StoryDraft } from "@/services/storyService";

const StoryFooter = Platform.OS === "web" ? View : KeyboardStickyView;
const MAX_LAYERS = 8;
const MAX_ITEMS = 10;
const TEXT_COLORS = [
  "#FFFFFF",
  "#08111F",
  "#FF2D55",
  "#70BDF5",
  "#FACC15",
  "#22C55E",
  "#EC4899",
  "#A855F7",
  "#FF9500",
  "#00C6FF",
];
const STICKER_ITEMS = [
  // Interactive Badges
  { label: "📍 Kigali, Rwanda", type: "interactive" },
  { label: "📍 BK Arena", type: "interactive" },
  { label: "📍 Camp Kigali", type: "interactive" },
  { label: "🎵 Afrobeat Vibez · DJ Eventis", type: "interactive" },
  { label: "🎵 Kigali Nights · Kigali Grooves", type: "interactive" },
  { label: "🎟️ Tickets Live", type: "interactive" },
  { label: "🎟️ VIP Access", type: "interactive" },
  { label: "⏰ Starts in 2h", type: "interactive" },
  { label: "🔥 Tonight Only", type: "interactive" },
  { label: "⚡ Sold Out", type: "interactive" },
  { label: "@eventis_rw", type: "interactive" },
  // Events & Vibes
  { label: "✨ New Event", type: "vibes" },
  { label: "🎉 See You There", type: "vibes" },
  { label: "🥂 VIP Tables", type: "vibes" },
  { label: "🎶 Live Music", type: "vibes" },
  { label: "💃 Dance Party", type: "vibes" },
  { label: "🎤 Live Concert", type: "vibes" },
  { label: "🍹 Happy Hour", type: "vibes" },
  { label: "🍾 Bottle Service", type: "vibes" },
  // Emojis
  { label: "🔥", type: "emojis" },
  { label: "✨", type: "emojis" },
  { label: "💙", type: "emojis" },
  { label: "❤️", type: "emojis" },
  { label: "🎉", type: "emojis" },
  { label: "😍", type: "emojis" },
  { label: "🙌", type: "emojis" },
  { label: "🥳", type: "emojis" },
  { label: "💯", type: "emojis" },
  { label: "⚡", type: "emojis" },
  { label: "🥂", type: "emojis" },
  { label: "🍸", type: "emojis" },
  { label: "🕺", type: "emojis" },
  { label: "💃", type: "emojis" },
  { label: "🎤", type: "emojis" },
] as const;

const STICKERS = STICKER_ITEMS.map((item) => item.label);
const TEXT_STYLES = ["bold", "classic", "label"] as const;
const STYLE_LABEL: Record<StoryOverlay["style"], string> = {
  bold: "Bold",
  classic: "Classic",
  label: "Pill",
};
const TEMPLATES = [
  {
    id: "fiesta",
    title: "Friday energy",
    image: require("../../assets/images/friday-fiesta.jpeg"),
    message: "Your Friday plans, sorted. 🔥",
  },
  {
    id: "grill",
    title: "Live moments",
    image: require("../../assets/images/grill-and-chill.jpeg"),
    message: "Good music. Great company. ✨",
  },
  {
    id: "rewind",
    title: "What's happening",
    image: require("../../assets/images/thursday-rewind.jpeg"),
    message: "Something good is on the way. 🎶",
  },
] as const;

const OVER = { text: "#FFFFFF", accent: "#70BDF5", danger: "#FF6B6B" };
type Palette = ReturnType<typeof useOrganiserPalette>;
type Ink = {
  bg: string;
  surface: string;
  raised: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  send: string;
  onSend: string;
  danger: string;
};
const inkFrom = (palette: Palette): Ink => ({
  bg: palette.canvas,
  surface: palette.surface,
  raised: palette.surfaceRaised,
  line: palette.line,
  text: palette.text,
  muted: palette.muted,
  accent: palette.accent,
  send: palette.blue,
  onSend: palette.onBlue,
  danger: palette.danger,
});

function useComposerTheme() {
  const palette = useOrganiserPalette();
  const ink = inkFrom(palette);
  const key = Object.values(ink).join("|");
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

async function resolveDraftMedia(
  draft: Draft,
  mediaType: StatusMediaType,
): Promise<StatusMediaAsset | undefined> {
  if (mediaType === "text") return undefined;
  const imageUri =
    draft.image && typeof draft.image === "object" && !Array.isArray(draft.image)
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

function RoundIcon({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  color = OVER.text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  color?: string;
}) {
  const { styles } = useComposerTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => [
        styles.roundIcon,
        {
          backgroundColor: active ? OVER.accent : "rgba(0,0,0,0.58)",
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={21} color={active ? "#08111F" : color} />
    </Pressable>
  );
}

export default function CreateStoryScreen() {
  const palette = useOrganiserPalette();
  const { ink, styles } = useComposerTheme();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { user } = useAuth();
  const { addPublishedStory, openStories } = useStories();
  const { width, height } = useWindowDimensions();
  const textInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nextId = useRef(0);
  const publishLock = useRef(false);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [editingTextId, setEditingTextId] = useState<string>();
  const [stickersOpen, setStickersOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [picking, setPicking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string>();
  const [footerHeight, setFooterHeight] = useState(130);
  const [flashOn, setFlashOn] = useState(false);
  const [activeStudioMode, setActiveStudioMode] = useState<"TYPE" | "STORY" | "TEMPLATES">("STORY");
  const [activeStickerTab, setActiveStickerTab] = useState<"ALL" | "INTERACTIVE" | "VIBES" | "EMOJIS">("ALL");
  const [draggingLayer, setDraggingLayer] = useState(false);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const trashScale = useRef(new Animated.Value(1)).current;
  const lastTrashHaptic = useRef(0);

  const editing = drafts.length > 0;
  const current = drafts[Math.min(index, drafts.length - 1)];
  const background = STORY_BACKGROUNDS[current?.backgroundIndex ?? 0] ?? STORY_BACKGROUNDS[0];
  const selected = current?.overlays.find((layer) => layer.id === selectedId);
  const editingLayer = current?.overlays.find((layer) => layer.id === editingTextId);
  const canPublish = editing && drafts.some((draft) => !isEmpty(draft)) && !publishing && !picking;
  const topBar = insets.top + 58;
  const canvasWidth = Math.max(160, Math.min(width - 16, ((height - topBar - footerHeight - 8) * 9) / 16));

  const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++nextId.current}`;
  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
  };

  const updateCurrent = (patch: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) => {
    setDrafts((list) =>
      list.map((draft, i) =>
        i === index ? { ...draft, ...(typeof patch === "function" ? patch(draft) : patch) } : draft,
      ),
    );
  };
  const updateLayer = (id: string, patch: Partial<StoryOverlay>) => {
    updateCurrent((draft) => ({
      overlays: draft.overlays.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    }));
  };
  const removeLayer = (id: string) => {
    updateCurrent((draft) => ({
      overlays: draft.overlays.filter((layer) => layer.id !== id),
    }));
    setSelectedId(undefined);
    haptic();
  };

  const handleDragChange = (dragging: boolean, normX: number, normY: number) => {
    setDraggingLayer(dragging);
    const isOver = normY > 0.8 && normX > 0.32 && normX < 0.68;
    setDragOverTrash(isOver);

    if (isOver) {
      const now = Date.now();
      if (now - lastTrashHaptic.current > 320) {
        lastTrashHaptic.current = now;
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }
      Animated.spring(trashScale, {
        toValue: 1.25,
        useNativeDriver: Platform.OS !== "web",
        bounciness: 8,
      }).start();
    } else {
      Animated.spring(trashScale, {
        toValue: 1,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }

    if (!dragging && isOver && selectedId) {
      removeLayer(selectedId);
      setDragOverTrash(false);
      setDraggingLayer(false);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  };

  const addLayer = (text: string, kind: StoryOverlay["kind"]): string | undefined => {
    if (!current) return undefined;
    if (current.overlays.length >= MAX_LAYERS) {
      setError(`You can add up to ${MAX_LAYERS} texts and stickers. Remove one to add another.`);
      return undefined;
    }
    const id = newId("layer");
    const textOnly = !hasMedia(current);
    updateCurrent((draft) => ({
      overlays: [
        ...draft.overlays,
        {
          id,
          text,
          kind,
          x: 0.5,
          y:
            kind === "text"
              ? textOnly && !draft.overlays.length
                ? 0.5
                : 0.4
              : 0.68 - (draft.overlays.length % 3) * 0.12,
          color: kind === "text" ? STORY_BACKGROUNDS[draft.backgroundIndex].foreground : "#FFFFFF",
          style: kind === "text" ? "bold" : "label",
          size: kind === "text" ? (textOnly ? 34 : 28) : 24,
        },
      ],
    }));
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
    const layer = current?.overlays.find((item) => item.id === id);
    if (layer && !layer.text.trim()) {
      const remaining = current.overlays.filter((item) => item.id !== id);
      if (!hasMedia(current) && !remaining.length) {
        removeItem(index);
        return;
      }
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
    setIndex(at);
    setSelectedId(undefined);
    setEditingTextId(undefined);
    setError(undefined);
    haptic();
  };

  const startTextStory = () => {
    const id = newId("layer");
    setDrafts([
      {
        key: newId("item"),
        backgroundIndex: 0,
        fit: "contain",
        caption: "",
        overlays: [
          {
            id,
            text: "",
            kind: "text",
            x: 0.5,
            y: 0.5,
            color: STORY_BACKGROUNDS[0].foreground,
            style: "bold",
            size: 34,
          },
        ],
      },
    ]);
    setIndex(0);
    setSelectedId(id);
    setEditingTextId(id);
    setError(undefined);
    haptic();
  };

  const useTemplate = (template: (typeof TEMPLATES)[number]) => {
    setDrafts([
      {
        key: newId("item"),
        image: template.image,
        backgroundIndex: 0,
        fit: "cover",
        caption: "",
        overlays: [
          {
            id: newId("layer"),
            kind: "text",
            text: template.message,
            x: 0.5,
            y: 0.83,
            color: "#FFFFFF",
            style: "label",
            size: 21,
          },
        ],
      },
    ]);
    setIndex(0);
    setSelectedId(undefined);
    setTemplatesOpen(false);
    setError(undefined);
    haptic();
  };

  const chooseMedia = async (camera = false) => {
    if (picking || publishing) return;
    const room = MAX_ITEMS - drafts.length;
    if (room <= 0) {
      setError(`You can share up to ${MAX_ITEMS} stories at once.`);
      return;
    }
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
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images", "videos"],
        quality: 0.88,
        allowsEditing: false,
        allowsMultipleSelection: !camera && room > 1,
        selectionLimit: room,
        orderedSelection: true,
        videoMaxDuration: 60,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
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
      const kept = drafts.filter((draft) => !isEmpty(draft));
      setDrafts([...kept, ...additions]);
      setIndex(kept.length);
      setSelectedId(undefined);
      setEditingTextId(undefined);
      haptic();
    } catch {
      setError(
        camera
          ? "We couldn't open the camera. Try your gallery instead."
          : "We couldn't open your photos. Check photo permissions and try again.",
      );
    } finally {
      setPicking(false);
    }
  };

  const share = async () => {
    if (!canPublish || publishLock.current) return;
    if (!user) {
      setError("Sign in to publish your story.");
      return;
    }
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
          organisationId: user.organisation?.id,
          mediaType,
          media: await resolveDraftMedia(draft, mediaType),
          caption: (draft.caption.trim() || layeredText).slice(0, 1000) || undefined,
          background: STORY_BACKGROUNDS[draft.backgroundIndex].color,
          fit: draft.fit,
          overlays,
        });
      }
      for (const input of inputs) {
        let story: PublishedStory;
        try {
          story = await publishStatus(input);
        } catch (publishErr) {
          console.warn("API publishStatus failed, fallback to local story storage:", publishErr);
          const localDraft: StoryDraft = {
            mediaType: input.mediaType,
            mediaUrl: input.media?.uri,
            durationMs: 5000,
            eventId: input.eventId,
            organisationId: user.organisation?.id,
            organizerName: user.organisation?.name || user.username || "You",
            organizerAvatar: user.organisation?.logoUrl || user.avatarUrl || "",
            background: input.background || "#101827",
            fit: input.fit ?? "cover",
            overlays: input.overlays ?? [],
            caption: input.caption,
            source: "local",
          };
          const publishedLocals = await publishLocalStories(user.id, [localDraft]);
          story = publishedLocals[0];
        }
        const organisation = user.organisation;
        addPublishedStory(
          organisation && !story.organisationId
            ? {
                ...story,
                organisationId: organisation.id,
                organizerName: organisation.name,
                organizerAvatar: organisation.logoUrl ?? "",
              }
            : story,
        );
        publishedCount += 1;
      }
      setPublished(true);
    } catch (problem) {
      const message = describeStatusError(
        problem,
        "Your story could not be published. Your design is still here — please try again.",
      );
      if (publishedCount > 0) {
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
    if (drafts.some((draft) => !isEmpty(draft) || draft.caption.trim())) {
      setConfirmDiscard(true);
      return;
    }
    if (editing) {
      setDrafts([]);
      setIndex(0);
      setError(undefined);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/business/dashboard" as never);
  };

  useEffect(() => {
    if (!editingTextId) return;
    const frame = requestAnimationFrame(() => textInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editingTextId]);

  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (publishing) return true;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return true;
    }
    if (editingTextId) {
      closeTextEditor();
      return true;
    }
    if (stickersOpen) {
      setStickersOpen(false);
      return true;
    }
    if (templatesOpen) {
      setTemplatesOpen(false);
      return true;
    }
    if (selectedId) {
      setSelectedId(undefined);
      return true;
    }
    if (editing) {
      requestClose();
      return true;
    }
    return false;
  };
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => backRef.current());
    return () => subscription.remove();
  }, []);

  if (published)
    return (
      <View style={[styles.root, { backgroundColor: "#060912" }]}>
        <PortalScreenHeader title="Story published" />
        <View style={styles.doneWrap}>
          <View style={styles.doneIconRing}>
            <Ionicons name="checkmark-sharp" size={42} color="#00A3FF" />
          </View>
          <Text style={[styles.doneHeading, { color: "#FFFFFF" }]}>Your story is published!</Text>
          <Text style={[styles.doneText, { color: "rgba(255,255,255,0.7)" }]}>
            Shared with your followers for 24 hours. They can view it right at the top of their home feed.
          </Text>
          <Pressable
            onPress={() => {
              if (user) openStories(user.organisation?.id ?? user.id, true);
            }}
            accessibilityRole="button"
            style={[styles.primaryButton, { backgroundColor: "#00A3FF" }]}
          >
            <Text style={styles.primaryText}>View your stories</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => router.replace("/(tabs)")} accessibilityRole="button">
            <Text style={[styles.linkText, { color: "#70BDF5" }]}>Back to home feed</Text>
          </Pressable>
        </View>
      </View>
    );

  const discardDialog = confirmDiscard ? (
    <View style={styles.dialogBackdrop}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>Discard this story?</Text>
        <Text style={styles.dialogText}>Your photos, text overlays, and stickers will be lost.</Text>
        <View style={styles.dialogActions}>
          <Pressable
            onPress={() => setConfirmDiscard(false)}
            accessibilityRole="button"
            style={styles.dialogButton}
          >
            <Text style={styles.dialogButtonText}>Keep editing</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setConfirmDiscard(false);
              setDrafts([]);
              setIndex(0);
              setSelectedId(undefined);
              setError(undefined);
            }}
            accessibilityRole="button"
            style={styles.dialogButton}
          >
            <Text style={[styles.dialogButtonText, { color: "#FF3B30" }]}>Discard</Text>
          </Pressable>
        </View>
      </View>
    </View>
  ) : null;

  /* ========================================================================= */
  /* PHASE 1: INSTAGRAM STORY CAMERA & STUDIO VIEWPORT                         */
  /* ========================================================================= */
  if (!editing || !current) {
    return (
      <View style={[styles.root, { backgroundColor: "#000000" }]}>
        {/* Top Studio Controls */}
        <View style={[styles.studioTopBar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={requestClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close story studio"
            style={styles.studioIconBtn}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          <View style={styles.studioTopRightTools}>
            <Pressable
              onPress={() => {
                setFlashOn((prev) => !prev);
                haptic();
              }}
              style={styles.studioIconBtn}
              accessibilityRole="button"
              accessibilityLabel={flashOn ? "Turn flash off" : "Turn flash on"}
            >
              <Ionicons
                name={flashOn ? "flash" : "flash-off-outline"}
                size={22}
                color={flashOn ? "#FACC15" : "#FFFFFF"}
              />
            </Pressable>
            <Pressable
              onPress={() => setTemplatesOpen(true)}
              style={styles.studioIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Templates"
            >
              <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Viewfinder Main Body */}
        <View style={styles.viewfinderContainer}>
          {/* Viewfinder Framing Screen */}
          <View style={styles.viewfinderFrame}>
            <View style={styles.viewfinderVignette}>
              {/* Corner framing brackets */}
              <View style={[styles.viewfinderCorner, styles.cornerTL]} />
              <View style={[styles.viewfinderCorner, styles.cornerTR]} />
              <View style={[styles.viewfinderCorner, styles.cornerBL]} />
              <View style={[styles.viewfinderCorner, styles.cornerBR]} />

              <View style={styles.viewfinderCenterPrompt}>
                <Ionicons name="camera-outline" size={54} color="rgba(255,255,255,0.4)" />
                <Text style={styles.viewfinderPromptTitle}>Story Studio</Text>
                <Text style={styles.viewfinderPromptSub}>
                  Tap shutter to take photo or pick from gallery
                </Text>
              </View>
            </View>

            {/* Left Toolbar (Creation Modes: Create/Type, Boomerang, Templates) */}
            <View style={styles.studioLeftToolbar}>
              <Pressable
                onPress={startTextStory}
                style={styles.studioSideTool}
                accessibilityRole="button"
                accessibilityLabel="Create text story"
              >
                <View style={styles.studioSideToolCircle}>
                  <Text style={styles.studioAaText}>Aa</Text>
                </View>
                <Text style={styles.studioSideToolLabel}>Create</Text>
              </Pressable>

              <Pressable
                onPress={() => setTemplatesOpen(true)}
                style={styles.studioSideTool}
                accessibilityRole="button"
                accessibilityLabel="Story templates"
              >
                <View style={styles.studioSideToolCircle}>
                  <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.studioSideToolLabel}>Templates</Text>
              </Pressable>

              <Pressable
                onPress={() => void chooseMedia(true)}
                style={styles.studioSideTool}
                accessibilityRole="button"
                accessibilityLabel="Camera snapshot"
              >
                <View style={styles.studioSideToolCircle}>
                  <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.studioSideToolLabel}>Snap</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.studioErrorText}>
            {error}
          </Text>
        ) : null}

        {/* Bottom Shutter Dock */}
        <View style={[styles.studioBottomDock, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          {/* Gallery Picker Tile (Left) */}
          <Pressable
            onPress={() => void chooseMedia()}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Pick from gallery"
            style={({ pressed }) => [styles.galleryTile, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.galleryTileInner}>
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.dockSubLabel}>Gallery</Text>
          </Pressable>

          {/* Central Instagram Shutter Button */}
          <Pressable
            onPress={() => void chooseMedia(true)}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Shutter button, tap to take photo"
            style={({ pressed }) => [styles.igShutterOuter, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <View style={styles.igShutterInner}>
              {picking ? (
                <ActivityIndicator color="#00A3FF" size="small" />
              ) : (
                <View style={styles.igShutterDot} />
              )}
            </View>
          </Pressable>

          {/* Camera Flip / Action (Right) */}
          <Pressable
            onPress={() => void chooseMedia(true)}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Switch camera"
            style={({ pressed }) => [styles.flipBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
            <Text style={styles.dockSubLabel}>Camera</Text>
          </Pressable>
        </View>

        {/* Mode Selector Ribbon (POST | STORY | REELS) */}
        <View style={styles.modeRibbon}>
          {(["TYPE", "STORY", "TEMPLATES"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => {
                setActiveStudioMode(mode);
                if (mode === "TYPE") startTextStory();
                else if (mode === "TEMPLATES") setTemplatesOpen(true);
              }}
              style={styles.modeItem}
            >
              <Text
                style={[
                  styles.modeItemText,
                  activeStudioMode === mode && styles.modeItemTextActive,
                ]}
              >
                {mode}
              </Text>
              {activeStudioMode === mode ? <View style={styles.modeActiveDot} /> : null}
            </Pressable>
          ))}
        </View>

        {/* Templates Bottom Sheet Modal */}
        <Modal
          visible={templatesOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTemplatesOpen(false)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setTemplatesOpen(false)}
            accessibilityLabel="Close templates"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Story Templates</Text>
              <Pressable onPress={() => setTemplatesOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={ink.text} />
              </Pressable>
            </View>
            <View style={styles.templateGrid}>
              {TEMPLATES.map((template) => (
                <Pressable
                  key={template.id}
                  onPress={() => useTemplate(template)}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${template.title} template`}
                  style={({ pressed }) => [styles.templateTile, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Image source={template.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.templateShade}>
                    <Text style={styles.templateTitle} numberOfLines={2}>
                      {template.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        {discardDialog}
      </View>
    );
  }

  /* ========================================================================= */
  /* PHASE 2: INSTAGRAM STORY EDITOR STUDIO (CANVAS & OVERLAYS)                */
  /* ========================================================================= */
  const mediaItem = hasMedia(current);
  const backgroundVisible = !mediaItem || current.fit === "contain";

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {/* 9:16 Portrait Canvas Stage */}
      <View style={[styles.stage, { top: topBar, bottom: footerHeight }]}>
        <Pressable
          style={{ width: canvasWidth }}
          onPress={() => {
            setSelectedId(undefined);
            Keyboard.dismiss();
          }}
          accessible={false}
        >
          <StoryCanvas
            image={current.image}
            background={background.color}
            fit={current.fit}
            overlays={current.overlays}
            editable={!editingTextId && !publishing}
            selectedId={selectedId}
            media={
              current.videoUri ? (
                <StoryVideo
                  key={current.videoUri}
                  uri={current.videoUri}
                  paused={publishing || Boolean(editingTextId)}
                  fit={current.fit}
                />
              ) : undefined
            }
            onSelect={(id) => {
              Keyboard.dismiss();
              setSelectedId(id);
            }}
            onTapLayer={(id) => {
              const layer = current.overlays.find((item) => item.id === id);
              if (layer?.kind === "text") openTextEditor(id);
            }}
            onMove={(id, x, y) => updateLayer(id, { x, y })}
            onDragChange={handleDragChange}
          />
        </Pressable>

        {/* Instagram Drag-to-Delete Trash Bin */}
        {draggingLayer ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.igTrashBin,
              {
                transform: [{ scale: trashScale }],
                backgroundColor: dragOverTrash ? "#FF3B30" : "rgba(30, 41, 59, 0.92)",
                borderColor: dragOverTrash ? "#FF453A" : "rgba(255, 255, 255, 0.3)",
              },
            ]}
          >
            <Ionicons name="trash" size={24} color="#FFFFFF" />
            <Text style={styles.igTrashLabel}>
              {dragOverTrash ? "Release to delete" : "Drag here to delete"}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Instagram Top Floating Action Toolbar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <RoundIcon
          icon="chevron-back"
          label={drafts.length > 1 ? "Discard stories" : "Discard story"}
          onPress={requestClose}
          disabled={publishing}
        />

        <View style={styles.topTools}>
          {selected ? (
            <RoundIcon
              icon="trash-outline"
              label="Remove selected layer"
              color="#FF3B30"
              onPress={() => removeLayer(selected.id)}
              disabled={publishing}
            />
          ) : null}

          {mediaItem ? (
            <RoundIcon
              icon={current.fit === "cover" ? "contract-outline" : "expand-outline"}
              label={current.fit === "cover" ? "Fit photo" : "Fill screen"}
              onPress={() => {
                updateCurrent({ fit: current.fit === "cover" ? "contain" : "cover" });
                haptic();
              }}
              disabled={publishing}
            />
          ) : null}

          {/* Stickers Icon */}
          <RoundIcon
            icon="happy-outline"
            label="Add sticker"
            onPress={() => {
              Keyboard.dismiss();
              setStickersOpen(true);
            }}
            disabled={publishing}
          />

          {/* Text Tool (Aa) */}
          <RoundIcon
            icon="text"
            label="Add text"
            onPress={() => openTextEditor()}
            disabled={publishing}
          />

          {/* Background Palette */}
          {backgroundVisible ? (
            <RoundIcon
              icon="color-palette-outline"
              label={`Background colour: ${background.name}. Tap to change`}
              onPress={() => {
                const next = (current.backgroundIndex + 1) % STORY_BACKGROUNDS.length;
                const previousForeground = STORY_BACKGROUNDS[current.backgroundIndex].foreground;
                updateCurrent((draft) => ({
                  backgroundIndex: next,
                  overlays: draft.overlays.map((layer) =>
                    layer.kind === "text" && layer.color === previousForeground
                      ? { ...layer, color: STORY_BACKGROUNDS[next].foreground }
                      : layer,
                  ),
                }));
                haptic();
              }}
              disabled={publishing}
            />
          ) : null}
        </View>
      </View>

      {/* Instagram Bottom Action Bar (Your Story Pill + Send Button) */}
      <StoryFooter offset={{ closed: 0, opened: insets.bottom }} style={styles.footerWrap}>
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[styles.footer, { paddingBottom: Math.max(14, insets.bottom + 8) }]}
        >
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.editorError}>
              {error}
            </Text>
          ) : null}

          {/* Multi-story carousel slide thumbnails */}
          {drafts.length > 1 || mediaItem ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
              keyboardShouldPersistTaps="handled"
            >
              {drafts.map((draft, i) => {
                const active = i === index;
                return (
                  <Pressable
                    key={draft.key}
                    onPress={() => selectItem(i)}
                    disabled={publishing}
                    accessibilityRole="button"
                    accessibilityLabel={`Story ${i + 1} of ${drafts.length}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.thumb,
                      {
                        borderColor: active ? "#00A3FF" : "transparent",
                        backgroundColor: STORY_BACKGROUNDS[draft.backgroundIndex].color,
                      },
                    ]}
                  >
                    {draft.image ? (
                      <Image source={draft.image} style={styles.thumbImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.thumbText} numberOfLines={2}>
                        {draft.overlays.find((l) => l.kind === "text")?.text || "Text"}
                      </Text>
                    )}
                    {drafts.length > 1 ? (
                      <Pressable
                        onPress={() => removeItem(i)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove story ${i + 1}`}
                        style={styles.thumbRemove}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}

              {drafts.length < MAX_ITEMS ? (
                <Pressable
                  onPress={() => void chooseMedia()}
                  disabled={picking || publishing}
                  accessibilityRole="button"
                  accessibilityLabel="Add another photo or video"
                  style={[styles.thumb, styles.thumbAdd]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}

          {/* Caption Input Pill (Optional single-line caption under story) */}
          <View style={styles.captionRow}>
            <View style={styles.captionBox}>
              <Ionicons name="chatbubble-outline" size={17} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={current.caption}
                onChangeText={(caption) => updateCurrent({ caption })}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                maxLength={300}
                style={styles.captionInput}
                editable={!publishing}
                returnKeyType="done"
              />
              {current.caption.trim().length > 0 && (
                <Pressable onPress={() => updateCurrent({ caption: "" })} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Instagram Sharing Row: "Your Story" Pill + "Close Friends" Pill + Circular Next Arrow */}
          <View style={styles.igShareBarRow}>
            {/* "Your Story" Action Pill */}
            <Pressable
              onPress={() => void share()}
              disabled={!canPublish}
              accessibilityRole="button"
              accessibilityLabel="Share to your story"
              style={({ pressed }) => [
                styles.igYourStoryPill,
                (!canPublish || publishing) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <StoryAvatar
                name={user?.organisation?.name ?? user?.username ?? "You"}
                uri={user?.organisation?.logoUrl ?? user?.avatarUrl}
                size={34}
                add={false}
              />
              <View style={styles.igStoryPillInfo}>
                <Text style={styles.igStoryPillTitle} numberOfLines={1}>Your story</Text>
                <Text style={styles.igStoryPillSub}>Share</Text>
              </View>
            </Pressable>

            {/* "Close Friends" Action Pill */}
            <Pressable
              onPress={() => void share()}
              disabled={!canPublish}
              accessibilityRole="button"
              accessibilityLabel="Share to close friends"
              style={({ pressed }) => [
                styles.igCloseFriendsPill,
                (!canPublish || publishing) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.igCloseFriendsIcon}>
                <Ionicons name="star" size={17} color="#FFFFFF" />
              </View>
              <View style={styles.igStoryPillInfo}>
                <Text style={styles.igStoryPillTitle} numberOfLines={1}>Close Friends</Text>
                <Text style={[styles.igStoryPillSub, { color: "#10D876" }]}>Share</Text>
              </View>
            </Pressable>

            {/* Circular Next / Send Button */}
            <Pressable
              onPress={() => void share()}
              disabled={!canPublish}
              accessibilityRole="button"
              accessibilityLabel={drafts.length > 1 ? `Publish ${drafts.length} stories` : "Publish story"}
              accessibilityState={{ disabled: !canPublish, busy: publishing }}
              style={({ pressed }) => [
                styles.igSendCircle,
                (!canPublish || publishing) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              {publishing ? (
                <ActivityIndicator color="#08111F" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={22} color="#08111F" />
              )}
              {drafts.length > 1 && !publishing ? (
                <View style={styles.sendBadge}>
                  <Text style={styles.sendBadgeText}>{drafts.length}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </StoryFooter>

      {/* Instagram Fullscreen Story Typography Studio */}
      {editingLayer ? (
        <View style={styles.igTextEditorBackdrop}>
          {/* Top Bar: Alignment, Highlight [A], Font Style, Done button */}
          <View style={[styles.igTextEditorTopBar, { paddingTop: insets.top + 10 }]}>
            <View style={styles.igTopLeftControls}>
              {/* Text Alignment Button */}
              <Pressable
                onPress={() => {
                  const currentAlign = editingLayer.align || "center";
                  const nextAlign =
                    currentAlign === "center" ? "left" : currentAlign === "left" ? "right" : "center";
                  updateLayer(editingLayer.id, { align: nextAlign });
                  haptic();
                }}
                style={styles.igTopIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Toggle alignment"
              >
                <Ionicons
                  name={
                    editingLayer.align === "left"
                      ? "menu-outline"
                      : editingLayer.align === "right"
                      ? "reorder-four-outline"
                      : "reorder-three-outline"
                  }
                  size={24}
                  color="#FFFFFF"
                />
              </Pressable>

              {/* Instagram Highlight Pill Button [A] */}
              <Pressable
                onPress={() => {
                  const nextStyle = editingLayer.style === "label" ? "bold" : "label";
                  updateLayer(editingLayer.id, { style: nextStyle });
                  haptic();
                }}
                style={[
                  styles.igTopIconBtn,
                  editingLayer.style === "label" && styles.igHighlightBtnActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle text highlight background"
              >
                <View
                  style={[
                    styles.igHighlightBadge,
                    editingLayer.style === "label" && styles.igHighlightBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.igHighlightBadgeLetter,
                      editingLayer.style === "label" && styles.igHighlightBadgeLetterActive,
                    ]}
                  >
                    A
                  </Text>
                </View>
              </Pressable>

              {/* Font Quick Switcher */}
              <Pressable
                onPress={() => {
                  const next = TEXT_STYLES[(TEXT_STYLES.indexOf(editingLayer.style) + 1) % TEXT_STYLES.length];
                  updateLayer(editingLayer.id, { style: next });
                  haptic();
                }}
                style={styles.igFontTagPill}
                accessibilityRole="button"
                accessibilityLabel="Change font style"
              >
                <Text style={styles.igFontTagPillText}>
                  Aa · {STYLE_LABEL[editingLayer.style]}
                </Text>
              </Pressable>
            </View>

            {/* Done Button */}
            <Pressable onPress={closeTextEditor} accessibilityRole="button" style={styles.igDoneBtn}>
              <Text style={styles.igDoneBtnText}>Done</Text>
            </Pressable>
          </View>

          {/* Left Vertical Font Size Slider */}
          <View style={[styles.igSizeSliderCol, { top: insets.top + 76 }]}>
            <Pressable
              onPress={() => updateLayer(editingLayer.id, { size: Math.min(48, editingLayer.size + 4) })}
              hitSlop={8}
              style={styles.igSliderBtn}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </Pressable>

            <View style={styles.igSliderTrack}>
              <View
                style={[
                  styles.igSliderThumb,
                  { bottom: `${Math.max(0, Math.min(100, ((editingLayer.size - 18) / 30) * 100))}%` },
                ]}
              />
            </View>

            <Pressable
              onPress={() => updateLayer(editingLayer.id, { size: Math.max(18, editingLayer.size - 4) })}
              hitSlop={8}
              style={styles.igSliderBtn}
            >
              <Ionicons name="remove" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Center Screen: The Live Text Input */}
          <Pressable
            style={styles.igCenterTypingStage}
            onPress={() => textInputRef.current?.focus()}
            accessible={false}
          >
            <TextInput
              ref={textInputRef}
              value={editingLayer.text}
              onChangeText={(text) => updateLayer(editingLayer.id, { text })}
              placeholder="Type something..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              multiline
              maxLength={250}
              textAlign={editingLayer.align || "center"}
              accessibilityLabel="Story text"
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={closeTextEditor}
              onKeyPress={(e) => {
                if (Platform.OS === "web" && (e.nativeEvent as any)?.key === "Escape") {
                  closeTextEditor();
                }
              }}
              style={[
                styles.igCenterTypingInput,
                {
                  color:
                    editingLayer.style === "label" && (editingLayer.color === "#08111F" || editingLayer.color === "#FFFFFF")
                      ? "#08111F"
                      : editingLayer.color,
                  fontSize: editingLayer.size,
                  lineHeight: editingLayer.size * 1.25,
                  textAlign: editingLayer.align || "center",
                  fontFamily: editingLayer.style === "classic" ? "Inter_500Medium" : "Inter_700Bold",
                  backgroundColor:
                    editingLayer.style === "label"
                      ? editingLayer.color === "#08111F" || editingLayer.color === "#FFFFFF"
                        ? "#FFFFFF"
                        : "#08111F"
                      : "transparent",
                },
                editingLayer.style === "label"
                  ? styles.igLabelPillBox
                  : styles.igShadowTextBox,
              ]}
            />
          </Pressable>

          {/* Bottom Dock (Directly Above Keyboard): Colors + Font Carousel */}
          <View style={[styles.igTypingBottomDock, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
            {/* Color Palette Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.igColorPaletteRow}
              keyboardShouldPersistTaps="handled"
            >
              {TEXT_COLORS.map((color) => {
                const isSelected = editingLayer.color === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      updateLayer(editingLayer.id, { color });
                      haptic();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Text colour ${color}`}
                    style={[
                      styles.igColorDotWrap,
                      isSelected && styles.igColorDotWrapSelected,
                    ]}
                  >
                    <View style={[styles.igColorDotCircle, { backgroundColor: color }]} />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Font Style Pills Row */}
            <View style={styles.igFontStyleRow}>
              {TEXT_STYLES.map((styleKey) => {
                const isActive = editingLayer.style === styleKey;
                return (
                  <Pressable
                    key={styleKey}
                    onPress={() => {
                      updateLayer(editingLayer.id, { style: styleKey });
                      haptic();
                    }}
                    style={[
                      styles.igFontStylePill,
                      isActive && styles.igFontStylePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.igFontStylePillText,
                        isActive && styles.igFontStylePillTextActive,
                      ]}
                    >
                      {STYLE_LABEL[styleKey]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {/* Instagram Sticker Sheet */}
      <Modal
        visible={stickersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStickersOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setStickersOpen(false)}
          accessibilityLabel="Close stickers"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Stickers & Badges</Text>
            <Text style={styles.sheetCount}>
              {current.overlays.length}/{MAX_LAYERS}
            </Text>
          </View>

          {/* Sticker Category Tabs */}
          <View style={styles.stickerFilterRow}>
            {(["ALL", "INTERACTIVE", "VIBES", "EMOJIS"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveStickerTab(tab);
                  haptic();
                }}
                style={[
                  styles.stickerFilterPill,
                  activeStickerTab === tab && styles.stickerFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.stickerFilterPillText,
                    activeStickerTab === tab && styles.stickerFilterPillTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.stickerScroll} contentContainerStyle={styles.stickerGrid} showsVerticalScrollIndicator={false}>
            {STICKER_ITEMS.filter((item) => {
              if (activeStickerTab === "ALL") return true;
              if (activeStickerTab === "INTERACTIVE") return item.type === "interactive";
              if (activeStickerTab === "VIBES") return item.type === "vibes";
              if (activeStickerTab === "EMOJIS") return item.type === "emojis";
              return true;
            }).map((item) => (
              <Pressable
                key={item.label}
                disabled={current.overlays.length >= MAX_LAYERS}
                onPress={() => {
                  if (addLayer(item.label, "sticker")) setStickersOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.label} sticker`}
                style={({ pressed }) => [
                  styles.sticker,
                  item.type === "interactive" && styles.stickerInteractive,
                  {
                    opacity: current.overlays.length >= MAX_LAYERS ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stickerText,
                    item.label.length <= 4 && !/[a-zA-Z0-9]/.test(item.label) && styles.stickerEmoji,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {current.overlays.length >= MAX_LAYERS ? (
            <Text style={styles.sheetNote}>Remove a text or sticker to add another.</Text>
          ) : null}
        </View>
      </Modal>

      {discardDialog}
    </View>
  );
}

function createStyles(INK: Ink) {
  return StyleSheet.create({
    root: { flex: 1 },

    // Instagram Studio Camera Viewport
    studioTopBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    studioTopRightTools: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    studioIconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    viewfinderContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    viewfinderFrame: {
      flex: 1,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: "#111420",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      justifyContent: "center",
      alignItems: "center",
    },
    viewfinderVignette: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
      alignItems: "center",
    },
    viewfinderCorner: {
      position: "absolute",
      width: 24,
      height: 24,
      borderColor: "rgba(255,255,255,0.5)",
    },
    cornerTL: { top: 18, left: 18, borderTopWidth: 2, borderLeftWidth: 2 },
    cornerTR: { top: 18, right: 18, borderTopWidth: 2, borderRightWidth: 2 },
    cornerBL: { bottom: 18, left: 18, borderBottomWidth: 2, borderLeftWidth: 2 },
    cornerBR: { bottom: 18, right: 18, borderBottomWidth: 2, borderRightWidth: 2 },
    viewfinderCenterPrompt: {
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 24,
    },
    viewfinderPromptTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Inter_700Bold",
    },
    viewfinderPromptSub: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
    },

    // Left Creation Sidebar Toolbar
    studioLeftToolbar: {
      position: "absolute",
      left: 14,
      top: "24%",
      gap: 18,
    },
    studioSideTool: {
      alignItems: "center",
      gap: 4,
    },
    studioSideToolCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    studioAaText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_800ExtraBold",
    },
    studioSideToolLabel: {
      color: "#FFFFFF",
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
    },

    studioErrorText: {
      color: "#FF3B30",
      fontSize: 13,
      textAlign: "center",
      marginHorizontal: 16,
      marginBottom: 6,
      fontFamily: "Inter_500Medium",
    },

    // Bottom Shutter Controls Dock
    studioBottomDock: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 24,
      paddingTop: 10,
    },
    galleryTile: {
      alignItems: "center",
      gap: 5,
    },
    galleryTileInner: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    dockSubLabel: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    igShutterOuter: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 4.5,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    igShutterInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    igShutterDot: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: "#00A3FF",
    },
    flipBtn: {
      alignItems: "center",
      gap: 5,
    },

    // Mode Selector Ribbon
    modeRibbon: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 24,
      paddingBottom: 8,
    },
    modeItem: {
      alignItems: "center",
      paddingVertical: 4,
    },
    modeItemText: {
      color: "rgba(255,255,255,0.45)",
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
    },
    modeItemTextActive: {
      color: "#FFFFFF",
    },
    modeActiveDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#FFFFFF",
      marginTop: 2,
    },

    // Editor Styles
    stage: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    topTools: {
      flexDirection: "row",
      gap: 8,
    },
    roundIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    footerWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },
    footer: {
      backgroundColor: "rgba(6, 9, 18, 0.96)",
      paddingTop: 10,
      paddingHorizontal: 14,
      gap: 10,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    editorError: {
      color: "#FF3B30",
      fontSize: 13,
      textAlign: "center",
      fontFamily: "Inter_500Medium",
    },

    thumbRow: {
      gap: 8,
      paddingVertical: 2,
    },
    thumb: {
      width: 48,
      height: 64,
      borderRadius: 10,
      borderWidth: 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    thumbImage: {
      ...StyleSheet.absoluteFill,
    },
    thumbText: {
      color: "#FFFFFF",
      fontSize: 9,
      textAlign: "center",
      paddingHorizontal: 3,
      fontFamily: "Inter_600SemiBold",
    },
    thumbRemove: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "rgba(0,0,0,0.75)",
      alignItems: "center",
      justifyContent: "center",
    },
    thumbAdd: {
      backgroundColor: "rgba(255,255,255,0.1)",
      borderColor: "rgba(255,255,255,0.25)",
      borderStyle: "dashed",
    },

    captionRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    captionBox: {
      flex: 1,
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 22,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    captionInput: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      paddingVertical: Platform.OS === "ios" ? 10 : 6,
    },

    // Instagram Sharing Row
    igShareBarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 4,
      gap: 12,
    },
    igYourStoryPill: {
      flex: 1,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(255,255,255,0.12)",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    igCloseFriendsPill: {
      flex: 1,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(16, 216, 118, 0.12)",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: "rgba(16, 216, 118, 0.35)",
    },
    igCloseFriendsIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#10D876",
      alignItems: "center",
      justifyContent: "center",
    },
    igStoryPillInfo: {
      flex: 1,
      justifyContent: "center",
    },
    igStoryPillTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Inter_700Bold",
    },
    igStoryPillSub: {
      color: "rgba(255,255,255,0.65)",
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
    igSendCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    sendBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: "#00A3FF",
      alignItems: "center",
      justifyContent: "center",
    },
    sendBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontFamily: "Inter_700Bold",
    },

    // Instagram Typography Studio
    igTextEditorBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.76)",
      zIndex: 99,
      justifyContent: "space-between",
    },
    igTextEditorTopBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    igTopLeftControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    igTopIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    igHighlightBtnActive: {
      backgroundColor: "#FFFFFF",
    },
    igHighlightBadge: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    igHighlightBadgeActive: {
      backgroundColor: "#08111F",
      borderColor: "#08111F",
    },
    igHighlightBadgeLetter: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Inter_800ExtraBold",
    },
    igHighlightBadgeLetterActive: {
      color: "#FFFFFF",
    },
    igFontTagPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
    igFontTagPillText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    igDoneBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
    },
    igDoneBtnText: {
      color: "#08111F",
      fontSize: 14,
      fontFamily: "Inter_700Bold",
    },

    // Vertical Font Size Slider
    igSizeSliderCol: {
      position: "absolute",
      left: 14,
      alignItems: "center",
      gap: 6,
      zIndex: 10,
    },
    igSliderBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(255, 255, 255, 0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    igSliderTrack: {
      width: 4,
      height: 110,
      borderRadius: 2,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      position: "relative",
    },
    igSliderThumb: {
      position: "absolute",
      left: -6,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    },

    // Center Typing Stage
    igCenterTypingStage: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    igCenterTypingInput: {
      minWidth: 160,
      maxWidth: "100%",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    igLabelPillBox: {
      borderRadius: 12,
      overflow: "hidden",
    },
    igShadowTextBox: {
      textShadowColor: "rgba(0, 0, 0, 0.85)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },

    // Bottom Typing Dock (Colors & Font Pills)
    igTypingBottomDock: {
      paddingHorizontal: 12,
      paddingBottom: 16,
      gap: 12,
    },
    igColorPaletteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    igColorDotWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    igColorDotWrapSelected: {
      borderWidth: 2,
      borderColor: "#FFFFFF",
      transform: [{ scale: 1.15 }],
    },
    igColorDotCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    igFontStyleRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 2,
    },
    igFontStylePill: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.14)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    igFontStylePillActive: {
      backgroundColor: "#FFFFFF",
      borderColor: "#FFFFFF",
    },
    igFontStylePillText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    igFontStylePillTextActive: {
      color: "#08111F",
      fontFamily: "Inter_700Bold",
    },

    // Instagram Drag-to-Delete Trash Bin
    igTrashBin: {
      position: "absolute",
      bottom: 24,
      alignSelf: "center",
      minWidth: 70,
      paddingHorizontal: 14,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      borderWidth: 1.5,
      zIndex: 50,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
    },
    igTrashLabel: {
      color: "#FFFFFF",
      fontSize: 10.5,
      fontFamily: "Inter_600SemiBold",
    },

    // Stickers
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
      backgroundColor: "#121827",
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 18,
      paddingTop: 12,
      gap: 12,
      maxHeight: "75%",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sheetTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    sheetCount: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    stickerFilterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 2,
    },
    stickerFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    stickerFilterPillActive: {
      backgroundColor: "#00A3FF",
      borderColor: "#00A3FF",
    },
    stickerFilterPillText: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    stickerFilterPillTextActive: {
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    stickerScroll: {
      maxHeight: 280,
    },
    stickerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingVertical: 6,
    },
    sticker: {
      minWidth: 56,
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
    },
    stickerInteractive: {
      backgroundColor: "rgba(0, 163, 255, 0.14)",
      borderColor: "rgba(0, 163, 255, 0.35)",
    },
    stickerText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Inter_700Bold",
    },
    stickerEmoji: {
      fontSize: 26,
    },
    sheetNote: {
      color: "rgba(255,255,255,0.5)",
      fontSize: 12,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
    },

    templateGrid: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 10,
    },
    templateTile: {
      flex: 1,
      aspectRatio: 9 / 16,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "#1A2234",
    },
    templateShade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: 8,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    templateTitle: {
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },

    // Discard dialog
    dialogBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.65)",
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
      zIndex: 999,
    },
    dialog: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: "#182032",
      borderRadius: 22,
      padding: 22,
      gap: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    dialogTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    dialogText: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Inter_400Regular",
    },
    dialogActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
    },
    dialogButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      justifyContent: "center",
    },
    dialogButtonText: {
      color: "#00A3FF",
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },

    // Done confirmation
    doneWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
      gap: 16,
    },
    doneIconRing: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "rgba(0, 163, 255, 0.15)",
      borderWidth: 2,
      borderColor: "#00A3FF",
      alignItems: "center",
      justifyContent: "center",
    },
    doneHeading: {
      fontSize: 22,
      lineHeight: 28,
      textAlign: "center",
      fontFamily: "Inter_700Bold",
    },
    doneText: {
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
    },
    primaryButton: {
      minHeight: 52,
      paddingHorizontal: 24,
      borderRadius: 26,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      width: "100%",
      maxWidth: 280,
    },
    primaryText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: "Inter_700Bold",
    },
    linkText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
