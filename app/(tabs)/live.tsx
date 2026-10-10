import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { GlassSurface } from "@/components/GlassSurface";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { getEventImage } from "@/constants/eventImages";

interface LiveSession {
  id: string;
  eventId: string;
  eventTitle: string;
  streamTitle: string;
  hostName: string;
  hostAvatar: string;
  category: string;
  viewersCount: number;
  image: string;
  pinnedNotice: string;
  isHostOrganizer?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  message: string;
  time: string;
  isHost?: boolean;
}

const INITIAL_STREAMS: LiveSession[] = [
  {
    id: "live_1",
    eventId: "evt_1",
    eventTitle: "Neon Pulse Music Festival",
    streamTitle: "VIP Soundcheck & Artist Backstage Access",
    hostName: "Kigali Jazz",
    hostAvatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80",
    category: "Music",
    viewersCount: 1840,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    pinnedNotice: "Welcome to the VIP Soundcheck! Drop your questions for tonight's headliner below 👇",
  },
  {
    id: "live_2",
    eventId: "evt_2",
    eventTitle: "FutureTech Summit 2026",
    streamTitle: "Opening Keynote & Live AI Founder Q&A",
    hostName: "Tech Kigali",
    hostAvatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=160&auto=format&fit=crop&q=80",
    category: "Tech",
    viewersCount: 920,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
    pinnedNotice: "Ask the speakers directly in live chat — top voted questions answered at the end!",
  },
  {
    id: "live_3",
    eventId: "evt_5",
    eventTitle: "Midnight Lounge Sessions",
    streamTitle: "BK Arena DJ Warm-up Set & VIP Lounge Drop",
    hostName: "Midnight Beats",
    hostAvatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&auto=format&fit=crop&q=80",
    category: "Nightlife",
    viewersCount: 2410,
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
    pinnedNotice: "Doors open in 1 hour. Tickets moving fast at the door!",
  },
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  live_1: [
    { id: "m1", sender: "Cedric K.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", message: "Sound is incredible tonight! 🔥", time: "Just now" },
    { id: "m2", sender: "Aline M.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", message: "Who is on the opening set?", time: "Just now" },
    { id: "m3", sender: "Kigali Jazz", avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100", message: "Live band takes the main stage at 8:30 PM! 🎷", time: "Just now", isHost: true },
    { id: "m4", sender: "David R.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", message: "Got my ticket on Eventis earlier, see you guys there! 🎟️", time: "Just now" },
  ],
  live_2: [
    { id: "m21", sender: "Eric G.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", message: "Will the slide deck be shared after the live?", time: "Just now" },
    { id: "m22", sender: "Tech Kigali", avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=100", message: "Yes, attendees will get all keynote decks via email! 🚀", time: "Just now", isHost: true },
  ],
  live_3: [
    { id: "m31", sender: "Nadine B.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", message: "The bass is shaking my speakers already 😂🔥", time: "Just now" },
    { id: "m32", sender: "Patrick N.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", message: "Heading over right now!", time: "Just now" },
  ],
};

const REACTIONS = ["❤️", "🔥", "👏", "🎉", "⚡"];

export default function LiveScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events } = useEvents();

  const isOrganizer = !!user?.isBusinessAccount;

  const [streams, setStreams] = useState<LiveSession[]>(INITIAL_STREAMS);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showGateModal, setShowGateModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "evt_1");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    "❤️": 240,
    "🔥": 185,
    "👏": 98,
    "🎉": 72,
    "⚡": 110,
  });

  const chatListRef = useRef<FlatList>(null);

  // When joining a session, initialize its messages
  const handleJoinSession = (session: LiveSession) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveSession(session);
    setMessages(INITIAL_MESSAGES[session.id] ?? [
      { id: "m0", sender: session.hostName, avatar: session.hostAvatar, message: session.pinnedNotice, time: "Just now", isHost: true },
    ]);
  };

  // Organizer Go Live handler
  const handleGoLivePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (isOrganizer) {
      setShowBroadcastModal(true);
    } else {
      setShowGateModal(true);
    }
  };

  // Organizer starts broadcast
  const handleStartBroadcast = () => {
    if (!broadcastTitle.trim()) return;
    const ev = events.find((e) => e.id === selectedEventId) ?? events[0];
    const newSession: LiveSession = {
      id: "live_org_" + Date.now().toString(36),
      eventId: ev?.id ?? "evt_1",
      eventTitle: ev?.title ?? "Organiser Event",
      streamTitle: broadcastTitle.trim(),
      hostName: user?.organisation?.name ?? user?.businessName ?? user?.username ?? "Organiser",
      hostAvatar: user?.avatarUrl ?? "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160",
      category: ev?.category ?? "Special",
      viewersCount: 1,
      image: ev?.image ?? "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
      pinnedNotice: "Welcome to our official livestream! Ask anything in chat.",
      isHostOrganizer: true,
    };
    setStreams((prev) => [newSession, ...prev]);
    setShowBroadcastModal(false);
    setBroadcastTitle("");
    handleJoinSession(newSession);
  };

  // Send message to live chat
  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeSession) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: ChatMessage = {
      id: "msg_" + Date.now().toString(36),
      sender: user?.username ?? "You",
      avatar: user?.avatarUrl ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      message: chatInput.trim(),
      time: "Just now",
      isHost: activeSession.isHostOrganizer,
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Add emoji reaction
  const handleAddReaction = (emoji: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReactionCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] ?? 0) + 1,
    }));
  };

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <GlassSurface
        style={[
          styles.header,
          {
            paddingTop: headerTop + 8,
            borderWidth: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            borderRadius: 0,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.liveRedPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveRedText}>LIVE</Text>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Event Streams</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              Real-time backstage streams, artist Q&As & community chats
            </Text>
          </View>

          {/* Go Live / Broadcast button */}
          <Pressable
            style={({ pressed }) => [
              styles.goLiveBtn,
              { backgroundColor: isOrganizer ? "#EF4444" : colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleGoLivePress}
            accessibilityRole="button"
            accessibilityLabel={isOrganizer ? "Start Live Stream" : "Host Live Broadcast"}
          >
            <Ionicons name="radio" size={14} color="#FFFFFF" />
            <Text style={styles.goLiveBtnText}>
              {isOrganizer ? "Go Live" : "Host Live"}
            </Text>
          </Pressable>
        </View>
      </GlassSurface>

      {/* STREAM LIST */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE STREAMS SECTION */}
        <View style={styles.streamSectionHeader}>
          <View style={styles.sectionAccentLine} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Happening Now in Kigali
          </Text>
          <View style={styles.liveCountBadge}>
            <Text style={styles.liveCountBadgeText}>{streams.length} active</Text>
          </View>
        </View>

        {streams.map((session, index) => (
          <Animated.View
            key={session.id}
            entering={Platform.OS !== "web" ? FadeInDown.delay(index * 60).springify() : undefined}
          >
            <GlassSurface style={styles.streamCard}>
              {/* Media banner with simulated ambient visualizer */}
              <View style={styles.streamMediaWrap}>
                <Image
                  source={getEventImage(session.image)}
                  style={styles.streamMediaImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.85)"]}
                  style={StyleSheet.absoluteFill}
                />

                {/* Top Badges */}
                <View style={styles.mediaTopRow}>
                  <View style={styles.livePillSmall}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.livePillText}>LIVE</Text>
                  </View>

                  <View style={styles.viewerBadge}>
                    <Ionicons name="eye" size={13} color="#FFFFFF" />
                    <Text style={styles.viewerText}>
                      {session.viewersCount.toLocaleString()} watching
                    </Text>
                  </View>
                </View>

                {/* Simulated Audio Waves Indicator */}
                <View style={styles.audioWaveRow}>
                  <View style={[styles.audioWaveBar, { height: 14 }]} />
                  <View style={[styles.audioWaveBar, { height: 22 }]} />
                  <View style={[styles.audioWaveBar, { height: 16 }]} />
                  <View style={[styles.audioWaveBar, { height: 26 }]} />
                  <View style={[styles.audioWaveBar, { height: 18 }]} />
                  <Text style={styles.audioWaveText}>Live audio & video streaming</Text>
                </View>
              </View>

              {/* Stream Details & Host */}
              <View style={styles.streamDetails}>
                <View style={styles.streamHostRow}>
                  <Image source={{ uri: session.hostAvatar }} style={styles.streamHostAvatar} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.hostNameBadgeRow}>
                      <Text style={[styles.streamHostName, { color: colors.foreground }]} numberOfLines={1}>
                        {session.hostName}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color="#38BDF8" />
                    </View>
                    <Text style={[styles.streamEventName, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {session.eventTitle} · {session.category}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.streamTitleText, { color: colors.foreground }]} numberOfLines={2}>
                  {session.streamTitle}
                </Text>

                {/* Join & Chat CTA Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.joinChatBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => handleJoinSession(session)}
                  accessibilityRole="button"
                  accessibilityLabel={`Join live chat for ${session.streamTitle}`}
                >
                  <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
                  <Text style={styles.joinChatBtnText}>Join Live & Chat</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            </GlassSurface>
          </Animated.View>
        ))}
      </ScrollView>

      {/* FULL-SCREEN LIVE STREAM & CHAT ROOM MODAL */}
      <Modal
        visible={!!activeSession}
        animationType="slide"
        onRequestClose={() => setActiveSession(null)}
      >
        {activeSession && (
          <KeyboardAvoidingView
            style={[styles.liveRoomRoot, { backgroundColor: "#060A17" }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* ROOM TOP HEADER */}
            <View style={[styles.liveRoomHeader, { paddingTop: insets.top + 10 }]}>
              <View style={styles.liveRoomHostLeft}>
                <Image source={{ uri: activeSession.hostAvatar }} style={styles.roomHostAvatar} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.roomHostNameRow}>
                    <Text style={styles.roomHostName} numberOfLines={1}>
                      {activeSession.hostName}
                    </Text>
                    <Ionicons name="checkmark-circle" size={14} color="#38BDF8" />
                  </View>
                  <View style={styles.roomLiveStatusRow}>
                    <View style={styles.livePillMini}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.livePillMiniText}>LIVE</Text>
                    </View>
                    <Text style={styles.roomViewerCount}>
                      {activeSession.viewersCount.toLocaleString()} watching
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={styles.roomCloseBtn}
                onPress={() => setActiveSession(null)}
                accessibilityRole="button"
                accessibilityLabel="Leave live room"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* STAGE VISUALIZER & PINNED EVENT BANNER */}
            <View style={styles.stageVisualizer}>
              <Image
                source={getEventImage(activeSession.image)}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(6,10,23,0.7)", "rgba(6,10,23,0.88)"]}
                style={StyleSheet.absoluteFill}
              />

              {/* Pulsing Visualizer Center */}
              <View style={styles.stageCenter}>
                <View style={styles.broadcasterAvatarGlow}>
                  <Image source={{ uri: activeSession.hostAvatar }} style={styles.broadcasterAvatar} />
                </View>
                <Text style={styles.stageStreamTitle} numberOfLines={2}>
                  {activeSession.streamTitle}
                </Text>
                <View style={styles.stageWavesPill}>
                  <View style={[styles.audioWaveBarSmall, { height: 10 }]} />
                  <View style={[styles.audioWaveBarSmall, { height: 18 }]} />
                  <View style={[styles.audioWaveBarSmall, { height: 12 }]} />
                  <View style={[styles.audioWaveBarSmall, { height: 22 }]} />
                  <View style={[styles.audioWaveBarSmall, { height: 14 }]} />
                  <Text style={styles.stageWavesText}>Live Audio Stream On Air</Text>
                </View>
              </View>

              {/* Pinned Event Ticket Chip */}
              <Pressable
                style={styles.pinnedEventBanner}
                onPress={() => {
                  setActiveSession(null);
                  router.push(`/event/${activeSession.eventId}` as any);
                }}
              >
                <Ionicons name="ticket" size={16} color="#38BDF8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinnedEventTitle} numberOfLines={1}>
                    {activeSession.eventTitle}
                  </Text>
                  <Text style={styles.pinnedEventSub}>Tap to view details & book tickets</Text>
                </View>
                <View style={styles.pinnedEventBtn}>
                  <Text style={styles.pinnedEventBtnText}>View Event</Text>
                </View>
              </Pressable>
            </View>

            {/* REAL-TIME LIVE CHAT STREAM */}
            <View style={styles.liveChatArea}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatAreaTitle}>Live Chat Stream</Text>
                <Text style={styles.chatParticipantsText}>
                  {messages.length} comments · Real-time
                </Text>
              </View>

              <FlatList
                ref={chatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.chatMessagesList}
                contentContainerStyle={styles.chatMessagesContent}
                renderItem={({ item }) => (
                  <View style={[styles.chatBubbleRow, item.isHost && styles.chatBubbleHostRow]}>
                    <Image source={{ uri: item.avatar }} style={styles.chatBubbleAvatar} />
                    <View style={styles.chatBubbleBody}>
                      <View style={styles.chatSenderRow}>
                        <Text style={[styles.chatSenderName, item.isHost && { color: "#38BDF8" }]}>
                          {item.sender}
                        </Text>
                        {item.isHost ? (
                          <View style={styles.hostBadgeMini}>
                            <Text style={styles.hostBadgeMiniText}>HOST</Text>
                          </View>
                        ) : null}
                        <Text style={styles.chatMessageTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.chatMessageText}>{item.message}</Text>
                    </View>
                  </View>
                )}
              />

              {/* FLOATING REACTION BAR */}
              <View style={styles.reactionBar}>
                {REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={({ pressed }) => [
                      styles.reactionBtn,
                      pressed && { transform: [{ scale: 1.2 }] },
                    ]}
                    onPress={() => handleAddReaction(emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCountText}>
                      {reactionCounts[emoji] ?? 0}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* INPUT BAR */}
              <View style={[styles.chatInputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Say something in live chat…"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={styles.chatTextInput}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                />
                <Pressable
                  style={[
                    styles.sendBtn,
                    { backgroundColor: chatInput.trim() ? "#38BDF8" : "rgba(255,255,255,0.12)" },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!chatInput.trim()}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* NON-ORGANIZER GATE MODAL (BECOME AN ORGANIZER) */}
      <Modal
        visible={showGateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowGateModal(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: "#0F172A", borderColor: "rgba(56,189,248,0.3)", paddingBottom: insets.bottom + 24 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.25)" }]} />

            <View style={[styles.modalIconWrap, { backgroundColor: "rgba(239,68,68,0.18)" }]}>
              <Ionicons name="radio" size={32} color="#EF4444" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Host Live Streams on Eventis
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Starting live streams, backstage broadcasts, and Q&A audio spaces requires an active Eventis Organiser Pass. Upgrade your account to broadcast live to thousands of attendees across Rwanda.
            </Text>

            <View style={styles.gateFeaturesList}>
              <View style={styles.gateFeatureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                <Text style={[styles.gateFeatureText, { color: colors.foreground }]}>
                  Unlimited audio & video live broadcasting
                </Text>
              </View>
              <View style={styles.gateFeatureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                <Text style={[styles.gateFeatureText, { color: colors.foreground }]}>
                  Interactive attendee chat & reaction streams
                </Text>
              </View>
              <View style={styles.gateFeatureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                <Text style={[styles.gateFeatureText, { color: colors.foreground }]}>
                  Pinned event ticket banners with instant MoMo checkout
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryModalBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                setShowGateModal(false);
                router.push("/organiser" as any);
              }}
            >
              <Text style={styles.primaryModalBtnText}>Explore Organiser Plans</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => setShowGateModal(false)}
              style={styles.cancelModalBtn}
            >
              <Text style={[styles.cancelModalText, { color: colors.mutedForeground }]}>
                Watch Active Streams Instead
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ORGANIZER GO LIVE CREATION MODAL */}
      <Modal
        visible={showBroadcastModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBroadcastModal(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.14)", paddingBottom: insets.bottom + 24 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.25)" }]} />

            <View style={[styles.modalIconWrap, { backgroundColor: "rgba(56,189,248,0.2)" }]}>
              <Ionicons name="videocam" size={32} color="#38BDF8" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Start Live Broadcast
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Broadcast backstage moments, door alerts, or artist sets directly to attendees.
            </Text>

            <View style={styles.broadcastForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Broadcast Title</Text>
              <TextInput
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                placeholder="e.g. Backstage Soundcheck & VIP Passholders Q&A"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={[styles.formInput, { color: colors.foreground }]}
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Link to Your Event</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventPickRow}>
                {events.slice(0, 4).map((ev) => {
                  const isPicked = selectedEventId === ev.id;
                  return (
                    <Pressable
                      key={ev.id}
                      onPress={() => setSelectedEventId(ev.id)}
                      style={[
                        styles.eventPickChip,
                        {
                          backgroundColor: isPicked ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
                          borderColor: isPicked ? "#38BDF8" : "rgba(255,255,255,0.1)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventPickText,
                          { color: isPicked ? "#38BDF8" : colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {ev.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryModalBtn,
                {
                  backgroundColor: broadcastTitle.trim() ? "#EF4444" : "rgba(255,255,255,0.15)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleStartBroadcast}
              disabled={!broadcastTitle.trim()}
            >
              <Ionicons name="radio" size={18} color="#FFFFFF" />
              <Text style={styles.primaryModalBtnText}>Start Broadcast Now</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowBroadcastModal(false)}
              style={styles.cancelModalBtn}
            >
              <Text style={[styles.cancelModalText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleWrap: { flex: 1, gap: 4 },
  liveIndicatorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveRedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveRedText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },

  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  goLiveBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Section Header
  streamSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionAccentLine: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#EF4444",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  liveCountBadge: {
    backgroundColor: "rgba(239,68,68,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveCountBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
  },

  // Stream Card
  streamCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  streamMediaWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    justifyContent: "space-between",
    padding: 12,
  },
  streamMediaImage: {
    ...StyleSheet.absoluteFill,
  },
  mediaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  livePillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  livePillText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  audioWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  audioWaveBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "#38BDF8",
  },
  audioWaveText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginLeft: 6,
  },

  // Stream Details
  streamDetails: {
    padding: 16,
    gap: 12,
  },
  streamHostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streamHostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  hostNameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  streamHostName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  streamEventName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  streamTitleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  joinChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 2,
  },
  joinChatBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Live Room Full Screen
  liveRoomRoot: { flex: 1 },
  liveRoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  liveRoomHostLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  roomHostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  roomHostNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roomHostName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  roomLiveStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePillMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePillMiniText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
  },
  roomViewerCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  roomCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Stage Visualizer
  stageVisualizer: {
    height: 220,
    position: "relative",
    justifyContent: "space-between",
    padding: 14,
  },
  stageCenter: {
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  broadcasterAvatarGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#38BDF8",
    padding: 2,
    backgroundColor: "rgba(56,189,248,0.2)",
  },
  broadcasterAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  stageStreamTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  stageWavesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  audioWaveBarSmall: {
    width: 2.5,
    borderRadius: 1,
    backgroundColor: "#38BDF8",
  },
  stageWavesText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
    marginLeft: 4,
  },

  // Pinned Event Banner
  pinnedEventBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pinnedEventTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  pinnedEventSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  pinnedEventBtn: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pinnedEventBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Chat Area
  liveChatArea: {
    flex: 1,
    backgroundColor: "rgba(10,16,36,0.9)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  chatAreaTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  chatParticipantsText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },

  chatMessagesList: { flex: 1 },
  chatMessagesContent: { padding: 14, gap: 10 },
  chatBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  chatBubbleHostRow: {
    backgroundColor: "rgba(56,189,248,0.08)",
    padding: 8,
    borderRadius: 12,
  },
  chatBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 2,
  },
  chatBubbleBody: {
    flex: 1,
    gap: 2,
  },
  chatSenderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatSenderName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  hostBadgeMini: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeMiniText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
  },
  chatMessageTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  chatMessageText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
  },

  // Reaction Bar
  reactionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  reactionBtn: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 2,
  },
  reactionEmoji: { fontSize: 18 },
  reactionCountText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },

  // Chat Input
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  chatTextInput: {
    flex: 1,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 21,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, padding: 24, alignItems: "center", gap: 12 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, marginBottom: 8 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, paddingHorizontal: 8 },

  gateFeaturesList: { alignSelf: "stretch", gap: 10, marginVertical: 8 },
  gateFeatureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  gateFeatureText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  primaryModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  primaryModalBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  cancelModalBtn: { paddingVertical: 10 },
  cancelModalText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Broadcast form
  broadcastForm: { alignSelf: "stretch", gap: 10, marginTop: 4 },
  formLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  formInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  eventPickRow: { flexDirection: "row", gap: 8 },
  eventPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 200,
    marginRight: 8,
  },
  eventPickText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
