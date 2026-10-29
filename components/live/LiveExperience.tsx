import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, type User } from "@/context/AuthContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";
import { useLiveDirectory } from "@/hooks/useLiveDirectory";
import { LiveWatchEntry } from "./LiveWatchEntry";
import { useLiveDemo } from "@/hooks/useLiveDemo";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  activeRooms,
  liveEligibility,
  LIVE_GIFTS,
  LIVE_LIMITS,
  type LiveDraft,
  type LivePerson,
  type LiveRoom,
} from "@/services/liveState";
import {
  LiveAvatar,
  LiveButton,
  LiveIcon,
  LiveSheet,
  liveColors as c,
  liveStyles as s,
} from "./LivePrimitives";
import { LiveRoomView } from "./LiveRoomView";
import type { PublisherEvent } from "@/services/publisherService";
import { LiveBroadcastEntry } from "./LiveBroadcastEntry";
import { LiveDiscovery } from "./LiveDiscovery";

export default function LiveScreen() {
  const { user } = useAuth();
  return user ? (
    <LiveExperience key={user.id} user={user} />
  ) : (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={s.heading}>Sign in to explore Live</Text>
    </View>
  );
}

function LiveExperience({ user }: { user: User }) {
  const {
    state,
    now,
    loading,
    error: loadError,
    act,
    reset,
    retry,
  } = useLiveDemo(user.id);
  const {
    events: ownedEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useOrganiserEvents();
  const { records } = useAnalytics();
  const shared = useLiveDirectory();
  const [watchId, setWatchId] = useState<string | null>(null);
  const person: LivePerson = {
    id: user.id,
    name: user.organisation?.name ?? user.username,
    avatar: user.organisation?.logoUrl ?? user.avatarUrl,
  };
  const [panel, setPanel] = useState<
    "access" | "wallet" | "setup" | "test" | null
  >(null);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [broadcastTab, setBroadcastTab] = useState<"host" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const rooms = state ? activeRooms(state, now) : [];
  const ownRoom = rooms.find((r) => r.host.id === user.id);
  const active = state?.rooms.find((r) => r.id === activeId);
  const queueIndex =
    state?.queue.findIndex((q) => q.person.id === user.id) ?? -1;
  const queued = queueIndex >= 0 ? state?.queue[queueIndex] : undefined;
  const published = ownedEvents.filter((e) => e.status === "published");
  const ownerIds = new Set(published.map((e) => e.id));
  const measuredViews = records.filter(
    (r) =>
      r.type === "detail_view" &&
      ownerIds.has(r.entityId) &&
      r.viewerId !== user.id,
  ).length;
  const eligibility = liveEligibility(
    {
      views: measuredViews,
      publishedEvents: published.length,
      joinedAt: Date.parse(user.joinedDate),
      verifiedOrganizer: user.organisation?.verificationStatus === "verified",
      suspended: false,
      safetyApproved: false,
    },
    now,
  );
  const execute = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Live is unavailable. Try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const openRoom = (room: LiveRoom) =>
    void execute(async () => {
      await act(person, { type: "join", roomId: room.id });
      setCloseSignal(0);
      setActiveId(room.id);
    });
  const start = (draft: LiveDraft) =>
    void execute(async () => {
      const result = await act(person, { type: "start", draft });
      const room = activeRooms(result).find((r) => r.host.id === user.id);
      setPanel(null);
      if (room) {
        setCloseSignal(0);
        setActiveId(room.id);
      }
    });
  if (!state)
    return (
      <View style={{ flex: 1 }}>
        <LiveDiscovery
          rooms={[]}
          busy
          onHost={() => setBroadcastTab("host")}
          liveRooms={shared.rooms}
          liveLoading={shared.loading}
          liveError={shared.error}
          onRefresh={() => void shared.refresh()}
          onWatch={(room) => setWatchId(room.id)}
          onRoom={() => {}}
        >
          {loading ? (
            <ActivityIndicator color={c.blue} />
          ) : (
            <View style={s.card}>
              <Text style={s.label}>Demo previews couldn’t load</Text>
              <Text style={s.body}>{loadError}</Text>
              <LiveButton label="Retry previews" onPress={retry} />
              {resetConfirmed ? (
                <LiveButton
                  danger
                  label="Confirm demo reset"
                  disabled={busy}
                  onPress={() => void execute(reset)}
                />
              ) : (
                <LiveButton
                  secondary
                  label="Reset local Live demo…"
                  onPress={() => setResetConfirmed(true)}
                />
              )}
            </View>
          )}
        </LiveDiscovery>
        {watchId ? (
          <LiveWatchEntry
            id={watchId}
            person={person}
            onClose={() => {
              setWatchId(null);
              void shared.refresh();
            }}
          />
        ) : null}
        {broadcastTab ? (
          <LiveBroadcastEntry
            person={person}
            events={published}
            checks={eligibility.checks}
            onClose={() => {
              setBroadcastTab(null);
              void shared.refresh();
            }}
          />
        ) : null}
      </View>
    );
  const myTransactions = state.transactions.filter(
    (t) =>
      t.senderId === user.id ||
      t.hostId === user.id ||
      t.guestIds.includes(user.id),
  );
  const pendingCoins = state.transactions
    .filter((t) => t.hostId === user.id || t.guestIds.includes(user.id))
    .reduce((n, t) => n + t.coins, 0);
  return (
    <View style={{ flex: 1 }}>
      <LiveDiscovery
        rooms={rooms}
        busy={busy}
        onHost={() => setBroadcastTab("host")}
        liveRooms={shared.rooms}
        liveLoading={shared.loading}
        liveError={shared.error}
        onRefresh={() => void shared.refresh()}
        onWatch={(room) => setWatchId(room.id)}
        onRoom={openRoom}
        onWallet={() => setPanel("wallet")}
        onDemo={() => {
          setResetConfirmed(false);
          setPanel("test");
        }}
      >
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        {queued ? (
          <View style={s.card}>
            <Text style={s.heading}>You’re in the queue</Text>
            <Text style={s.body}>
              {queueIndex === 0 && rooms.length < LIVE_LIMITS.rooms
                ? "A slot is ready. Start when you’re ready."
                : `Position ${queueIndex + 1} · ${rooms.length} of 5 rooms running. You will never go Live automatically.`}
            </Text>
            <View style={s.wrap}>
              <LiveButton
                tone="live"
                compact
                label="Start my demo room"
                disabled={
                  busy || queueIndex !== 0 || rooms.length >= LIVE_LIMITS.rooms
                }
                onPress={() => start(queued.draft)}
              />
              <LiveButton
                compact
                secondary
                label="Leave queue"
                disabled={busy}
                onPress={() =>
                  void execute(async () => {
                    await act(person, { type: "cancelQueue" });
                  })
                }
              />
            </View>
          </View>
        ) : null}
      </LiveDiscovery>
      {watchId ? (
        <LiveWatchEntry
          id={watchId}
          person={person}
          onClose={() => {
            setWatchId(null);
            void shared.refresh();
          }}
        />
      ) : null}
      {broadcastTab ? (
        <LiveBroadcastEntry
          person={person}
          events={published}
          checks={eligibility.checks}
          onClose={() => {
            setBroadcastTab(null);
            void shared.refresh();
          }}
        />
      ) : null}
      {panel === "test" ? (
        <LiveSheet
          title="Try different scenarios"
          onClose={() => setPanel(null)}
        >
          <LiveButton
            label={ownRoom ? "Return to demo room" : "Host a demo room"}
            onPress={() => {
              setPanel(null);
              if (ownRoom) openRoom(ownRoom);
              else setPanel("access");
            }}
          />
          <Text style={s.body}>
            These controls affect only your local Live demo. They let you test
            capacity, queueing and repeat sessions.
          </Text>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <LiveButton
            secondary
            label="Fill available room slots"
            disabled={busy || rooms.length >= 5 || state.queue.length > 0}
            onPress={() =>
              void execute(async () => {
                for (let i = rooms.length; i < 5; i++)
                  await act(
                    {
                      id: `capacity_${Date.now()}_${i}`,
                      name: `Demo host ${i + 1}`,
                    },
                    {
                      type: "start",
                      draft: {
                        title: "Capacity test room",
                        mode: "voice",
                        chatEnabled: true,
                        giftsEnabled: true,
                      },
                    },
                  );
              })
            }
          />
          <LiveButton
            secondary
            label="Free one sample room slot"
            disabled={busy || !rooms.some((r) => r.host.id !== user.id)}
            onPress={() =>
              void execute(async () => {
                const room = rooms.find((r) => r.host.id !== user.id);
                if (room)
                  await act(room.host, { type: "end", roomId: room.id });
              })
            }
          />
          {resetConfirmed ? (
            <>
              <Text style={s.body}>
                Reset your demo rooms, daily session counter, queue, coins and
                gift history? Your events and account will stay intact.
              </Text>
              <LiveButton
                danger
                label="Confirm demo reset"
                disabled={busy}
                onPress={() =>
                  void execute(async () => {
                    await reset();
                    setPanel(null);
                    setActiveId(null);
                  })
                }
              />
            </>
          ) : (
            <LiveButton
              secondary
              label="Reset Live demo…"
              onPress={() => setResetConfirmed(true)}
            />
          )}
        </LiveSheet>
      ) : null}
      {panel === "access" ? (
        <LiveSheet
          title="Your stage starts here"
          onClose={() => setPanel(null)}
        >
          <Text style={s.body}>
            Earn access through event engagement, or through an approved
            organiser profile. All routes still require safety approval and a
            free room slot.
          </Text>
          <Text style={s.eyebrow}>FREE LIVE · LOCAL PROGRESS ESTIMATE</Text>
          {eligibility.checks.map((check) => (
            <View key={check.label} style={s.row}>
              <Ionicons
                name={check.met ? "checkmark-circle" : "ellipse-outline"}
                size={23}
                color={check.met ? c.blue : c.muted}
              />
              <Text style={[s.body, { flex: 1 }]}>{check.label}</Text>
              {check.value ? <Text style={s.label}>{check.value}</Text> : null}
            </View>
          ))}
          <View style={s.card}>
            <Text style={s.label}>
              {user.organisation?.verificationStatus === "verified"
                ? "Verified organiser"
                : "Organiser approval"}
            </Text>
            <Text style={s.body}>
              A subscription alone does not grant verified Live access. Genuine
              views and safety must be checked by the server before real
              broadcasting.
            </Text>
          </View>
          <Text style={s.body}>
            30 minutes per session · 1 session per day · up to 4 guests. Paid
            Live passes are not available yet.
          </Text>
          <LiveButton
            label="Try a demo Live"
            onPress={() => {
              setError("");
              setPanel("setup");
            }}
          />
          <Text style={s.body}>
            The preview lets you test hosting without changing your real
            eligibility.
          </Text>
        </LiveSheet>
      ) : null}
      {panel === "wallet" ? (
        <LiveSheet title="Live wallet" onClose={() => setPanel(null)}>
          <View style={s.card}>
            <Text style={s.eyebrow}>SPENDING BALANCE</Text>
            <Text style={s.title}>
              {state.wallets[user.id] ?? 500}{" "}
              <Text style={s.body}>demo coins</Text>
            </Text>
            <Text style={s.body}>
              500 test coins are provided once per account on this device. They
              have no cash value and cannot be withdrawn.
            </Text>
          </View>
          <Text style={s.heading}>Coin packages</Text>
          <View style={s.wrap}>
            {[100, 500, 1000, 5000].map((n) => (
              <View key={n} style={[s.card, { width: "47%" }]}>
                <Text style={s.label}>{n.toLocaleString()} coins</Text>
                <Text style={s.body}>Pricing coming soon</Text>
              </View>
            ))}
          </View>
          <Text style={s.body}>
            Card and mobile money purchases will be available after payment
            integration. No money is charged in this demo.
          </Text>
          <Text style={s.heading}>Earnings</Text>
          <View style={s.card}>
            <Text style={s.label}>
              {pendingCoins} demo gift coins received in your rooms
            </Text>
            <Text style={s.body}>
              These are gross gifts, before allocation. Host, guest and Eventis
              shares await a confirmed policy.
            </Text>
            <Text style={s.body}>
              Available cash: unavailable · Withdrawals: not enabled
            </Text>
          </View>
          <Text style={s.heading}>Activity</Text>
          {myTransactions.length === 0 ? (
            <Text style={s.body}>Your gifts will appear here.</Text>
          ) : (
            [...myTransactions].reverse().map((t) => (
              <View key={t.id} style={s.card}>
                <Text style={s.label}>
                  {LIVE_GIFTS.find((g) => g.id === t.giftId)?.emoji}{" "}
                  {t.senderId === user.id ? "Sent" : "Received in room"} ·{" "}
                  {t.coins} coins
                </Text>
                <Text style={s.body}>
                  {new Date(t.at).toLocaleString()} · Demo
                </Text>
                <Text selectable style={[s.body, { fontSize: 11 }]}>
                  Reference: {t.id}
                </Text>
              </View>
            ))
          )}
        </LiveSheet>
      ) : null}
      <Modal
        visible={panel === "setup" || !!active}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (active) {
            if (active.endedAt || active.endsAt <= now) setActiveId(null);
            else setCloseSignal((n) => n + 1);
          } else setPanel(null);
        }}
      >
        {active ? (
          <LiveRoomView
            key={active.id}
            room={active}
            state={state}
            person={person}
            now={now}
            closeSignal={closeSignal}
            act={act}
            onClose={() => setActiveId(null)}
          />
        ) : panel === "setup" ? (
          <LiveSetup
            person={person}
            events={published}
            eventsLoading={eventsLoading}
            eventsError={eventsError}
            busy={busy}
            error={error}
            onStart={start}
            onClose={() => setPanel(null)}
            queueFull={rooms.length >= 5 || state.queue.length > 0}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function LiveSetup({
  person,
  events,
  eventsLoading,
  eventsError,
  busy,
  error,
  onStart,
  onClose,
  queueFull,
}: {
  person: LivePerson;
  events: PublisherEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  busy: boolean;
  error: string;
  onStart: (draft: LiveDraft) => void;
  onClose: () => void;
  queueFull: boolean;
}) {
  const insets = useAppSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"voice" | "video">("video");
  const [eventId, setEventId] = useState<string | undefined>();
  const [chatEnabled, setChatEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [settings, setSettings] = useState(false);
  const event = events.find((e) => e.id === eventId);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View
        style={[
          s.row,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: 18,
            justifyContent: "space-between",
          },
        ]}
      >
        <LiveIcon name="close" label="Close Live setup" onPress={onClose} />
        <Text style={s.eyebrow}>YOUR LIVE STUDIO</Text>
        <LiveIcon
          name="options-outline"
          label="Live setup settings"
          onPress={() => setSettings(true)}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 22, gap: 22, flexGrow: 1 }}
      >
        <View
          style={{
            flex: 1,
            minHeight: 200,
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {mode === "voice" ? (
            <View style={[s.wrap, { justifyContent: "center", maxWidth: 330 }]}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{
                    width: "29%",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 8,
                  }}
                >
                  {i === 0 ? (
                    <LiveAvatar person={person} size={72} />
                  ) : (
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: c.panel,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: c.line,
                      }}
                    >
                      <Ionicons name="add" size={26} color={c.muted} />
                    </View>
                  )}
                  <Text style={s.body}>
                    {i === 0 ? "You · host" : "Guest seat"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: c.panel,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <Ionicons name="videocam-outline" size={48} color={c.blue} />
              </View>
              <Text style={s.heading}>A moment worth sharing.</Text>
            </>
          )}
          <Text style={[s.body, { textAlign: "center", maxWidth: 310 }]}>
            Preview the {mode === "voice" ? "voice room" : "video room"}{" "}
            experience. Your camera and microphone stay off in this demo.
          </Text>
        </View>
        <View style={[s.row, { justifyContent: "center" }]}>
          <LiveButton
            compact
            secondary={mode !== "video"}
            icon="videocam-outline"
            label="Video"
            onPress={() => setMode("video")}
          />
          <LiveButton
            compact
            secondary={mode !== "voice"}
            icon="mic-outline"
            label="Voice room"
            onPress={() => setMode("voice")}
          />
        </View>
        <View style={s.card}>
          <Text style={s.eyebrow}>SET THE SCENE</Text>
          <TextInput
            accessibilityLabel="Live title"
            placeholder="Give your Live a title…"
            placeholderTextColor={c.muted}
            style={s.input}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <Text style={[s.body, { textAlign: "right", fontSize: 12 }]}>
            {title.length}/80
          </Text>
          <Text style={s.label}>
            Link one of your events <Text style={s.body}>(optional)</Text>
          </Text>
          {eventsLoading ? (
            <ActivityIndicator color={c.blue} />
          ) : eventsError ? (
            <Text style={s.error}>{eventsError}</Text>
          ) : events.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <LiveButton
                compact
                secondary={!!eventId}
                label="No event"
                onPress={() => setEventId(undefined)}
              />
              {events.map((e) => (
                <LiveButton
                  key={e.id}
                  compact
                  secondary={eventId !== e.id}
                  label={e.title}
                  onPress={() => setEventId(e.id)}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={s.body}>
              Your published events will appear here. You can also host a
              conversation without an event.
            </Text>
          )}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        <LiveButton
          tone="live"
          label={
            busy
              ? "Preparing…"
              : queueFull
                ? "Join demo waiting queue"
                : "Start demo Live"
          }
          icon="radio-outline"
          disabled={busy || !title.trim()}
          onPress={() =>
            onStart({
              title,
              mode,
              eventId: event?.id,
              cover: event?.image ?? "concert",
              chatEnabled,
              giftsEnabled,
            })
          }
        />
        <Text
          style={[
            s.body,
            { textAlign: "center", paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          30-minute limit · Up to 4 guests · Demo only
        </Text>
      </ScrollView>
      {settings ? (
        <LiveSheet title="Room settings" onClose={() => setSettings(false)}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.label}>Allow chat</Text>
            <Switch
              accessibilityLabel="Allow chat"
              value={chatEnabled}
              onValueChange={setChatEnabled}
              trackColor={{ true: c.blue }}
            />
          </View>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.label}>Allow demo gifts</Text>
            <Switch
              accessibilityLabel="Allow demo gifts"
              value={giftsEnabled}
              onValueChange={setGiftsEnabled}
              trackColor={{ true: c.blue }}
            />
          </View>
          <Text style={s.body}>
            You can change these controls during your Live.
          </Text>
        </LiveSheet>
      ) : null}
    </KeyboardAvoidingView>
  );
}
