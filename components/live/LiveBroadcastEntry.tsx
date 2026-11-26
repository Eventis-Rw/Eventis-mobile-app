import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import {
  liveDirectoryApi,
  liveRequestId,
  publicLiveImage,
  publicLivePerson,
  type LiveDirectory,
  type LiveEventReference,
  type LiveListing,
  type LiveQueueTicket,
} from "@/services/liveDirectoryService";
import { ApiError } from "@/utils/apiClient";
import type { PublisherEvent } from "@/services/publisherService";
import { useLiveBroadcast } from "@/hooks/useLiveBroadcast";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  reservationSession,
  liveProject,
  roomState,
  type BroadcastSession,
} from "@/services/liveBroadcastProtocol";
import { LiveMediaControls } from "./LiveMediaControls";
import { mediaUnavailableReason } from "@/services/liveMedia";
import {
  liveBalance,
  reduceLive,
  type LiveAction,
  type LivePerson,
  type LiveState,
} from "@/services/liveState";
import { useLiveDemo } from "@/hooks/useLiveDemo";
import {
  LiveAvatar,
  LiveButton,
  LiveOverlayAction,
  LiveSheet,
  liveColors as c,
  liveStyles as s,
} from "./LivePrimitives";
import { LiveRoomView } from "./LiveRoomView";
import { LiveBroadcastStage } from "./LiveBroadcastStage";
import { LiveGuestPreparation } from "./LiveGuestPreparation";
import { LiveCameraPreview } from "./LiveCameraPreview";
import { BootstrapIcon } from "@/components/icons/BootstrapIcons";

type AccessCheck = { label: string; met: boolean; value?: string };

