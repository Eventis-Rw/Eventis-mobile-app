import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { mediaUnavailableReason } from "@/services/liveMedia";
import type { LivePerson } from "@/services/liveState";
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

type AccessCheck = { label: string; met: boolean; value?: string };
export function LiveBroadcastEntry({
  person,
  onClose,
  initialSession,
  events = [],
  checks = [],
}: {
  person: LivePerson;
  onClose: () => void;
  initialSession?: BroadcastSession;
  events?: PublisherEvent[];
  checks?: AccessCheck[];
}) {
  const insets = useAppSafeAreaInsets();
  const [session, setSession] = useState<BroadcastSession | null>(
    initialSession ?? null,
  );
  const [closeSignal, setCloseSignal] = useState(0);
  const [phase, setPhase] = useState<"access" | "preview">("access");
  const [directory, setDirectory] = useState<LiveDirectory | null>(null);
  const [mode, setMode] = useState<"video" | "voice">("video");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState<string | undefined>();
  const [eventPicker, setEventPicker] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [queue, setQueue] = useState<LiveQueueTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
            e instanceof Error ? e.message : "The queue couldn’t refresh.",
          );
          if (e instanceof ApiError && e.status === 404) {
            setQueue(null);
            operation.current = "";
            setPhase("access");
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
    try {
      operation.current ||= liveRequestId();
      const linked: LiveEventReference | undefined = event
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
            title: title.trim(),
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
            facing === "back" ? "environment" : "user",
          ),
        );
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Couldn’t start the Live.");
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const flip = () => {
    setCameraReady(false);
    setFacing((f) => (f === "back" ? "front" : "back"));
  };
  const disabled =
    busy ||
    !!unavailable ||
    !liveProject.tokenServerId ||
    !title.trim() ||
    (mode === "video" && !cameraReady);
  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => (session ? setCloseSignal((n) => n + 1) : close())}
    >
      <StatusBar style="light" />
      {session ? (
        <ConnectedBroadcast
          key={session.code}
          session={session}
          name={person.name}
          closeSignal={closeSignal}
          onClose={close}
        />
      ) : (
        <View style={entry.screen}>
          {phase === "preview" && !queue ? (
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
                  colors={["#152B44", "#080D19", "#14243B"]}
                  style={entry.voiceCanvas}
                >
                  <View style={entry.voiceHalo}>
                    <LiveAvatar person={person} size={112} />
                  </View>
                  <Text style={entry.voiceName}>{person.name}</Text>
                  <View style={entry.voiceWave}>
                    {[12, 24, 38, 18, 30, 46, 22, 34, 14].map((h, i) => (
                      <View
                        key={i}
                        style={{
                          width: 4,
                          height: h,
                          borderRadius: 3,
                          backgroundColor: i % 2 ? "#38BDF8" : "#38BDF866",
                        }}
                      />
                    ))}
                  </View>
                  <Text style={entry.voiceHint}>
                    Bring your event to the conversation.
                  </Text>
                </LinearGradient>
              )}
            </View>
          ) : null}
          <LinearGradient
            pointerEvents="none"
            colors={["#0008", "#0000"]}
            style={entry.topShade}
          />
          <View style={[entry.header, { paddingTop: insets.top + 12 }]}>
            <LiveOverlayAction
              name="close"
              label="Close streaming setup"
              onPress={close}
            />
            <Text style={entry.headerTitle}>
              {queue
                ? "Your place in line"
                : phase === "access"
                  ? "Before you go Live"
                  : "Create Live"}
            </Text>
            {phase === "preview" && !queue && mode === "video" ? (
              <LiveOverlayAction
                name="camera-reverse-outline"
                label="Flip preview camera"
                onPress={flip}
              />
            ) : (
              <View style={{ width: 42 }} />
            )}
          </View>
          {queue ? (
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 26,
                gap: 20,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <Ionicons name="hourglass-outline" size={40} color={c.blue} />
              <Text style={s.title}>
                {queue.ready
                  ? "Your stage is ready."
                  : `You’re number ${queue.position}.`}
              </Text>
              <Text style={s.body}>
                {queue.ready
                  ? "A Live slot is available. Start when you’re ready."
                  : "All available spaces are in use or reserved. We’ll update your place while you wait."}{" "}
                Your camera and microphone are off.
              </Text>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <LiveButton
                tone="live"
                label={busy ? "Starting…" : "Start my Live"}
                disabled={busy || !queue.ready}
                onPress={() => void start()}
              />
              <LiveButton secondary label="Leave queue" onPress={close} />
              <Text style={s.body}>
                You will never be broadcast automatically. If you close the app,
                your place expires.
              </Text>
            </ScrollView>
          ) : phase === "access" ? (
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                paddingBottom: insets.bottom + 24,
                gap: 20,
              }}
            >
              <Text style={[s.title, { marginTop: 18 }]}>
                Take your event live.
              </Text>
              <Text style={s.body}>
                Share the atmosphere, bring in a performer, or answer questions
                from your audience.
              </Text>
              <View style={s.card}>
                <Text style={s.label}>Free hosting route</Text>
                {checks.map((check) => (
                  <View key={check.label} style={s.row}>
                    <Ionicons
                      name={check.met ? "checkmark-circle" : "ellipse-outline"}
                      size={19}
                      color={check.met ? c.blue : c.muted}
                    />
                    <Text style={[s.body, { flex: 1 }]}>{check.label}</Text>
                    {check.value ? (
                      <Text style={s.body}>{check.value}</Text>
                    ) : null}
                  </View>
                ))}
                <Text style={[s.body, { fontSize: 11 }]}>
                  Approved organisers can qualify without the view threshold.
                  Local progress is an estimate; all routes need server-verified
                  account safety.
                </Text>
              </View>
              {directory ? (
                <View style={[s.card, { borderColor: "#38BDF840" }]}>
                  <Text style={s.label}>Development access enabled</Text>
                  <Text style={s.body}>
                    You can test hosting now. Production eligibility and the
                    daily session limit are not enforced in this testing mode.
                  </Text>
                  <Text style={s.body}>
                    {directory.occupied}/{directory.capacity} Live spaces
                    occupied · 30 minutes · Up to 4 guests
                  </Text>
                </View>
              ) : !error ? (
                <ActivityIndicator color={c.blue} />
              ) : null}
              {error ? (
                <>
                  <Text accessibilityRole="alert" style={s.error}>
                    {error}
                  </Text>
                  <LiveButton
                    secondary
                    label="Retry access check"
                    onPress={refreshAccess}
                  />
                </>
              ) : null}
              {unavailable ? <Text style={s.body}>{unavailable}</Text> : null}
              <LiveButton
                tone="live"
                label="Continue to preview"
                disabled={!directory?.developmentAccess}
                onPress={() => setPhase("preview")}
              />
              <Text style={[s.body, { textAlign: "center", fontSize: 11 }]}>
                Nothing broadcasts until you tap Go LIVE.
              </Text>
            </ScrollView>
          ) : (
            <KeyboardAvoidingView
              pointerEvents="box-none"
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={entry.setupBottom}>
                <LinearGradient
                  pointerEvents="none"
                  colors={["#0000", "#000B", "#000E"]}
                  style={StyleSheet.absoluteFill}
                />
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 22,
                    paddingTop: 65,
                    paddingBottom: Math.max(insets.bottom, 16),
                    gap: 16,
                  }}
                >
                  <View style={entry.previewLabel}>
                    <View style={entry.previewDot} />
                    <Text style={entry.previewText}>
                      PREVIEW · ONLY YOU CAN SEE THIS
                    </Text>
                  </View>
                  <View style={entry.modeSwitch}>
                    {(["video", "voice"] as const).map((m) => (
                      <Pressable
                        key={m}
                        accessibilityRole="button"
                        accessibilityLabel={
                          m === "video" ? "Camera + voice" : "Voice only"
                        }
                        accessibilityState={{ selected: mode === m }}
                        onPress={() => {
                          if (mode !== m) {
                            setCameraReady(false);
                            setMode(m);
                          }
                        }}
                        style={[
                          entry.mode,
                          mode === m ? entry.selectedMode : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            m === "video" ? "videocam-outline" : "mic-outline"
                          }
                          size={17}
                          color="#FFF"
                        />
                        <Text style={entry.modeText}>
                          {m === "video" ? "Camera" : "Voice"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={entry.titleField}>
                    <LiveAvatar person={person} size={38} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={entry.fieldLabel}>WHAT’S HAPPENING?</Text>
                      <TextInput
                        accessibilityLabel="Broadcast title"
                        style={entry.titleInput}
                        placeholder="Give your Live a title…"
                        placeholderTextColor="#D5D9E2"
                        value={title}
                        maxLength={80}
                        onChangeText={setTitle}
                        returnKeyType="done"
                      />
                    </View>
                    <Text style={entry.charCount}>{title.length}/80</Text>
                  </View>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Link an event"
                      onPress={() => setEventPicker(true)}
                      style={[s.row, { flex: 1, minWidth: 0 }]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        color={c.blue}
                        size={17}
                      />
                      <Text
                        numberOfLines={1}
                        style={[s.label, { fontSize: 12, flexShrink: 1 }]}
                      >
                        {event?.title ?? "Link your event"}
                      </Text>
                      <Ionicons name="chevron-down" size={13} color="#FFF" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel="Allow Live comments"
                      accessibilityState={{ checked: chatEnabled }}
                      onPress={() => setChatEnabled((v) => !v)}
                      style={s.row}
                    >
                      <Ionicons
                        name={
                          chatEnabled
                            ? "chatbubble-ellipses-outline"
                            : "chatbubble-outline"
                        }
                        size={17}
                        color="#FFF"
                      />
                      <Text style={[s.label, { fontSize: 11 }]}>
                        {chatEnabled ? "Chat on" : "Chat off"}
                      </Text>
                    </Pressable>
                  </View>
                  {unavailable || !liveProject.tokenServerId || error ? (
                    <Text
                      accessibilityRole={error ? "alert" : undefined}
                      style={entry.setupNotice}
                    >
                      {error ||
                        (unavailable
                          ? "Camera preview only. Open the Eventis development app to broadcast."
                          : "Connect your LiveKit project to start broadcasting.")}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Start broadcasting"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => void start()}
                    style={({ pressed }) => [
                      entry.goLive,
                      { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Ionicons name="radio" size={22} color="#FFF" />
                    )}
                    <Text style={entry.goLiveText}>
                      {busy ? "Preparing…" : "Go LIVE"}
                    </Text>
                  </Pressable>
                  <Text style={[entry.setupFootText, { textAlign: "center" }]}>
                    30 minutes · Up to 4 guests · Viewers join from the Live
                    page
                  </Text>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}
          {eventPicker ? (
            <LiveSheet
              title="Link an event"
              onClose={() => setEventPicker(false)}
            >
              <Text style={s.body}>
                Help viewers discover the event behind your Live.
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
                  <LiveButton
                    secondary
                    key={e.id}
                    icon={
                      eventId === e.id ? "checkmark-circle" : "calendar-outline"
                    }
                    label={e.title}
                    onPress={() => {
                      setEventId(e.id);
                      setEventPicker(false);
                    }}
                  />
                ))
              ) : (
                <Text style={s.body}>
                  Publish an event first to link it here. You can still host a
                  conversation.
                </Text>
              )}
            </LiveSheet>
          ) : null}
        </View>
      )}
    </Modal>
  );
}

