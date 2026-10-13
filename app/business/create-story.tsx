import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Keyboard, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";

import { PortalScreenHeader } from "@/components/PortalScreenHeader";
import { STORY_BACKGROUNDS, StoryCanvas, type StoryOverlay } from "@/components/StoryCanvas";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

const StoryScrollView = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;
const StoryFooter = Platform.OS === "web" ? View : KeyboardStickyView;
const TEXT_COLORS = ["#FFFFFF", "#70BDF5", "#08111F"];
const STICKERS = ["🔥", "✨", "🎶", "🎉", "💙", "📍", "Tonight", "New drop", "See you there", "Tickets out"];
const TEXT_STYLES = ["bold", "classic", "label"] as const;
const TEMPLATES = [
  { id: "fiesta", title: "Friday energy", subtitle: "Make an announcement", image: require("../../assets/images/friday-fiesta.jpeg"), message: "Your Friday plans, sorted. 🔥" },
  { id: "grill", title: "Live moments", subtitle: "Set the mood", image: require("../../assets/images/grill-and-chill.jpeg"), message: "Good music. Great company. ✨" },
  { id: "rewind", title: "What's happening", subtitle: "Keep people in the loop", image: require("../../assets/images/thursday-rewind.jpeg"), message: "Something good is on the way. 🎶" },
] as const;
const TOOLS = [
  { id: "text", label: "Text", icon: "text-outline" },
  { id: "stickers", label: "Stickers", icon: "happy-outline" },
  { id: "background", label: "Colour", icon: "color-palette-outline" },
  { id: "layout", label: "Layout", icon: "crop-outline" },
] as const;
type Tool = (typeof TOOLS)[number]["id"];

