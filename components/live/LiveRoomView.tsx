import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  LIVE_GIFTS,
  type LiveAction,
  type LivePerson,
  type LiveRoom,
  type LiveState,
} from "@/services/liveState";
import {
  LiveAvatar,
  LiveButton,
  LiveOverlayAction,
  LiveSheet,
  liveColors as c,
  liveStyles as s,
} from "./LivePrimitives";
import type { LiveEventReference } from "@/services/liveDirectoryService";
import { useEvents } from "@/context/EventsContext";
import { getEventImage } from "@/constants/eventImages";

type Props = {
  room: LiveRoom;
  person: LivePerson;
  state: LiveState;
  now: number;
  closeSignal: number;
  act: (actor: LivePerson, action: LiveAction) => Promise<LiveState>;
  onClose: () => void;
  broadcast?: {
    stage: React.ReactNode;
    controls: React.ReactNode;
    status: string;
    onShare: () => void;
    notice?: string;
    onDismissNotice?: () => void;
    event?: LiveEventReference;
    onStage?: boolean;
  };
};
type Panel =
  "people" | "gifts" | "settings" | "leave" | "simulate" | "event" | null;
const samplePeople: LivePerson[] = [
  {
    id: "preview_aline",
    name: "Aline",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  { id: "preview_eric", name: "Eric" },
  { id: "preview_keza", name: "Keza" },
  { id: "preview_jules", name: "Jules" },
  { id: "preview_joy", name: "Joy" },
];
export function LiveRoomView({
  room,
  person,
  state,
  now,
  closeSignal,
  act,
  onClose,
  broadcast,
}: Props) {
  const insets = useAppSafeAreaInsets();
  const { events } = useEvents();
  const { height } = useWindowDimensions();
  const [chatVisible, setChatVisible] = useState(true);
  const [typing, setTyping] = useState(false);
  const followChat = useRef(true);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidHide", () =>
      setTyping(false),
    );
    return () => subscription.remove();
  }, []);
  const linkedEvent = broadcast?.event;
  const featuredEvent =
    events.find((e) => e.id === room.eventId) ??
    (linkedEvent && linkedEvent.id === room.eventId ? linkedEvent : undefined);
  const host = person.id === room.host.id;
  const ended = !!room.endedAt || room.endsAt <= now;
  const blocked = room.blockedIds.includes(person.id);
  const guest = room.guests.some((p) => p.id === person.id);
  const requested = room.requests.some((p) => p.id === person.id);
  const invited = room.invitations.some((p) => p.id === person.id);
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => {
    if (closeSignal) setPanel("leave");
  }, [closeSignal]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const giftTransaction = useRef("");
  const [reaction, setReaction] = useState("");
  const animation = useRef(new Animated.Value(0)).current;
  const chat = useRef<ScrollView>(null);
  const lastGift = room.messages.filter((m) => m.kind === "gift").at(-1);
  useEffect(() => {
    if (!lastGift || Date.now() - lastGift.at > 5000) return;
    setReaction(
      LIVE_GIFTS.find((g) => lastGift.text.includes(g.name))?.emoji ?? "✨",
    );
    // A new gift triggers once; ticking the room clock never restarts this animation.
  }, [lastGift?.id]);
  useEffect(() => {
    if (!reaction) return;
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished) setReaction("");
    });
    return () => animation.stopAnimation();
  }, [reaction, animation]);
  const run = async (
    action: LiveAction,
    actor = person,
    after?: () => void,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await act(actor, action);
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const remaining = Math.max(0, Math.ceil((room.endsAt - now) / 1000));
  const received = state.transactions
    .filter((t) => t.roomId === room.id)
    .reduce((n, t) => n + t.coins, 0);
  const close = () => {
    if (ended || blocked) onClose();
    else setPanel("leave");
  };
  const notice = error ? (
    <Text accessibilityRole="alert" style={s.error}>
      {error}
    </Text>
  ) : null;
  if (ended || blocked)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 24,
          justifyContent: "center",
          gap: 22,
        }}
      >
        <LiveAvatar person={room.host} size={84} />
        <Text style={s.title}>
          {blocked ? "You left this room" : "That’s a wrap."}
        </Text>
        <Text style={s.body}>
          {blocked
            ? "The host has removed your access to this Live."
            : `${room.title} has ended. Thanks for being part of it.`}
        </Text>
        {!blocked ? (
          <View style={s.card}>
            <Text style={s.label}>
              {room.reactions} reactions
              {broadcast ? "" : ` · ${received} demo gift coins`}
            </Text>
            <Text style={s.body}>
              {broadcast
                ? "This testing session has ended."
                : "Demo sessions do not create withdrawable earnings."}
            </Text>
          </View>
        ) : null}
        <LiveButton label="Back to Live" onPress={onClose} />
      </View>
    );
  const share = () => {
    if (broadcast) broadcast.onShare();
    else
      void Share.share({
        message: `Try Eventis Live: ${room.title}. This is a local preview, so this room cannot be joined from another device yet.`,
      }).catch(() => setError("Sharing is unavailable right now."));
  };
  const sendMessage = () => {
    if (
      !message.trim() ||
      busy ||
      !(room.chatEnabled || host) ||
      room.mutedIds.includes(person.id)
    )
      return;
    void run(
      { type: "message", roomId: room.id, text: message },
      person,
      () => {
        setMessage("");
        followChat.current = true;
      },
    );
  };
  const commentsHeight = typing
    ? 96
    : room.guests.length > 0
      ? 120
      : Math.min(190, height * 0.23);
  return (
    <View style={ui.screen}>
      <StatusBar style="light" />
      <View testID="live-media-canvas" style={StyleSheet.absoluteFill}>
        {broadcast ? (
          broadcast.stage
        ) : room.mode === "video" && room.cover && room.guests.length === 0 ? (
          <ImageBackground
            source={getEventImage(room.cover)}
            style={{ flex: 1 }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#14273D", "#090D19", "#111C30"]}
            style={ui.voiceStage}
          >
            <Text style={ui.voiceLabel}>LIVE CONVERSATION</Text>
            <View style={ui.voiceGrid}>
              {[room.host, ...room.guests].map((p, index) => (
                <View key={p.id} style={ui.voiceSeat}>
                  <View style={ui.voiceRing}>
                    <LiveAvatar
                      person={p}
                      size={room.guests.length > 1 ? 62 : 88}
                    />
                  </View>
                  <Text numberOfLines={1} style={ui.voiceName}>
                    {p.name}
                  </Text>
                  <Text style={ui.voiceRole}>
                    {index === 0 ? "Host" : "Guest"}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        )}
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={["#0009", "#0000"]}
        style={ui.topShade}
      />
      <View
        pointerEvents="box-none"
        style={[ui.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={ui.headerRow}>
          <View style={ui.hostChip}>
            <LiveAvatar person={room.host} size={34} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={ui.hostName}>
                {room.host.name}
              </Text>
              <View style={ui.hostMeta}>
                <View style={ui.liveBadge}>
                  <View style={ui.liveDot} />
                  <Text style={ui.liveText}>
                    {broadcast
                      ? broadcast.status === "LIVE · TEST SESSION"
                        ? "LIVE"
                        : broadcast.status
                      : "DEMO"}
                  </Text>
                </View>
                <Text style={ui.timer}>
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Participants, ${room.requests.length} requests`}
            onPress={() => setPanel("people")}
            style={ui.audience}
          >
            <Ionicons name="eye-outline" size={15} color="#FFF" />
            <Text style={ui.audienceCount}>{room.audience.length}</Text>
            {host && room.requests.length > 0 ? (
              <View style={ui.requestDot} />
            ) : null}
          </Pressable>
          <LiveOverlayAction
            name="close"
            label={host ? "End Live" : "Leave Live"}
            onPress={close}
          />
        </View>
        <Text numberOfLines={1} style={ui.roomTitle}>
          {room.title}
        </Text>
        {guest && (!broadcast || broadcast.onStage) ? (
          <Text style={ui.stagePill}>ON STAGE</Text>
        ) : null}
      </View>
      {!typing ? (
        <View
          style={[ui.rail, { top: Math.max(insets.top + 132, height * 0.29) }]}
        >
          {broadcast?.controls}
          {!host ? (
            <LiveOverlayAction
              name="people-outline"
              label={
                guest
                  ? "Leave stage"
                  : requested
                    ? "Cancel request"
                    : "Join stage"
              }
              caption={guest ? "Leave" : requested ? "Requested" : "Join"}
              active={requested}
              disabled={busy}
              onPress={() =>
                void run({
                  type: guest
                    ? "leaveSeat"
                    : requested
                      ? "cancelRequest"
                      : "request",
                  roomId: room.id,
                })
              }
            />
          ) : null}
          <LiveOverlayAction
            name="heart"
            label="Send a reaction"
            caption={String(room.reactions)}
            disabled={busy}
            onPress={() =>
              void run({ type: "react", roomId: room.id }, person, () =>
                setReaction("💙"),
              )
            }
          />
        </View>
      ) : null}
      {reaction ? (
        <Animated.Text
          pointerEvents="none"
          style={[
            ui.reaction,
            {
              opacity: animation.interpolate({
                inputRange: [0, 0.2, 0.75, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, -160],
                  }),
                },
              ],
            },
          ]}
        >
          {reaction}
        </Animated.Text>
      ) : null}
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="box-none" style={ui.bottomAnchor}>
          <LinearGradient
            pointerEvents="none"
            colors={["#0000", "#0008", "#000D"]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="box-none"
            style={[ui.bottomContent, { paddingRight: typing ? 14 : 70 }]}
          >
            {room.eventId && !typing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View event"
                onPress={() => setPanel("event")}
                style={ui.eventChip}
              >
                <Ionicons name="calendar-outline" size={15} color={c.blue} />
                <Text
                  numberOfLines={1}
                  style={ui.eventText}
                >{`View event · ${featuredEvent?.title || "Event details"}`}</Text>
                <Ionicons name="chevron-forward" size={13} color="#FFF" />
              </Pressable>
            ) : null}
            {invited ? (
              <View style={ui.invite}>
                <Text style={ui.commentText}>
                  You’re invited to join the stage
                </Text>
                <View style={s.wrap}>
                  <LiveButton
                    compact
                    label="Accept invite"
                    disabled={busy}
                    onPress={() =>
                      void run({ type: "acceptInvite", roomId: room.id })
                    }
                  />
                  <LiveButton
                    compact
                    secondary
                    label="Decline"
                    disabled={busy}
                    onPress={() =>
                      void run({ type: "declineInvite", roomId: room.id })
                    }
                  />
                </View>
              </View>
            ) : null}
            {chatVisible ? (
              <ScrollView
                ref={chat}
                testID="live-floating-chat"
                style={{ height: commentsHeight, flexGrow: 0 }}
                showsVerticalScrollIndicator={false}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } =
                    event.nativeEvent;
                  followChat.current =
                    contentSize.height -
                      contentOffset.y -
                      layoutMeasurement.height <
                    48;
                }}
                scrollEventThrottle={100}
                onContentSizeChange={() => {
                  if (followChat.current)
                    chat.current?.scrollToEnd({ animated: true });
                }}
                contentContainerStyle={ui.comments}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={ui.welcome}>
                  {broadcast
                    ? host
                      ? "You’re live. Say hello to the room."
                      : "Welcome in. Say hello and keep it kind."
                    : "Demo room · Camera and microphone are not broadcasting."}
                </Text>
                {room.messages.slice(-40).map((m) => (
                  <View key={m.id} style={ui.comment}>
                    <LiveAvatar person={m.person} size={25} />
                    <View style={ui.commentBubble}>
                      <Text style={ui.commentName}>{m.person.name}</Text>
                      <Text
                        style={[
                          ui.commentText,
                          m.kind === "gift" ? { color: c.blue } : null,
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {error || broadcast?.notice ? (
              <View style={ui.notice}>
                <Text
                  accessibilityRole="alert"
                  numberOfLines={3}
                  style={ui.noticeText}
                >
                  {error || broadcast?.notice}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss Live notice"
                  hitSlop={8}
                  onPress={() => {
                    setError("");
                    broadcast?.onDismissNotice?.();
                  }}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </Pressable>
              </View>
            ) : null}
          </View>
          <View
            style={[
              ui.composerRow,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={ui.composer}>
              <TextInput
                accessibilityLabel="Live message"
                value={message}
                onChangeText={setMessage}
                maxLength={240}
                placeholder={
                  room.mutedIds.includes(person.id)
                    ? "You’re muted"
                    : room.chatEnabled || host
                      ? "Say something…"
                      : "Chat is paused"
                }
                placeholderTextColor="#E2E5ED"
                editable={
                  (room.chatEnabled || host) &&
                  !room.mutedIds.includes(person.id)
                }
                style={ui.messageInput}
                returnKeyType="send"
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
                onSubmitEditing={sendMessage}
              />
              {message.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  hitSlop={6}
                  onPress={sendMessage}
                  style={ui.send}
                >
                  <Ionicons name="arrow-up" size={20} color="#FFF" />
                </Pressable>
              ) : null}
            </View>
            {!typing ? (
              <>
                <LiveOverlayAction
                  name="ellipsis-horizontal"
                  label={host ? "Host controls" : "Live options"}
                  onPress={() => setPanel("settings")}
                />
                {!broadcast && !host && !guest ? (
                  <LiveOverlayAction
                    name="gift-outline"
                    label="Send a gift"
                    onPress={() => {
                      setSelectedGift(null);
                      setPanel("gifts");
                    }}
                  />
                ) : null}
                <LiveOverlayAction
                  name="arrow-redo-outline"
                  label="Share Live"
                  onPress={share}
                />
              </>
            ) : (
              <LiveOverlayAction
                name="checkmark"
                label="Done typing"
                onPress={() => {
                  Keyboard.dismiss();
                  setTyping(false);
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      {panel ? (
        <LiveSheet
          title={
            {
              people: "People in the room",
              gifts: "Send a little love",
              settings: host ? "Host controls" : "Live options",
              leave: host ? "End your Live?" : "Leave this Live?",
              simulate: "Test the room",
              event: "Featured event",
            }[panel]
          }
          onClose={() => {
            setPanel(null);
            setError("");
          }}
        >
          {notice}
          {panel === "event" ? (
            featuredEvent ? (
              <>
                <Text style={s.heading}>{featuredEvent.title}</Text>
                <Text style={s.body}>
                  {featuredEvent.date} · {featuredEvent.time}
                </Text>
                <Text style={s.label}>{featuredEvent.location}</Text>
                <Text style={s.body}>{featuredEvent.description}</Text>
                <Text style={s.body}>
                  {featuredEvent.isPaid
                    ? `${featuredEvent.currency} ${featuredEvent.price.toLocaleString()}`
                    : "Free entry"}
                </Text>
              </>
            ) : (
              <Text style={s.body}>
                This event is no longer available. You can keep enjoying the
                Live.
              </Text>
            )
          ) : null}
          {panel === "leave" ? (
            <>
              <Text style={s.body}>
                {host
                  ? broadcast
                    ? "End the broadcast and disconnect your camera and microphone for everyone."
                    : "Everyone will leave the room. This session counts toward your daily limit."
                  : "You can return while this room is still live. Your guest seat will be released."}
              </Text>
              <LiveButton
                danger
                disabled={busy}
                label={host ? "End Live for everyone" : "Leave room"}
                onPress={() =>
                  void run(
                    { type: host ? "end" : "leave", roomId: room.id },
                    person,
                    () => {
                      setPanel(null);
                      if (!host) onClose();
                    },
                  )
                }
              />
              {broadcast ? (
                <LiveButton
                  secondary
                  label="Disconnect this device"
                  onPress={onClose}
                />
              ) : null}
              <LiveButton
                secondary
                label="Keep watching"
                onPress={() => setPanel(null)}
              />
            </>
          ) : null}
          {panel === "people" ? (
            <>
              <Text style={s.body}>
                {room.guests.length} of 4 guest seats occupied. Invitations need
                the viewer’s acceptance.
              </Text>
              {!broadcast && !host ? (
                <LiveButton
                  secondary
                  compact
                  label="Simulate host response"
                  onPress={() => setPanel("simulate")}
                />
              ) : null}
              {room.requests.length > 0 && host ? (
                <>
                  <Text style={s.eyebrow}>REQUESTS</Text>
                  {room.requests.map((p) => (
                    <View key={p.id} style={s.card}>
                      <View style={s.row}>
                        <LiveAvatar person={p} />
                        <Text style={s.label}>{p.name}</Text>
                      </View>
                      <View style={s.wrap}>
                        <LiveButton
                          compact
                          label="Accept"
                          disabled={busy || room.guests.length >= 4}
                          onPress={() =>
                            void run({
                              type: "accept",
                              roomId: room.id,
                              person: p,
                            })
                          }
                        />
                        <LiveButton
                          compact
                          secondary
                          label="Decline"
                          disabled={busy}
                          onPress={() =>
                            void run({
                              type: "reject",
                              roomId: room.id,
                              person: p,
                            })
                          }
                        />
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
              {[room.host, ...room.audience].map((p) => (
                <View key={p.id} style={s.card}>
                  <View style={s.row}>
                    <LiveAvatar person={p} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>{p.name}</Text>
                      <Text style={s.body}>
                        {p.id === room.host.id
                          ? "Host"
                          : room.guests.some((g) => g.id === p.id)
                            ? "Guest"
                            : "Viewer"}
                      </Text>
                    </View>
                  </View>
                  {host && p.id !== person.id ? (
                    <View style={s.wrap}>
                      <LiveButton
                        secondary
                        compact
                        label={
                          room.guests.some((g) => g.id === p.id)
                            ? "Remove guest"
                            : room.invitations.some((g) => g.id === p.id)
                              ? "Invited"
                              : "Invite"
                        }
                        disabled={
                          busy || room.invitations.some((g) => g.id === p.id)
                        }
                        onPress={() =>
                          void run({
                            type: room.guests.some((g) => g.id === p.id)
                              ? "remove"
                              : "invite",
                            roomId: room.id,
                            person: p,
                          })
                        }
                      />
                      <LiveButton
                        secondary
                        compact
                        label={
                          room.mutedIds.includes(p.id)
                            ? "Unmute chat"
                            : "Mute chat"
                        }
                        disabled={busy}
                        onPress={() =>
                          void run({
                            type: room.mutedIds.includes(p.id)
                              ? "unmute"
                              : "mute",
                            roomId: room.id,
                            person: p,
                          })
                        }
                      />
                      <LiveButton
                        secondary
                        compact
                        danger
                        label="Block"
                        disabled={busy}
                        onPress={() =>
                          void run({
                            type: "block",
                            roomId: room.id,
                            person: p,
                          })
                        }
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
          {panel === "gifts" ? (
            <>
              <Text style={s.body}>
                Balance: {state.wallets[person.id] ?? 500} demo coins · no cash
                value
              </Text>
              <View style={s.wrap}>
                {LIVE_GIFTS.map((g) => (
                  <View
                    key={g.id}
                    style={{
                      width: "47%",
                      gap: 6,
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selectedGift === g.id ? c.blue : c.line,
                    }}
                  >
                    <Text style={{ fontSize: 34 }}>{g.emoji}</Text>
                    <Text style={s.label}>{g.name}</Text>
                    <LiveButton
                      compact
                      secondary
                      label={`${g.coins} coins`}
                      onPress={() => {
                        giftTransaction.current = `gift_${person.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        setSelectedGift(g.id);
                      }}
                    />
                  </View>
                ))}
              </View>
              {selectedGift ? (
                <>
                  <Text style={s.body}>
                    Send {LIVE_GIFTS.find((g) => g.id === selectedGift)?.name}{" "}
                    to {room.host.name}? The coins will be deducted from your
                    demo balance.
                  </Text>
                  <LiveButton
                    label="Confirm gift"
                    disabled={busy || !room.giftsEnabled}
                    onPress={() =>
                      void run(
                        {
                          type: "gift",
                          roomId: room.id,
                          giftId: selectedGift,
                          transactionId: giftTransaction.current,
                        },
                        person,
                        () => {
                          setSelectedGift(null);
                          setPanel(null);
                        },
                      )
                    }
                  />
                </>
              ) : null}
              <Text style={s.body}>
                Daily limit: 1,000 coins. Purchases and cash withdrawals are not
                enabled.
              </Text>
            </>
          ) : null}
          {panel === "settings" ? (
            <>
              <LiveButton
                secondary
                icon={chatVisible ? "chatbubble-outline" : "chatbubble"}
                label={chatVisible ? "Hide comments" : "Show comments"}
                onPress={() => {
                  setChatVisible((v) => !v);
                  setPanel(null);
                }}
              />
              {broadcast ? (
                <>
                  <LiveButton
                    secondary
                    icon="share-outline"
                    label="Share Live"
                    onPress={share}
                  />
                  <Text style={s.body}>
                    Development broadcast · Share the Live link to invite
                    viewers.
                  </Text>
                </>
              ) : null}
              {host ? (
                <>
                  <LiveButton
                    secondary
                    label={room.chatEnabled ? "Pause chat" : "Enable chat"}
                    disabled={busy}
                    onPress={() =>
                      void run({
                        type: "settings",
                        roomId: room.id,
                        chatEnabled: !room.chatEnabled,
                        giftsEnabled: room.giftsEnabled,
                      })
                    }
                  />
                  {!broadcast ? (
                    <LiveButton
                      secondary
                      label={room.giftsEnabled ? "Pause gifts" : "Enable gifts"}
                      disabled={busy}
                      onPress={() =>
                        void run({
                          type: "settings",
                          roomId: room.id,
                          chatEnabled: room.chatEnabled,
                          giftsEnabled: !room.giftsEnabled,
                        })
                      }
                    />
                  ) : null}
                  <LiveButton
                    secondary
                    label={`Guest requests (${room.requests.length})`}
                    onPress={() => setPanel("people")}
                  />
                  {!broadcast ? (
                    <LiveButton
                      secondary
                      label="Simulate demo participants"
                      onPress={() => setPanel("simulate")}
                    />
                  ) : null}
                  <LiveButton
                    danger
                    label="End Live"
                    onPress={() => setPanel("leave")}
                  />
                </>
              ) : null}
            </>
          ) : null}
          {panel === "simulate" ? (
            <>
              <Text style={s.body}>
                These controls simulate another participant on this device. They
                do not connect real viewers.
              </Text>
              {!host ? (
                <View style={s.card}>
                  <Text style={s.label}>Act as the sample host</Text>
                  <LiveButton
                    secondary
                    label="Approve my request"
                    disabled={busy || !requested}
                    onPress={() =>
                      void run(
                        { type: "accept", roomId: room.id, person },
                        room.host,
                        () => setPanel(null),
                      )
                    }
                  />
                  <LiveButton
                    secondary
                    label="Decline my request"
                    disabled={busy || !requested}
                    onPress={() =>
                      void run(
                        { type: "reject", roomId: room.id, person },
                        room.host,
                      )
                    }
                  />
                  <LiveButton
                    secondary
                    label="Invite me on stage"
                    disabled={busy || guest}
                    onPress={() =>
                      void run(
                        { type: "invite", roomId: room.id, person },
                        room.host,
                        () => setPanel(null),
                      )
                    }
                  />
                </View>
              ) : null}
              {samplePeople.map((p) => (
                <View key={p.id} style={s.card}>
                  <Text style={s.label}>{p.name}</Text>
                  <View style={s.wrap}>
                    <LiveButton
                      compact
                      secondary
                      label="Join room"
                      disabled={busy}
                      onPress={() =>
                        void run({ type: "join", roomId: room.id }, p)
                      }
                    />
                    <LiveButton
                      compact
                      secondary
                      label="Request seat"
                      disabled={busy}
                      onPress={() =>
                        void run({ type: "request", roomId: room.id }, p)
                      }
                    />
                    {room.invitations.some((i) => i.id === p.id) ? (
                      <LiveButton
                        compact
                        label="Accept invite"
                        disabled={busy}
                        onPress={() =>
                          void run({ type: "acceptInvite", roomId: room.id }, p)
                        }
                      />
                    ) : null}
                    <LiveButton
                      compact
                      secondary
                      label="Say hello"
                      disabled={busy}
                      onPress={() =>
                        void run(
                          {
                            type: "message",
                            roomId: room.id,
                            text: "Hello everyone! Happy to be here.",
                          },
                          p,
                        )
                      }
                    />
                    <LiveButton
                      compact
                      secondary
                      label="Send Spark gift"
                      disabled={busy}
                      onPress={() =>
                        void run(
                          {
                            type: "gift",
                            roomId: room.id,
                            giftId: "spark",
                            transactionId: `sample_${p.id}_${Date.now()}`,
                          },
                          p,
                        )
                      }
                    />
                  </View>
                </View>
              ))}
              <LiveButton
                label="Manage requests"
                onPress={() => setPanel("people")}
              />
            </>
          ) : null}
        </LiveSheet>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 9,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hostChip: {
    flex: 1,
    maxWidth: 260,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#050A1466",
    padding: 5,
    paddingRight: 12,
    borderRadius: 28,
  },
  hostName: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hostMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveBadge: {
    backgroundColor: c.red,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFF" },
  liveText: {
    color: "#FFF",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  timer: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
  },
  audience: {
    height: 34,
    minWidth: 48,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#050A1466",
    borderRadius: 18,
  },
  audienceCount: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  requestDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.red,
  },
  roomTitle: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingLeft: 4,
    textShadowColor: "#000",
    textShadowRadius: 5,
  },
  stagePill: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    alignSelf: "flex-start",
    backgroundColor: "#0284C7B3",
    borderRadius: 6,
    padding: 5,
  },
  rail: { position: "absolute", right: 14, alignItems: "center", gap: 15 },
  reaction: { position: "absolute", bottom: 180, right: 22, fontSize: 56 },
  bottomAnchor: { marginTop: "auto", paddingTop: 36 },
  bottomContent: { paddingLeft: 14, gap: 10, marginBottom: 4 },
  comments: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  welcome: {
    color: "#E2E5ED",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
    textShadowColor: "#000",
    textShadowRadius: 5,
  },
  comment: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  commentBubble: { flexShrink: 1, gap: 2, paddingRight: 4 },
  commentName: {
    color: "#FFFFFFB3",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  commentText: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  composerRow: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  composer: {
    flex: 1,
    minHeight: 44,
    borderRadius: 24,
    backgroundColor: "#11182780",
    borderWidth: 1,
    borderColor: "#FFFFFF30",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  messageInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FFF",
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111827E6",
    borderRadius: 12,
    padding: 11,
  },
  noticeText: {
    flex: 1,
    color: "#FFF",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  eventChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: "#080D19B3",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  eventText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  invite: {
    backgroundColor: "#111827E6",
    borderRadius: 15,
    padding: 12,
    gap: 10,
  },
  voiceStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
    paddingHorizontal: 20,
    gap: 32,
  },
  voiceLabel: {
    color: "#FFFFFF70",
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: "Inter_600SemiBold",
  },
  voiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
  },
  voiceSeat: { width: "38%", alignItems: "center", gap: 9 },
  voiceRing: {
    padding: 8,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "#38BDF850",
  },
  voiceName: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  voiceRole: { color: "#BCC6D7", fontSize: 10, fontFamily: "Inter_400Regular" },
});