function ConnectedBroadcast({
  session,
  name,
  closeSignal,
  onClose,
}: {
  session: BroadcastSession;
  name: string;
  closeSignal: number;
  onClose: () => void;
}) {
  const live = useLiveBroadcast(session, name);
  const [notice, setNotice] = useState("");
  const insets = useAppSafeAreaInsets();
  const own = { id: session.identity, name };
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
      live.model.guests.some((g) => g.id === p.identity),
  );
  const disabled = live.connection !== "connected";
  return (
    <>
      <LiveRoomView
        room={live.model}
        person={own}
        state={roomState(live.model)}
        now={live.now}
        closeSignal={closeSignal}
        act={live.act}
        onClose={onClose}
        broadcast={{
          status:
            live.connection === "connected"
              ? "LIVE · TEST SESSION"
              : live.connection.toUpperCase(),
          onShare: () => {
            const url = Linking.createURL(`/live/${session.listing?.id ?? ""}`);
            void Share.share({
              message: `Watch ${live.model.title} on Eventis. ${url}`,
            }).catch(() => setNotice("Sharing is unavailable right now."));
          },
          event: session.listing?.event,
          onStage: live.stageConsent,
          notice: live.error || notice,
          onDismissNotice: () => {
            setNotice("");
            live.clearError();
          },
          stage: (
            <LiveBroadcastStage
              participants={stage}
              revision={live.revision}
              hostId={session.hostId}
              host={live.model.host}
              guests={live.model.guests}
              connected={live.connection === "connected"}
              mode={session.mode}
            />
          ),
          controls: (
            <>
              {live.canPublish ? (
                <>
                  <LiveOverlayAction
                    name={
                      live.localMedia.microphone
                        ? "mic-outline"
                        : "mic-off-outline"
                    }
                    label={live.localMedia.microphone ? "Mute" : "Enable mic"}
                    caption="Mic"
                    active={!live.localMedia.microphone}
                    disabled={disabled}
                    onPress={() => live.media("mic")}
                  />
                  {session.mode === "video" ? (
                    <>
                      <LiveOverlayAction
                        name={
                          live.localMedia.camera
                            ? "videocam-outline"
                            : "videocam-off-outline"
                        }
                        label={
                          live.localMedia.camera ? "Camera off" : "Camera on"
                        }
                        caption="Camera"
                        active={!live.localMedia.camera}
                        disabled={disabled}
                        onPress={() => live.media("camera")}
                      />
                      <LiveOverlayAction
                        name="camera-reverse-outline"
                        label="Flip"
                        caption="Flip"
                        disabled={disabled || !live.localMedia.camera}
                        onPress={() => live.media("flip")}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
              {Platform.OS === "web" ? (
                <LiveOverlayAction
                  name="volume-high-outline"
                  label="Enable sound"
                  disabled={disabled}
                  onPress={() => live.media("audio")}
                />
              ) : null}
            </>
          ),
        }}
      />
      {!session.hosting &&
      live.approvedGuest &&
      !live.stageConsent &&
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
  screen: { flex: 1, backgroundColor: "#080D19" },
  topShade: { position: "absolute", top: 0, right: 0, left: 0, height: 170 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  headerTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  setupBottom: { marginTop: "auto", maxHeight: "100%" },
  previewLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFF" },
  previewText: {
    color: "#FFFFFFCC",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  modeSwitch: {
    alignSelf: "center",
    flexDirection: "row",
    padding: 4,
    borderRadius: 25,
    backgroundColor: "#0006",
    borderWidth: 1,
    borderColor: "#FFFFFF20",
  },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 20,
    height: 37,
    borderRadius: 22,
  },
  selectedMode: { backgroundColor: "#FFFFFF22" },
  modeText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  titleField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF30",
    paddingBottom: 13,
    paddingTop: 4,
  },
  fieldLabel: {
    color: "#FFFFFF90",
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  titleInput: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    paddingVertical: 6,
    minHeight: 35,
  },
  charCount: {
    color: "#FFFFFF70",
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  setupNotice: {
    color: "#FFF",
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    backgroundColor: "#111827CC",
    padding: 12,
    borderRadius: 12,
  },
  goLive: {
    minHeight: 56,
    backgroundColor: "#EF4444",
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  goLiveText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  setupFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  setupFootText: {
    color: "#FFFFFF99",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  joinLink: { color: "#FFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  voiceCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 180,
    gap: 16,
  },
  voiceHalo: {
    padding: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#38BDF82A",
    backgroundColor: "#38BDF809",
  },
  voiceName: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 20 },
  voiceHint: {
    color: "#FFFFFF80",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  voiceWave: { flexDirection: "row", height: 48, alignItems: "center", gap: 5 },
  joinContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 26,
    gap: 20,
  },
  joinIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#38BDF812",
    alignItems: "center",
    justifyContent: "center",
  },
  joinTitle: {
    color: "#FFF",
    fontSize: 30,
    letterSpacing: -0.8,
    fontFamily: "Inter_700Bold",
  },
  joinDescription: {
    color: c.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 300,
  },
  codeField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF20",
    backgroundColor: "#FFFFFF08",
    borderRadius: 18,
  },
  paste: { padding: 15 },
  joinPrivacy: {
    color: c.muted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
