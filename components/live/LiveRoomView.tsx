import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Share, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { LIVE_GIFTS, type LiveAction, type LivePerson, type LiveRoom, type LiveState } from "@/services/liveState";
import { LiveAvatar, LiveButton, LiveIcon, LiveSheet, liveColors as c, liveStyles as s } from "./LivePrimitives";
import { useEvents } from "@/context/EventsContext";
import { getEventImage } from "@/constants/eventImages";

type Props = { room: LiveRoom; person: LivePerson; state: LiveState; now: number; closeSignal: number; act: (actor: LivePerson, action: LiveAction) => Promise<LiveState>; onClose: () => void;
  broadcast?: { stage: React.ReactNode; controls: React.ReactNode; status: string; onShare: () => void } };
type Panel = "people" | "gifts" | "settings" | "leave" | "simulate" | "event" | null;
const samplePeople: LivePerson[] = [
  { id: "preview_aline", name: "Aline", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
  { id: "preview_eric", name: "Eric" }, { id: "preview_keza", name: "Keza" }, { id: "preview_jules", name: "Jules" }, { id: "preview_joy", name: "Joy" },
];
export function LiveRoomView({ room, person, state, now, closeSignal, act, onClose, broadcast }: Props) {
  const insets = useAppSafeAreaInsets();
  const { events } = useEvents();
  const featuredEvent = events.find(e => e.id === room.eventId);
  const host = person.id === room.host.id;
  const ended = !!room.endedAt || room.endsAt <= now;
  const blocked = room.blockedIds.includes(person.id);
  const guest = room.guests.some(p => p.id === person.id);
  const requested = room.requests.some(p => p.id === person.id);
  const invited = room.invitations.some(p => p.id === person.id);
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => { if (closeSignal) setPanel("leave"); }, [closeSignal]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const giftTransaction = useRef("");
  const [reaction, setReaction] = useState("");
  const animation = useRef(new Animated.Value(0)).current;
  const chat = useRef<ScrollView>(null);
  const lastGift = room.messages.filter(m => m.kind === "gift").at(-1);
  useEffect(() => {
    if (!lastGift || Date.now() - lastGift.at > 5000) return;
    setReaction(LIVE_GIFTS.find(g => lastGift.text.includes(g.name))?.emoji ?? "✨");
    // A new gift triggers once; ticking the room clock never restarts this animation.
  }, [lastGift?.id]);
  useEffect(() => {
    if (!reaction) return;
    animation.setValue(0);
    Animated.timing(animation, { toValue: 1, duration: 1600, useNativeDriver: Platform.OS !== "web" }).start(({ finished }) => { if (finished) setReaction(""); });
    return () => animation.stopAnimation();
  }, [reaction, animation]);
  const run = async (action: LiveAction, actor = person, after?: () => void) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await act(actor, action); after?.(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work. Try again."); }
    finally { lock.current = false; setBusy(false); }
  };
  const remaining = Math.max(0, Math.ceil((room.endsAt - now) / 1000));
  const received = state.transactions.filter(t => t.roomId === room.id).reduce((n, t) => n + t.coins, 0);
  const close = () => { if (ended || blocked) onClose(); else setPanel("leave"); };
  const notice = error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null;
  if (ended || blocked) return <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: "center", gap: 22 }}>
    <LiveAvatar person={room.host} size={84} /><Text style={s.title}>{blocked ? "You left this room" : "That’s a wrap."}</Text>
    <Text style={s.body}>{blocked ? "The host has removed your access to this Live." : `${room.title} has ended. Thanks for being part of it.`}</Text>
    {!blocked ? <View style={s.card}><Text style={s.label}>{room.reactions} reactions{broadcast ? "" : ` · ${received} demo gift coins`}</Text><Text style={s.body}>{broadcast ? "This testing session has ended." : "Demo sessions do not create withdrawable earnings."}</Text></View> : null}
    <LiveButton label="Back to Live" onPress={onClose} />
  </View>;
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: c.bg }}>
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
      {!broadcast && room.mode === "video" && room.cover ? <ImageBackground source={getEventImage(room.cover)} style={{ position: "absolute", inset: 0 }} resizeMode="cover"><LinearGradient colors={["#080C1299", "#080C1244", "#080C12"]} style={{ flex: 1 }} /></ImageBackground> : null}
      <View style={[s.row, { paddingHorizontal: 16 }]}>
        <LiveAvatar person={room.host} /><View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={s.label}>{room.host.name}</Text><Text style={s.body}>{room.audience.length} viewers · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</Text></View>
        <LiveIcon name="people-outline" label={`Participants, ${room.requests.length} requests`} onPress={() => setPanel("people")} /><LiveIcon name="close" label={host ? "End Live" : "Leave Live"} onPress={close} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 7 }}><Text style={s.label}>{room.title}</Text><View style={s.wrap}><Text style={[s.pill, (!broadcast || broadcast.status === "LIVE · TEST SESSION") && s.livePill]}>{broadcast ? broadcast.status : "LOCAL DEMO · NO BROADCAST"}</Text>{guest ? <Text style={s.pill}>ON STAGE</Text> : null}</View></View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1, justifyContent: "center" }}>
        {broadcast ? broadcast.stage : room.mode === "voice" || room.guests.length > 0 ? <View style={[s.wrap, { justifyContent: "center" }]}>
          {[room.host, ...room.guests].map((p, index) => <View key={p.id} style={{ width: "29%", alignItems: "center", paddingVertical: 12, gap: 8 }}><View style={{ padding: 4, borderWidth: 1, borderColor: c.blue, borderRadius: 60 }}><LiveAvatar person={p} size={64} /></View><Text numberOfLines={1} style={s.label}>{p.name}</Text><Text style={s.eyebrow}>{index === 0 ? "HOST" : "GUEST"}</Text></View>)}
          {Array.from({ length: 4 - room.guests.length }, (_, i) => <View key={`empty_${i}`} style={{ width: "29%", alignItems: "center", paddingVertical: 12, gap: 8 }}><View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, alignItems: "center", justifyContent: "center" }}><Ionicons name="mic-outline" size={24} color={c.muted} /></View><Text style={s.body}>Open seat</Text></View>)}
        </View> : <View style={{ alignItems: "center", gap: 10, paddingVertical: 30 }}><Ionicons name="videocam-outline" size={42} color={c.text} /><Text style={s.label}>Video preview</Text><Text style={[s.body, { textAlign: "center" }]}>This cover stands in for the live camera.{"\n"}Audio and video are not being transmitted.</Text></View>}
      </ScrollView>
      {reaction ? <Animated.Text pointerEvents="none" style={{ position: "absolute", top: "35%", alignSelf: "center", fontSize: 80, opacity: animation.interpolate({ inputRange: [0, .2, .75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [50, -70] }) }] }}>{reaction}</Animated.Text> : null}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {broadcast?.controls}
        {room.eventId ? <LiveButton secondary compact icon="calendar-outline" label={featuredEvent ? "Featured event" : "Event unavailable"} onPress={() => setPanel("event")} /> : null}
        {invited ? <View style={s.card}><Text style={s.label}>The host invited you on stage</Text><View style={s.wrap}><LiveButton compact label="Accept invite" disabled={busy} onPress={() => void run({ type: "acceptInvite", roomId: room.id })} /><LiveButton compact secondary label="Decline" disabled={busy} onPress={() => void run({ type: "declineInvite", roomId: room.id })} /></View></View> : null}
        <ScrollView ref={chat} style={{ maxHeight: 150 }} onContentSizeChange={() => chat.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
          {room.messages.length === 0 ? <Text style={s.body}>Welcome in. Say hello and keep it kind.</Text> : room.messages.map(m => <View key={m.id} style={[s.row, { alignItems: "flex-start" }]}><LiveAvatar person={m.person} size={26} /><Text style={{ flex: 1, color: m.kind === "gift" ? c.blue : c.text, fontSize: 14, lineHeight: 21 }}><Text style={{ fontWeight: "700" }}>{m.person.name} </Text>{m.text}</Text></View>)}
        </ScrollView>
        {notice}
        <View style={s.row}><TextInput accessibilityLabel="Live message" value={message} onChangeText={setMessage} maxLength={240} placeholder={room.chatEnabled || host ? "Say something…" : "Chat is paused"} placeholderTextColor={c.muted} editable={(room.chatEnabled || host) && !room.mutedIds.includes(person.id)} style={[s.input, { flex: 1, minHeight: 46, paddingVertical: 10 }]} returnKeyType="send" onSubmitEditing={() => void run({ type: "message", roomId: room.id, text: message }, person, () => setMessage(""))} />
          <LiveIcon name="send-outline" label="Send message" onPress={() => void run({ type: "message", roomId: room.id, text: message }, person, () => setMessage(""))} />
          {!broadcast && !host && !guest ? <LiveIcon name="gift-outline" label="Send a gift" onPress={() => { setSelectedGift(null); setPanel("gifts"); }} /> : null}
        </View>
        <View style={[s.wrap, { justifyContent: "space-between" }]}>
          {host ? <LiveButton secondary compact icon="options-outline" label="Controls" onPress={() => setPanel("settings")} /> : <LiveButton secondary compact icon="mic-outline" label={guest ? "Leave stage" : requested ? "Cancel request" : "Join stage"} disabled={busy} onPress={() => void run({ type: guest ? "leaveSeat" : requested ? "cancelRequest" : "request", roomId: room.id })} />}
          <LiveButton secondary compact icon="heart-outline" label={String(room.reactions)} disabled={busy} onPress={() => void run({ type: "react", roomId: room.id }, person, () => setReaction("💙"))} />
          <LiveButton secondary compact icon="share-outline" label="Share" onPress={() => { if (broadcast) broadcast.onShare(); else void Share.share({ message: `Try Eventis Live: ${room.title}. This is a local preview, so this room cannot be joined from another device yet.` }).catch(() => setError("Sharing is unavailable right now.")); }} />
        </View>
      </View>
    </View>
    {panel ? <LiveSheet title={{ people: "People in the room", gifts: "Send a little love", settings: "Host controls", leave: host ? "End your Live?" : "Leave this Live?", simulate: "Test the room", event: "Featured event" }[panel]} onClose={() => { setPanel(null); setError(""); }}>
      {notice}
      {panel === "event" ? featuredEvent ? <><Text style={s.heading}>{featuredEvent.title}</Text><Text style={s.body}>{featuredEvent.date} · {featuredEvent.time}</Text><Text style={s.label}>{featuredEvent.location}</Text><Text style={s.body}>{featuredEvent.description}</Text><Text style={s.body}>{featuredEvent.isPaid ? `${featuredEvent.currency} ${featuredEvent.price.toLocaleString()}` : "Free entry"}</Text></> : <Text style={s.body}>This event is no longer available. You can keep enjoying the Live.</Text> : null}
      {panel === "leave" ? <><Text style={s.body}>{host ? broadcast ? "End the broadcast and disconnect your camera and microphone for everyone." : "Everyone will leave the room. This session counts toward your daily limit." : "You can return while this room is still live. Your guest seat will be released."}</Text><LiveButton danger disabled={busy} label={host ? "End Live for everyone" : "Leave room"} onPress={() => void run({ type: host ? "end" : "leave", roomId: room.id }, person, () => { setPanel(null); if (!host) onClose(); })} />{broadcast ? <LiveButton secondary label="Disconnect this device" onPress={onClose} /> : null}<LiveButton secondary label="Keep watching" onPress={() => setPanel(null)} /></> : null}
      {panel === "people" ? <>
        <Text style={s.body}>{room.guests.length} of 4 guest seats occupied. Invitations need the viewer’s acceptance.</Text>
        {!broadcast && !host ? <LiveButton secondary compact label="Simulate host response" onPress={() => setPanel("simulate")} /> : null}
        {room.requests.length > 0 && host ? <><Text style={s.eyebrow}>REQUESTS</Text>{room.requests.map(p => <View key={p.id} style={s.card}><View style={s.row}><LiveAvatar person={p} /><Text style={s.label}>{p.name}</Text></View><View style={s.wrap}><LiveButton compact label="Accept" disabled={busy || room.guests.length >= 4} onPress={() => void run({ type: "accept", roomId: room.id, person: p })} /><LiveButton compact secondary label="Decline" disabled={busy} onPress={() => void run({ type: "reject", roomId: room.id, person: p })} /></View></View>)}</> : null}
        {[room.host, ...room.audience].map(p => <View key={p.id} style={s.card}><View style={s.row}><LiveAvatar person={p} /><View style={{ flex: 1 }}><Text style={s.label}>{p.name}</Text><Text style={s.body}>{p.id === room.host.id ? "Host" : room.guests.some(g => g.id === p.id) ? "Guest" : "Viewer"}</Text></View></View>
          {host && p.id !== person.id ? <View style={s.wrap}>
            <LiveButton secondary compact label={room.guests.some(g => g.id === p.id) ? "Remove guest" : room.invitations.some(g => g.id === p.id) ? "Invited" : "Invite"} disabled={busy || room.invitations.some(g => g.id === p.id)} onPress={() => void run({ type: room.guests.some(g => g.id === p.id) ? "remove" : "invite", roomId: room.id, person: p })} />
            <LiveButton secondary compact label={room.mutedIds.includes(p.id) ? "Unmute chat" : "Mute chat"} disabled={busy} onPress={() => void run({ type: room.mutedIds.includes(p.id) ? "unmute" : "mute", roomId: room.id, person: p })} />
            <LiveButton secondary compact danger label="Block" disabled={busy} onPress={() => void run({ type: "block", roomId: room.id, person: p })} />
          </View> : null}</View>)}
      </> : null}
      {panel === "gifts" ? <><Text style={s.body}>Balance: {state.wallets[person.id] ?? 500} demo coins · no cash value</Text><View style={s.wrap}>{LIVE_GIFTS.map(g => <View key={g.id} style={{ width: "47%", gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: selectedGift === g.id ? c.blue : c.line }}><Text style={{ fontSize: 34 }}>{g.emoji}</Text><Text style={s.label}>{g.name}</Text><LiveButton compact secondary label={`${g.coins} coins`} onPress={() => { giftTransaction.current = `gift_${person.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`; setSelectedGift(g.id); }} /></View>)}</View>
        {selectedGift ? <><Text style={s.body}>Send {LIVE_GIFTS.find(g => g.id === selectedGift)?.name} to {room.host.name}? The coins will be deducted from your demo balance.</Text><LiveButton label="Confirm gift" disabled={busy || !room.giftsEnabled} onPress={() => void run({ type: "gift", roomId: room.id, giftId: selectedGift, transactionId: giftTransaction.current }, person, () => { setSelectedGift(null); setPanel(null); })} /></> : null}<Text style={s.body}>Daily limit: 1,000 coins. Purchases and cash withdrawals are not enabled.</Text></> : null}
      {panel === "settings" ? <><LiveButton secondary label={room.chatEnabled ? "Pause chat" : "Enable chat"} disabled={busy} onPress={() => void run({ type: "settings", roomId: room.id, chatEnabled: !room.chatEnabled, giftsEnabled: room.giftsEnabled })} />{!broadcast ? <LiveButton secondary label={room.giftsEnabled ? "Pause gifts" : "Enable gifts"} disabled={busy} onPress={() => void run({ type: "settings", roomId: room.id, chatEnabled: room.chatEnabled, giftsEnabled: !room.giftsEnabled })} /> : null}<LiveButton secondary label={`Guest requests (${room.requests.length})`} onPress={() => setPanel("people")} />{!broadcast ? <LiveButton secondary label="Simulate demo participants" onPress={() => setPanel("simulate")} /> : null}<LiveButton danger label="End Live" onPress={() => setPanel("leave")} /></> : null}
      {panel === "simulate" ? <><Text style={s.body}>These controls simulate another participant on this device. They do not connect real viewers.</Text>
        {!host ? <View style={s.card}><Text style={s.label}>Act as the sample host</Text><LiveButton secondary label="Approve my request" disabled={busy || !requested} onPress={() => void run({ type: "accept", roomId: room.id, person }, room.host, () => setPanel(null))} /><LiveButton secondary label="Decline my request" disabled={busy || !requested} onPress={() => void run({ type: "reject", roomId: room.id, person }, room.host)} /><LiveButton secondary label="Invite me on stage" disabled={busy || guest} onPress={() => void run({ type: "invite", roomId: room.id, person }, room.host, () => setPanel(null))} /></View> : null}
        {samplePeople.map(p => <View key={p.id} style={s.card}><Text style={s.label}>{p.name}</Text><View style={s.wrap}><LiveButton compact secondary label="Join room" disabled={busy} onPress={() => void run({ type: "join", roomId: room.id }, p)} /><LiveButton compact secondary label="Request seat" disabled={busy} onPress={() => void run({ type: "request", roomId: room.id }, p)} />{room.invitations.some(i => i.id === p.id) ? <LiveButton compact label="Accept invite" disabled={busy} onPress={() => void run({ type: "acceptInvite", roomId: room.id }, p)} /> : null}<LiveButton compact secondary label="Say hello" disabled={busy} onPress={() => void run({ type: "message", roomId: room.id, text: "Hello everyone! Happy to be here." }, p)} /><LiveButton compact secondary label="Send Spark gift" disabled={busy} onPress={() => void run({ type: "gift", roomId: room.id, giftId: "spark", transactionId: `sample_${p.id}_${Date.now()}` }, p)} /></View></View>)}<LiveButton label="Manage requests" onPress={() => setPanel("people")} /></> : null}
    </LiveSheet> : null}
  </KeyboardAvoidingView>;
}