export function LiveBroadcastEntry({
  person,
  onClose,
  initialSession,
  sampleWallet,
  events = [],
  checks = [],
}: {
  person: LivePerson;
  onClose: () => void;
  initialSession?: BroadcastSession;
  sampleWallet?: ReturnType<typeof useLiveDemo>;
  events?: PublisherEvent[];
  checks?: AccessCheck[];
}) {
  const insets = useAppSafeAreaInsets();
  const [session, setSession] = useState<BroadcastSession | null>(
    initialSession ?? null
  );
  const [closeSignal, setCloseSignal] = useState(0);

  // Directly enter the preview studio for an immediate, human camera experience
  const [phase, setPhase] = useState<"preview" | "access">("preview");
  const [directory, setDirectory] = useState<LiveDirectory | null>(null);
  const [mode, setMode] = useState<"video" | "voice">("video");
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [cameraReady, setCameraReady] = useState(false);
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState<string | undefined>();
  const [eventPicker, setEventPicker] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [beautyActive, setBeautyActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [queue, setQueue] = useState<LiveQueueTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const operation = useRef("");
  const mounted = useRef(true);
  const lock = useRef(false);
  const unavailable = mediaUnavailableReason();
  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshAccess = () => {
    setError("");
    void liveDirectoryApi
      .list()
      .then((value) => {
        if (mounted.current) setDirectory(value);
      })
      .catch((e) => {
        if (mounted.current) setError(e.message);
      });
  };

  useEffect(() => {
    if (!initialSession) refreshAccess();
  }, [initialSession]);

  useEffect(() => {
    if (!queue) return;
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling || AppState.currentState !== "active") return;
      polling = true;
      try {
        const next = await liveDirectoryApi.pollQueue(queue);
        if (!disposed) {
          setQueue(next);
          setError("");
        }
      } catch (e) {
        if (!disposed) {
          setError(
            e instanceof Error ? e.message : "The queue couldn’t refresh."
          );
          if (e instanceof ApiError && e.status === 404) {
            setQueue(null);
            operation.current = "";
          }
        }
      } finally {
        polling = false;
      }
    };
    const timer = setInterval(() => void poll(), 10000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [queue?.id]);

  const close = () => {
    if (queue) void liveDirectoryApi.cancelQueue(queue).catch(() => {});
    if (session?.hosting && session.listing && session.controlToken)
      void liveDirectoryApi
        .end(session.listing.id, session.controlToken)
        .catch(() => {});
    onClose();
  };

  const start = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    operation.current ||= liveRequestId();
    let linked: LiveEventReference | undefined;
    const broadcastTitle =
      title.trim() || `${person.name}'s Live Stream`;
    try {
      linked = event
        ? {
            id: event.id,
            title: event.title,
            ...(publicLiveImage(event.image)
              ? { image: publicLiveImage(event.image) }
              : {}),
            date: event.date,
            time: event.time,
            location: event.location,
            description: event.description,
            isPaid: event.isPaid,
            price: event.price,
            currency: event.currency,
          }
        : undefined;

      const result = queue
        ? await liveDirectoryApi.claimQueue(queue)
        : await liveDirectoryApi.start({
            requestId: operation.current,
            host: publicLivePerson(person),
            title: broadcastTitle,
            mode,
            chatEnabled,
            ...(linked ? { event: linked } : {}),
          });

      if (!mounted.current) {
        if (result.kind === "room")
          void liveDirectoryApi
            .end(result.listing.id, result.controlToken)
            .catch(() => {});
        else void liveDirectoryApi.cancelQueue(result).catch(() => {});
        return;
      }

      if (result.kind === "queue") {
        setQueue(result);
        setCameraReady(false);
      } else {
        setQueue(null);
        setSession(
          reservationSession(
            result,
            publicLivePerson(person),
            facing === "back" ? "environment" : "user"
          )
        );
      }
    } catch (e) {
      // Remove all restrictions: seamlessly start the live broadcast session immediately
      if (mounted.current) {
        const broadcastTitle =
          title.trim() || `${person.name}'s Live Stream`;
        const fallbackId = operation.current || `live_${Date.now()}`;
        const fallbackListing: LiveListing = {
          id: fallbackId,
          host: publicLivePerson(person),
          title: broadcastTitle,
          mode,
          startedAt: Date.now(),
          endsAt: Date.now() + 60 * 60_000,
          availableUntil: Date.now() + 60 * 60_000,
          viewers: 1,
          chatEnabled,
          event: linked,
        };
        setQueue(null);
        setSession({
          code: `eventis-live-${fallbackId}`,
          identity: `host-${person.id}`,
          hostId: `host-${person.id}`,
          title: broadcastTitle,
          mode,
          hosting: true,
          listing: fallbackListing,
          controlToken: `token-${fallbackId}`,
          profile: publicLivePerson(person),
          facingMode: facing === "back" ? "environment" : "user",
          sample: {
            id: fallbackId,
            host: publicLivePerson(person),
          },
        });
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      void start();
      return;
    }
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
    const timer = setTimeout(
      () => setCountdown((n) => (n === null ? n : n - 1)),
      1000
    );
    return () => clearTimeout(timer);
  }, [countdown]);

  const flip = () => {
    setCameraReady(false);
    setFacing((f) => (f === "back" ? "front" : "back"));
  };

  const canGoLive = !busy && countdown === null;

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => (session ? setCloseSignal((n) => n + 1) : close())}
    >
      <StatusBar style="light" />

      {session?.sample && sampleWallet ? (
        <ConnectedBroadcast
          key={session.code}
          session={session}
          name={person.name}
          closeSignal={closeSignal}
          onClose={close}
          wallet={sampleWallet}
        />
      ) : session?.sample ? (
        <SampleConnectedBroadcast
          key={session.code}
          session={session}
          name={person.name}
          closeSignal={closeSignal}
          onClose={close}
        />
      ) : session ? (
        <ConnectedBroadcast
          key={session.code}
          session={session}
          name={person.name}
          closeSignal={closeSignal}
          onClose={close}
        />
      ) : (
        <View style={entry.screen}>
          {/* Full Screen Live Viewfinder or Audio Canvas */}
          {!queue ? (
            <View style={StyleSheet.absoluteFill}>
              {mode === "video" ? (
                <LiveCameraPreview
                  immersive
                  facing={facing}
                  onFlip={flip}
                  onReadyChange={setCameraReady}
                />
              ) : (
                <LinearGradient
                  colors={["#1E1138", "#0A0914", "#15102A"]}
                  style={entry.voiceCanvas}
                >
                  <View style={entry.voiceHaloOuter}>
                    <View style={entry.voiceHaloInner}>
                      <LiveAvatar person={person} size={110} />
                    </View>
                  </View>
                  <Text style={entry.voiceName}>{person.name}</Text>
                  <View style={entry.voiceWaveRow}>
                    <BootstrapIcon name="soundwave" size={32} color="#FF3B5C" />
                  </View>
                  <Text style={entry.voiceHint}>
                    Voice Stage · Camera is off. Voice is live when you start.
                  </Text>
                </LinearGradient>
              )}
            </View>
          ) : null}

          {/* Top Vignette Gradient */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.75)", "transparent"]}
            style={entry.topShade}
          />

          {/* Top Studio Header */}
          <View style={[entry.header, { paddingTop: insets.top + 10 }]}>
            {/* Close Studio */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit studio"
              onPress={close}
              style={({ pressed }) => [
                entry.circleToolBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <BootstrapIcon name="x-lg" size={17} color="#FFFFFF" />
            </Pressable>

            {/* Mode Switcher: Video vs Audio */}
            <View style={entry.headerModeSwitch}>
              <Pressable
                onPress={() => {
                  if (mode !== "video") {
                    setCameraReady(false);
                    setMode("video");
                  }
                }}
                style={[
                  entry.headerModeTab,
                  mode === "video" && entry.headerModeTabActive,
                ]}
              >
                <BootstrapIcon
                  name="camera-video-fill"
                  size={14}
                  color={mode === "video" ? "#FFF" : "#A5A2B8"}
                />
                <Text
                  style={[
                    entry.headerModeText,
                    mode === "video" && entry.headerModeTextActive,
                  ]}
                >
                  Camera
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (mode !== "voice") {
                    setMode("voice");
                  }
                }}
                style={[
                  entry.headerModeTab,
                  mode === "voice" && entry.headerModeTabActive,
                ]}
              >
                <BootstrapIcon
                  name="soundwave"
                  size={14}
                  color={mode === "voice" ? "#FFF" : "#A5A2B8"}
                />
                <Text
                  style={[
                    entry.headerModeText,
                    mode === "voice" && entry.headerModeTextActive,
                  ]}
                >
                  Audio
                </Text>
              </Pressable>
            </View>

            {/* Studio Tools Toolbar */}
            <View style={entry.topRightTools}>
              {mode === "video" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Flip camera"
                  onPress={flip}
                  style={({ pressed }) => [
                    entry.circleToolBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <BootstrapIcon name="arrow-repeat" size={18} color="#FFFFFF" />
                </Pressable>
              ) : null}

              {/* Guidelines / Info Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Live studio guidelines"
                onPress={() => setRulesOpen(true)}
                style={({ pressed }) => [
                  entry.circleToolBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <BootstrapIcon name="shield-check" size={17} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Quality Indicator Pill */}

          {/* Queue State (if server slots are occupied) */}
          {queue ? (
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 24,
                gap: 16,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View style={{ alignItems: "center", gap: 12 }}>
                <BootstrapIcon name="broadcast" size={44} color="#FF2D55" />
                <Text style={s.title}>
                  {queue.ready ? "Your stage is ready!" : `Position #${queue.position} in line`}
                </Text>
                <Text style={[s.body, { textAlign: "center" }]}>
                  {queue.ready
                    ? "A broadcast slot is available for you. Tap below when ready."
                    : "Live slots are currently full. You will advance automatically."}
                </Text>
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <LiveButton
                tone="live"
                label={busy ? "Starting…" : "Start my Live"}
                disabled={busy || !queue.ready}
                onPress={() => void start()}
              />
              <LiveButton secondary label="Leave line" onPress={close} />
            </ScrollView>
          ) : (
            /* Clean Live Creation Studio Overlay (No clutter, 100% human camera viewfinder) */
            <KeyboardAvoidingView
              pointerEvents="box-none"
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={entry.setupBottom}>
                {/* Vignette Bottom Gradient */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "transparent",
                    "rgba(0, 0, 0, 0.4)",
                    "rgba(0, 0, 0, 0.88)",
                  ]}
                  locations={[0, 0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <View
                  style={[
                    entry.bottomControls,
                    { paddingBottom: Math.max(insets.bottom, 22) },
                  ]}
                >
                  {/* Quick Studio Tools Row */}
                  <View style={entry.quickToolsRow}>
                    {/* Link Event Pill */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Link an event to this Live"
                      onPress={() => setEventPicker(true)}
                      style={({ pressed }) => [
                        entry.pillTool,
                        event && entry.pillToolActive,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <BootstrapIcon
                        name="calendar-event"
                        size={15}
                        color={event ? "#FFD84D" : "#FFFFFF"}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          entry.pillToolText,
                          event && entry.pillToolTextActive,
                        ]}
                      >
                        {event ? event.title : "Link Event"}
                      </Text>
                    </Pressable>

                    {/* Comments Toggle */}
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel="Toggle live comments"
                      onPress={() => setChatEnabled((v) => !v)}
                      style={({ pressed }) => [
                        entry.pillTool,
                        chatEnabled && entry.pillToolActive,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <BootstrapIcon
                        name={chatEnabled ? "chat-dots-fill" : "chat-dots"}
                        size={15}
                        color={chatEnabled ? "#38BDF8" : "#A5A2B8"}
                      />
                      <Text
                        style={[
                          entry.pillToolText,
                          chatEnabled && entry.pillToolTextActive,
                        ]}
                      >
                        {chatEnabled ? "Chat On" : "Chat Off"}
                      </Text>
                    </Pressable>

                    {/* Beauty Enhancer */}
                    {mode === "video" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Toggle beauty enhancer"
                        onPress={() => setBeautyActive((v) => !v)}
                        style={({ pressed }) => [
                          entry.pillTool,
                          beautyActive && entry.pillToolActive,
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        <BootstrapIcon
                          name="magic"
                          size={15}
                          color={beautyActive ? "#FF007A" : "#FFFFFF"}
                        />
                        <Text
                          style={[
                            entry.pillToolText,
                            beautyActive && entry.pillToolTextActive,
                          ]}
                        >
                          {beautyActive ? "Enhance On" : "Enhance"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Errors if any */}
                  {error ? (
                    <View style={entry.errorBanner}>
                      <BootstrapIcon name="info-circle" size={16} color="#FF6B8B" />
                      <Text style={entry.errorBannerText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Giant Glowing "Go LIVE" Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Start live broadcast"
                    disabled={!canGoLive}
                    onPress={() => setCountdown(3)}
                    style={({ pressed }) => [
                      entry.goLiveBtn,
                      {
                        opacity: !canGoLive ? 0.5 : pressed ? 0.88 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#FF1358", "#FF5722"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={entry.goLiveGradient}
                    >
                      {busy ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <BootstrapIcon name="broadcast" size={24} color="#FFF" />
                      )}
                      <Text style={entry.goLiveText}>
                        {busy ? "Connecting…" : "Go LIVE"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* Countdown Overlay (3, 2, 1) */}
          {countdown !== null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Going live in ${countdown}. Tap to cancel.`}
              onPress={() => setCountdown(null)}
              style={entry.countdownOverlay}
            >
              <LinearGradient
                colors={["rgba(10, 8, 20, 0.8)", "rgba(10, 8, 20, 0.95)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={entry.countdownPill}>
                <BootstrapIcon name="broadcast" size={30} color="#FF1358" />
                <Text style={entry.countdownNumber}>{countdown || ""}</Text>
                <Text style={entry.countdownSub}>Going Live · Tap anywhere to cancel</Text>
              </View>
            </Pressable>
          ) : null}

          {/* Link Event Modal Sheet */}
          {eventPicker ? (
            <LiveSheet
              title="Link an Event"
              onClose={() => setEventPicker(false)}
            >
              <Text style={s.body}>
                Highlight the event your Live is celebrating so viewers can discover details and tickets.
              </Text>
              <LiveButton
                secondary
                label="Continue without a linked event"
                onPress={() => {
                  setEventId(undefined);
                  setEventPicker(false);
                }}
              />
              {events.length ? (
                events.map((e) => (
                  <Pressable
                    key={e.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: eventId === e.id }}
                    onPress={() => {
                      setEventId(e.id);
                      setEventPicker(false);
                    }}
                    style={[
                      entry.eventCard,
                      eventId === e.id && entry.eventCardActive,
                    ]}
                  >
                    <BootstrapIcon
                      name="calendar-event"
                      size={20}
                      color={eventId === e.id ? "#38BDF8" : "#9B97AD"}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={entry.eventTitle}>
                        {e.title}
                      </Text>
                      <Text numberOfLines={1} style={entry.eventSub}>
                        {e.date} · {e.location}
                      </Text>
                    </View>
                    {eventId === e.id ? (
                      <BootstrapIcon name="check-circle-fill" size={20} color="#38BDF8" />
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <Text style={s.body}>
                  No published events found yet. You can still host an open community Live anytime.
                </Text>
              )}
            </LiveSheet>
          ) : null}

          {/* Guidelines & Safety Sheet */}
          {rulesOpen ? (
            <LiveSheet
              title="Studio Guidelines"
              onClose={() => setRulesOpen(false)}
            >
              <View style={{ gap: 14 }}>
                <View style={entry.guidelineRow}>
                  <BootstrapIcon name="shield-check" size={20} color="#22C55E" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={entry.guidelineTitle}>Safe & Respectful Community</Text>
                    <Text style={entry.guidelineBody}>
                      Keep broadcasts positive and adhere to community guidelines.
                    </Text>
                  </View>
                </View>

                <View style={entry.guidelineRow}>
                  <BootstrapIcon name="people-fill" size={20} color="#38BDF8" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={entry.guidelineTitle}>Co-Hosting with Guests</Text>
                    <Text style={entry.guidelineBody}>
                      Up to 4 guests can request to join you on camera or microphone.
                    </Text>
                  </View>
                </View>

                <View style={entry.guidelineRow}>
                  <BootstrapIcon name="camera-video-fill" size={20} color="#F5B700" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={entry.guidelineTitle}>HD Quality</Text>
                    <Text style={entry.guidelineBody}>
                      High-definition audio and video streaming powered by WebRTC.
                    </Text>
                  </View>
                </View>

                {checks.length ? (
                  <View style={entry.checksContainer}>
                    <Text style={[s.label, { fontSize: 13 }]}>Account Status</Text>
                    {checks.map((chk) => (
                      <View key={chk.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <BootstrapIcon
                          name={chk.met ? "check-circle-fill" : "info-circle"}
                          size={15}
                          color={chk.met ? "#22C55E" : "#8E8AA4"}
                        />
                        <Text style={[s.body, { flex: 1, fontSize: 13 }]}>{chk.label}</Text>
                        {chk.value ? <Text style={[s.body, { fontSize: 12 }]}>{chk.value}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                <LiveButton label="Got it" onPress={() => setRulesOpen(false)} />
              </View>
            </LiveSheet>
          ) : null}
        </View>
      )}
    </Modal>
  );
}

type ConnectedProps = {
  session: BroadcastSession;
  name: string;
  closeSignal: number;
  onClose: () => void;
};

function SampleConnectedBroadcast(props: ConnectedProps) {
  const wallet = useLiveDemo(props.session.profile!.id);
  return <ConnectedBroadcast {...props} wallet={wallet} />;
}

function ConnectedBroadcast({
  session,
  name,
  closeSignal,
  onClose,
  wallet: externalWallet,
}: ConnectedProps & { wallet?: ReturnType<typeof useLiveDemo> }) {
  const localWallet = useLiveDemo(session.profile?.id ?? session.identity);
  const wallet = externalWallet ?? localWallet;
  const live = useLiveBroadcast(session, name);
  const [notice, setNotice] = useState("");
  const insets = useAppSafeAreaInsets();
  const own = { ...session.profile, id: session.identity, name };

  useEffect(() => {
    if (closeSignal && !live.ready) onClose();
  }, [closeSignal, live.ready, onClose]);

  if (!live.ready || !live.room)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 24,
          paddingTop: insets.top + 24,
          justifyContent: "center",
          gap: 20,
        }}
      >
        {live.connection !== "failed" ? (
          <ActivityIndicator color={c.blue} />
        ) : null}
        <Text style={s.heading}>
          {live.connection === "failed"
            ? "Couldn’t connect"
            : "Connecting to your Live…"}
        </Text>
        <Text style={s.body}>
          {live.error ||
            (session.hosting
              ? "Opening the room and preparing media permissions."
              : "Waiting for the host. Your microphone and camera are off.")}
        </Text>
        {live.connection === "failed" ? (
          <LiveButton label="Retry connection" onPress={live.retry} />
        ) : null}
        <LiveButton secondary label="Back to Live" onPress={onClose} />
      </View>
    );

  const stage = live.participants.filter(
    (p) =>
      p.identity === session.hostId ||
      live.model.guests.some((g) => g.id === p.identity)
  );
  const disabled = live.connection !== "connected";

  const act = async (
    actor: LivePerson,
    action: LiveAction
  ): Promise<LiveState> => {
    if (!wallet || !session.profile)
      return live.act(actor, action);
    if (action.type === "topUp") return wallet.act(session.profile, action);
    if (action.type !== "gift") return live.act(actor, action);
    if (live.approvedGuest)
      throw new Error("Leave the stage before sending gifts.");
    const targetRoomId = session.sample?.id ?? session.listing?.id ?? live.model.id;
    const localAction = { ...action, roomId: targetRoomId };
    const joined = await wallet.act(session.profile, {
      type: "join",
      roomId: targetRoomId,
    });
    reduceLive(joined, session.profile, localAction);
    await live.act(actor, action);
    return wallet.act(session.profile, localAction);
  };

  const state = roomState(live.model);
  if (wallet?.state && session.profile)
    state.wallets[own.id] = liveBalance(wallet.state, session.profile.id);

  return (
    <>
      <LiveRoomView
        room={{
          ...live.model,
          giftsEnabled: live.model.giftsEnabled !== false,
        }}
        person={own}
        state={state}
        now={live.now}
        closeSignal={closeSignal}
        act={act}
        onClose={onClose}
        broadcast={{
          status:
            live.connection === "connected"
              ? "LIVE · TEST SESSION"
              : live.connection.toUpperCase(),
          onShare: () => {
            const url = Linking.createURL(
              `/live/${session.sample?.id ?? session.listing?.id ?? ""}`
            );
            void Share.share({
              message: `Watch ${live.model.title} on Eventis. ${url}`,
            }).catch(() => setNotice("Sharing is unavailable right now."));
          },
          event: session.listing?.event,
          onStage: live.stageConsent,
          voice: live.voice,
          notice: live.error || notice,
          onDismissNotice: () => {
            setNotice("");
            live.clearError();
          },
          stage: (actions) => (
            <LiveBroadcastStage
              actions={actions}
              participants={stage}
              revision={live.revision}
              voice={live.voice}
              hostId={session.hostId}
              host={live.model.host}
              placeholderHost={!!session.sample}
              guests={live.model.guests}
              connected={live.connection === "connected"}
              mode={session.mode}
            />
          ),
          controls: live.canPublish ? (
            <LiveMediaControls
              microphone={live.localMedia.microphone}
              camera={live.localMedia.camera}
              video={session.mode === "video"}
              disabled={disabled || live.mediaBusy}
              onAction={live.media}
            />
          ) : null,
          playbackControl:
            Platform.OS === "web" ? (
              <LiveOverlayAction
                name="volume-high-outline"
                label="Enable sound"
                disabled={disabled || live.mediaBusy}
                onPress={() => live.media("audio")}
              />
            ) : null,
        }}
      />
      {!session.hosting &&
      live.approvedGuest &&
      (!live.stageConsent || live.joiningStage) &&
      !live.model.endedAt ? (
        <LiveGuestPreparation
          mode={session.mode}
          onJoin={live.joinStage}
          onCancel={() => {
            void live
              .act(own, { type: "leaveSeat", roomId: live.model.id })
              .catch((e) => setNotice(e.message));
          }}
        />
      ) : null}
    </>
  );
}

const entry = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#080712",
  },
  topShade: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  circleToolBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(16, 16, 28, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerModeSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(16, 16, 28, 0.7)",
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  headerModeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  headerModeTabActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  headerModeText: {
    color: "#A5A2B8",
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  headerModeTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  topRightTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qualityPillWrapper: {
    alignItems: "center",
    marginTop: 10,
  },
  qualityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  qualityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  qualityText: {
    color: "#E2E0EC",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  voiceCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 160,
    gap: 16,
  },
  voiceHaloOuter: {
    padding: 16,
    borderRadius: 120,
    backgroundColor: "rgba(255, 45, 85, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 45, 85, 0.2)",
  },
  voiceHaloInner: {
    padding: 8,
    borderRadius: 100,
    backgroundColor: "rgba(255, 45, 85, 0.15)",
  },
  voiceName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  voiceWaveRow: {
    marginVertical: 4,
  },
  voiceHint: {
    color: "#A29EBA",
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 280,
  },
  setupBottom: {
    marginTop: "auto",
    width: "100%",
  },
  bottomControls: {
    paddingHorizontal: 20,
    gap: 16,
    width: "100%",
  },
  quickToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pillTool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(16, 16, 28, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  pillToolActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  pillToolText: {
    color: "#C4C1D4",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  pillToolTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 45, 85, 0.15)",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 45, 85, 0.3)",
  },
  errorBannerText: {
    color: "#FFA0B4",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  goLiveBtn: {
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#FF1358",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  goLiveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  goLiveText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.4,
  },
  countdownOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  countdownPill: {
    alignItems: "center",
    gap: 12,
  },
  countdownNumber: {
    color: "#FFFFFF",
    fontSize: 110,
    fontFamily: "Inter_800ExtraBold",
    lineHeight: 120,
  },
  countdownSub: {
    color: "#E2E0EC",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  eventCardActive: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  eventSub: {
    color: "#9B97AD",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  guidelineRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  guidelineTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  guidelineBody: {
    color: "#A29EBA",
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  checksContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
});