function Choice({ label, selected, onPress, disabled = false }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  const palette = useOrganiserPalette();
  return (
    <Pressable
      onPress={onPress} disabled={disabled}
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [styles.choice, { backgroundColor: selected ? palette.blueSoft : palette.surfaceRaised, borderColor: selected ? palette.accent : palette.line, opacity: pressed || disabled ? 0.6 : 1 }]}
    >
      <Text style={[styles.choiceText, { color: selected ? palette.accent : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function CreateStoryScreen() {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const textInputRef = useRef<TextInput>(null);
  const nextLayerId = useRef(0);
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState<ImageSourcePropType | undefined>();
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [fit, setFit] = useState<"cover" | "contain">("contain");
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activeTool, setActiveTool] = useState<Tool | undefined>();
  const [pickError, setPickError] = useState<string | undefined>();
  const [picking, setPicking] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [footerHeight, setFooterHeight] = useState(82);
  const selected = overlays.find((layer) => layer.id === selectedId);
  const background = STORY_BACKGROUNDS[backgroundIndex];
  const hasContent = Boolean(image) || overlays.some((layer) => layer.text.trim());
  const canvasWidth = Math.min(width - 36, Math.max(165, (height - insets.top - insets.bottom - 300) * 9 / 16));
  const organisationName = user?.organisation?.name ?? user?.businessName ?? "Your organisation";
  const selectedTextId = selected?.kind === "text" ? selected.id : undefined;

  useEffect(() => {
    if (activeTool !== "text" || !selectedTextId) return;
    const frame = requestAnimationFrame(() => textInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [activeTool, selectedTextId]);

  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
  };
  const updateLayer = (id: string, patch: Partial<StoryOverlay>) => {
    setOverlays((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  };
  const addLayer = (text: string, kind: StoryOverlay["kind"]) => {
    if (overlays.length >= 8) {
      setPickError("You can add up to 8 layers. Remove one to add another.");
      return;
    }
    const id = `layer-${++nextLayerId.current}`;
    setOverlays((current) => [...current, {
      id, text, kind, x: 0.5, y: kind === "text" ? 0.46 : 0.7 - (current.length % 3) * 0.12,
      color: background.foreground, style: kind === "text" ? "bold" : "label", size: kind === "text" ? 28 : 23,
    }]);
    setSelectedId(id);
    setPickError(undefined);
    haptic();
  };
  const chooseTool = (tool: Tool) => {
    if (tool !== "text") Keyboard.dismiss();
    setActiveTool((current) => current === tool && tool !== "text" ? undefined : tool);
    if (tool === "text" && selected?.kind !== "text") {
      const existing = overlays.find((layer) => layer.kind === "text");
      if (existing) setSelectedId(existing.id);
      else addLayer("Your message", "text");
    }
    haptic();
  };
  const chooseMedia = async (camera = false) => {
    if (picking) return;
    setPicking(true);
    setPickError(undefined);
    Keyboard.dismiss();
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setPickError("Allow camera access in your phone settings, or choose a photo from your gallery.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        setImage({ uri: result.assets[0].uri });
        setEditing(true);
        setActiveTool(undefined);
        setFit("contain");
        haptic();
      }
    } catch {
      setPickError(camera ? "We couldn't open the camera. Try your gallery instead." : "We couldn't open your photos. Check photo permissions and try again.");
    } finally {
      setPicking(false);
    }
  };
  const useTemplate = (template: (typeof TEMPLATES)[number]) => {
    setImage(template.image);
    setOverlays([{ id: `layer-${++nextLayerId.current}`, kind: "text", text: template.message, x: 0.5, y: 0.83, color: "#FFFFFF", style: "label", size: 21 }]);
    setSelectedId(undefined);
    setEditing(true);
    setActiveTool(undefined);
    setFit("contain");
    haptic();
  };
  // The existing stories flow is a UI demo; do not imply a server publication succeeded.
  const share = () => {
    if (!hasContent) return;
    Keyboard.dismiss();
    Alert.alert("Story preview ready", "Your story design is ready. Publishing to the feed will be available when story sharing is connected.", [{ text: "Keep editing" }]);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <PortalScreenHeader title="Create Story" icon="close" compact={keyboardVisible} />
      <StoryScrollView
        style={styles.flex} contentContainerStyle={styles.content}
        bottomOffset={editing ? footerHeight + 24 : 24} extraKeyboardSpace={editing ? footerHeight : 0}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        disableScrollOnKeyboardHide showsVerticalScrollIndicator={false}
      >
        {!editing ? (
          <>
            <View style={styles.intro}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR NEXT MOMENT</Text>
              <Text style={[styles.heading, { color: palette.text }]}>Make it a story.</Text>
              <Text style={[styles.description, { color: palette.muted }]}>A poster, a backstage moment, a quick announcement. Make it yours with text and stickers.</Text>
            </View>
            <View style={styles.entryRow}>
              <Pressable onPress={() => void chooseMedia(true)} disabled={picking} accessibilityRole="button" accessibilityState={{ disabled: picking }} style={({ pressed }) => [styles.entryCard, { backgroundColor: palette.blue, opacity: pressed || picking ? 0.75 : 1 }]}>
                <Ionicons name="camera-outline" size={29} color="#FFFFFF" /><Text style={styles.entryTitle}>Camera</Text><Text style={styles.entrySubtitle}>Capture now</Text>
              </Pressable>
              <Pressable onPress={() => void chooseMedia()} disabled={picking} accessibilityRole="button" accessibilityState={{ disabled: picking }} style={({ pressed }) => [styles.entryCard, { backgroundColor: palette.surface, borderColor: palette.line, opacity: pressed || picking ? 0.75 : 1 }]}>
                <Ionicons name="images-outline" size={29} color={palette.accent} /><Text style={[styles.entryTitle, { color: palette.text }]}>Gallery</Text><Text style={[styles.entrySubtitle, { color: palette.muted }]}>Choose a photo</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => { setEditing(true); setActiveTool("text"); addLayer("Your message", "text"); }} accessibilityRole="button" style={[styles.textEntry, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <View style={[styles.textEntryIcon, { backgroundColor: palette.blueSoft }]}><Text style={[styles.aa, { color: palette.accent }]}>Aa</Text></View>
              <View style={styles.flex}><Text style={[styles.optionTitle, { color: palette.text }]}>Say it with text</Text><Text style={[styles.smallText, { color: palette.muted }]}>Start with a colour and a message</Text></View><Ionicons name="arrow-forward" size={20} color={palette.accent} />
            </Pressable>
            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: palette.text }]}>Start with a little inspiration</Text><Text style={[styles.smallText, { color: palette.muted }]}>Editable templates</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
              {TEMPLATES.map((template) => (
                <Pressable key={template.id} onPress={() => useTemplate(template)} accessibilityRole="button" accessibilityLabel={`Use ${template.title} story template`} style={[styles.templateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                  <Image source={template.image} style={styles.templateImage} resizeMode="cover" />
                  <View style={styles.templateCopy}><Text style={[styles.templateTitle, { color: palette.text }]}>{template.title}</Text><Text style={[styles.templateSubtitle, { color: palette.muted }]}>{template.subtitle}</Text></View>
                  <View style={styles.templateBadge}><Ionicons name="sparkles" size={12} color="#FFFFFF" /><Text style={styles.templateBadgeText}>Try it</Text></View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={[styles.tip, { backgroundColor: palette.blueSoft }]}><Ionicons name="bulb-outline" size={20} color={palette.accent} /><Text style={[styles.tipText, { color: palette.text }]}>Keep the moment simple. Add a short message, a sticker, and you're ready to go.</Text></View>
          </>
        ) : (
          <>
            <View style={styles.editorMeta}>
              <View style={styles.flex}><Text style={[styles.editorTitle, { color: palette.text }]} numberOfLines={1}>{organisationName}</Text><Text style={[styles.smallText, { color: palette.muted }]}>Drag text and stickers to place them</Text></View>
              <Pressable onPress={() => { Keyboard.dismiss(); setPreviewing(true); }} style={[styles.previewBtn, { backgroundColor: palette.surface, borderColor: palette.line }]} accessibilityRole="button"><Ionicons name="expand-outline" size={18} color={palette.text} /><Text style={[styles.choiceText, { color: palette.text }]}>Preview</Text></Pressable>
            </View>
            <View style={[styles.canvasFrame, { width: canvasWidth, borderColor: palette.line }]}>
              <StoryCanvas image={image} background={background.color} fit={fit} overlays={overlays} editable selectedId={selectedId}
                onSelect={(id) => { Keyboard.dismiss(); setSelectedId(id); setActiveTool(undefined); }}
                onMove={(id, x, y) => updateLayer(id, { x, y })}
              />
            </View>
            <View style={styles.toolRow}>{TOOLS.map((tool) => (
              <Pressable key={tool.id} onPress={() => chooseTool(tool.id)} accessibilityRole="button" accessibilityState={{ selected: activeTool === tool.id }} style={[styles.tool, { backgroundColor: activeTool === tool.id ? palette.blueSoft : palette.surface, borderColor: activeTool === tool.id ? palette.accent : palette.line }]}>
                <Ionicons name={tool.icon} size={21} color={activeTool === tool.id ? palette.accent : palette.text} /><Text style={[styles.toolLabel, { color: activeTool === tool.id ? palette.accent : palette.text }]}>{tool.label}</Text>
              </Pressable>
            ))}</View>
            {activeTool === "text" && selected?.kind === "text" ? (
              <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={styles.panelHeading}><Text style={[styles.optionTitle, { color: palette.text }]}>Your message</Text><Pressable onPress={() => { Keyboard.dismiss(); setActiveTool(undefined); }} accessibilityRole="button" hitSlop={8}><Text style={[styles.doneText, { color: palette.accent }]}>Done</Text></Pressable></View>
                <TextInput ref={textInputRef} value={selected.text} onChangeText={(value) => updateLayer(selected.id, { text: value })}
                  placeholder="Write something worth sharing…" placeholderTextColor={palette.muted}
                  multiline maxLength={200} selectTextOnFocus textAlignVertical="top" accessibilityLabel="Story text"
                  style={[styles.textInput, { color: palette.text, backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}
                />
                <View style={styles.styleRow}>{TEXT_STYLES.map((style) => <Choice key={style} label={style.charAt(0).toUpperCase() + style.slice(1)} selected={selected.style === style} onPress={() => updateLayer(selected.id, { style })} />)}</View>
                <View style={styles.textOptions}>
                  <View style={styles.swatchRow}>{TEXT_COLORS.map((color) => <Pressable key={color} onPress={() => updateLayer(selected.id, { color })} accessibilityRole="button" accessibilityLabel={`Use ${color === "#FFFFFF" ? "white" : color === "#70BDF5" ? "blue" : "black"} text`} style={[styles.swatch, { backgroundColor: color, borderColor: selected.color === color ? palette.accent : palette.line, borderWidth: selected.color === color ? 3 : 1 }]} />)}</View>
                  <View style={styles.sizeButtons}><Pressable onPress={() => updateLayer(selected.id, { size: Math.max(16, selected.size - 3) })} accessibilityRole="button" accessibilityLabel="Smaller text" style={styles.smallButton}><Ionicons name="remove" size={20} color={palette.text} /></Pressable><Text style={[styles.smallText, { color: palette.muted }]}>Size</Text><Pressable onPress={() => updateLayer(selected.id, { size: Math.min(46, selected.size + 3) })} accessibilityRole="button" accessibilityLabel="Larger text" style={styles.smallButton}><Ionicons name="add" size={20} color={palette.text} /></Pressable></View>
                </View>
                <Choice label="Add another text layer" onPress={() => addLayer("Your message", "text")} disabled={overlays.length >= 8} />
              </View>
            ) : null}
            {activeTool === "stickers" ? (
              <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={styles.panelHeading}><Text style={[styles.optionTitle, { color: palette.text }]}>Add a little personality</Text><Text style={[styles.smallText, { color: palette.muted }]}>{overlays.length}/8 layers</Text></View>
                <View style={styles.stickerGrid}>{STICKERS.map((sticker) => <Choice key={sticker} label={sticker} onPress={() => addLayer(sticker, "sticker")} disabled={overlays.length >= 8} />)}</View>
              </View>
            ) : null}
            {activeTool === "background" ? (
              <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Set the mood</Text>
                <View style={styles.backgroundRow}>{STORY_BACKGROUNDS.map((item, index) => <Pressable key={item.name} onPress={() => { setBackgroundIndex(index); haptic(); }} accessibilityRole="radio" accessibilityState={{ checked: backgroundIndex === index }} accessibilityLabel={`${item.name} background`} style={styles.backgroundOption}><View style={[styles.backgroundSwatch, { backgroundColor: item.color, borderColor: index === backgroundIndex ? palette.accent : palette.line }]}>{index === backgroundIndex ? <Ionicons name="checkmark" size={21} color={item.foreground} /> : null}</View><Text style={[styles.smallText, { color: palette.muted }]}>{item.name}</Text></Pressable>)}</View>
                {image ? <Text style={[styles.smallText, { color: palette.muted }]}>Background colours appear around a fitted photo.</Text> : null}
              </View>
            ) : null}
            {activeTool === "layout" ? (
              <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Frame your photo</Text>
                <View style={styles.styleRow}><Choice label="Full photo" selected={fit === "contain"} onPress={() => setFit("contain")} disabled={!image} /><Choice label="Fill screen" selected={fit === "cover"} onPress={() => setFit("cover")} disabled={!image} /></View>
                <Text style={[styles.smallText, { color: palette.muted }]}>{image ? "Full photo keeps every detail of your poster visible." : "Add a photo to adjust how it fills your story."}</Text>
                {image ? <Choice label="Remove photo" onPress={() => setImage(undefined)} /> : null}
              </View>
            ) : null}
            {selected ? (
              <View style={styles.selectedRow}><Text style={[styles.smallText, styles.flex, { color: palette.muted }]} numberOfLines={1}>Selected: {selected.text || "Text"}</Text><Pressable onPress={() => { setOverlays((current) => current.filter((layer) => layer.id !== selected.id)); setSelectedId(undefined); Keyboard.dismiss(); }} accessibilityRole="button" accessibilityLabel="Remove selected layer" style={styles.smallButton}><Ionicons name="trash-outline" size={19} color={palette.danger} /></Pressable><Pressable onPress={() => { setSelectedId(undefined); setActiveTool(undefined); Keyboard.dismiss(); }} accessibilityRole="button" accessibilityLabel="Deselect layer" style={styles.smallButton}><Ionicons name="checkmark" size={22} color={palette.accent} /></Pressable></View>
            ) : null}
          </>
        )}
        {picking ? <ActivityIndicator color={palette.accent} accessibilityLabel="Opening media picker" /> : null}
        {pickError ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: palette.danger }]}>{pickError}</Text> : null}
      </StoryScrollView>
      {editing ? (
        <StoryFooter offset={{ closed: 0, opened: insets.bottom }}>
          <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { backgroundColor: palette.canvas, borderColor: palette.line, paddingBottom: Math.max(12, insets.bottom) }]}>
            <Pressable onPress={() => void chooseMedia()} disabled={picking} accessibilityRole="button" accessibilityLabel="Choose or change story photo" style={[styles.footerGallery, { backgroundColor: palette.surface, borderColor: palette.line }]}><Ionicons name="images-outline" size={22} color={palette.text} /></Pressable>
            <Pressable onPress={share} disabled={!hasContent} accessibilityRole="button" accessibilityState={{ disabled: !hasContent }} style={[styles.shareButton, { backgroundColor: hasContent ? palette.blue : palette.surfaceRaised }]}><Text style={[styles.shareText, { color: hasContent ? "#FFFFFF" : palette.muted }]}>Share story</Text><Ionicons name="arrow-forward" size={20} color={hasContent ? "#FFFFFF" : palette.muted} /></Pressable>
          </View>
        </StoryFooter>
      ) : <View style={{ height: insets.bottom }} />}
      <Modal visible={previewing} animationType="fade" onRequestClose={() => setPreviewing(false)}>
        <View style={[styles.fullPreview, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.fullPreviewHeader}><View style={styles.flex}><Text style={styles.fullPreviewTitle}>{organisationName}</Text><Text style={styles.fullPreviewSubtitle}>Story preview</Text></View><Pressable onPress={() => setPreviewing(false)} accessibilityRole="button" accessibilityLabel="Close preview" style={styles.smallButton}><Ionicons name="close" size={26} color="#FFFFFF" /></Pressable></View>
          <View style={[styles.fullCanvas, { width: Math.max(120, Math.min(width - 32, (height - insets.top - insets.bottom - 160) * 9 / 16)) }]}><StoryCanvas image={image} background={background.color} fit={fit} overlays={overlays} /></View>
          <Pressable onPress={() => setPreviewing(false)} accessibilityRole="button" style={styles.keepEditing}><Ionicons name="create-outline" size={19} color="#FFFFFF" /><Text style={styles.shareText}>Keep editing</Text></Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  content: { padding: 18, paddingBottom: 28, gap: 18 },
  intro: { gap: 9, paddingTop: 6 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  heading: { fontSize: 31, lineHeight: 38, letterSpacing: -1, fontFamily: "Inter_700Bold" },
  description: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  entryRow: { flexDirection: "row", gap: 12 },
  entryCard: { flex: 1, minHeight: 130, borderRadius: 21, borderWidth: 1, borderColor: "transparent", padding: 18, gap: 8, justifyContent: "center" },
  entryTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  entrySubtitle: { color: "#E0F0FC", fontSize: 12, fontFamily: "Inter_400Regular" },
  textEntry: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 19, padding: 14, borderWidth: 1 },
  textEntryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aa: { fontSize: 22, fontFamily: "Inter_700Bold" },
  optionTitle: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  smallText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  sectionHeading: { gap: 4, paddingTop: 4 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  templateRow: { gap: 12, paddingBottom: 2 },
  templateCard: { width: 172, borderWidth: 1, borderRadius: 19, overflow: "hidden" },
  templateImage: { width: "100%", height: 228 },
  templateCopy: { padding: 12, gap: 4 },
  templateTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  templateSubtitle: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  templateBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(8,11,16,0.85)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 5 },
  templateBadgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tip: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 17 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular" },
  editorMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  editorTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewBtn: { minHeight: 40, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  canvasFrame: { alignSelf: "center", borderRadius: 23, overflow: "hidden", borderWidth: 1 },
  toolRow: { flexDirection: "row", gap: 8 },
  tool: { flex: 1, minHeight: 65, paddingVertical: 10, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  toolLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  panel: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 13 },
  panelHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  doneText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  textInput: { minHeight: 95, maxHeight: 150, borderRadius: 14, borderWidth: 1, padding: 12, fontSize: 16, lineHeight: 23, fontFamily: "Inter_500Medium" },
  styleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderRadius: 12, minHeight: 42, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  textOptions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  swatchRow: { flexDirection: "row", gap: 9 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  sizeButtons: { flexDirection: "row", alignItems: "center", gap: 4 },
  smallButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  backgroundRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  backgroundOption: { alignItems: "center", gap: 6, flex: 1 },
  backgroundSwatch: { width: 47, height: 47, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium" },
  footer: { flexDirection: "row", paddingHorizontal: 18, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerGallery: { width: 54, minHeight: 52, borderWidth: 1, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  shareButton: { flex: 1, minHeight: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  shareText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  fullPreview: { flex: 1, backgroundColor: "#080B10", paddingHorizontal: 16, justifyContent: "space-between", gap: 12 },
  fullPreviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  fullPreviewTitle: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  fullPreviewSubtitle: { color: "#9EABC0", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  fullCanvas: { alignSelf: "center" },
  keepEditing: { backgroundColor: "#181F2A", minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 },
});
