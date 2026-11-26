import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLiveDemo } from "@/hooks/useLiveDemo";
import { useLiveDirectory } from "@/hooks/useLiveDirectory";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";
import { LIVE_STARTING_COINS, liveBalance } from "@/services/liveState";
import { LiveBroadcastEntry } from "./LiveBroadcastEntry";
import { LiveRecharge } from "./LiveCoins";
import { LiveDiscovery } from "./LiveDiscovery";
import { liveColors as c, liveStyles as s } from "./LivePrimitives";
import { LiveWatchEntry } from "./LiveWatchEntry";

export default function LiveScreen() {
  const { user } = useAuth();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const shared = useLiveDirectory();
  const { events } = useOrganiserEvents();
  const [hosting, setHosting] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const demo = useLiveDemo(user?.id ?? "guest");

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text style={s.heading}>Sign in to explore Live</Text>
      </View>
    );
  }

  const person = {
    id: user.id,
    name: user.organisation?.name ?? user.username,
    avatar: user.organisation?.logoUrl ?? user.avatarUrl,
  };

  const balance = demo.state ? liveBalance(demo.state, user.id) : LIVE_STARTING_COINS;

  const close = () => {
    setHosting(false);
    setWatchId(null);
    void shared.refresh();
  };

  return (
    <>
      <LiveDiscovery
        rooms={demo.state?.rooms ?? []}
        busy={false}
        coinBalance={balance}
        onHost={() => setHosting(true)}
        onRoom={(room) => setWatchId(room.id)}
        liveRooms={shared.rooms}
        liveLoading={shared.loading}
        liveError={shared.error}
        onRefresh={() => void shared.refresh()}
        onWatch={(room) => setWatchId(room.id)}
        onWallet={() => setWalletOpen(true)}
      />

      {hosting ? (
        <LiveBroadcastEntry
          person={person}
          events={events.filter((e) => e.status === "published")}
          onClose={close}
          sampleWallet={demo}
        />
      ) : null}

      {watchId ? (
        <LiveWatchEntry
          id={watchId}
          person={person}
          onClose={close}
          wallet={demo}
        />
      ) : null}

      {/* Coin Recharge Modal */}
      <Modal
        visible={walletOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWalletOpen(false)}
      >
        <View style={modalStyles.overlay}>
          <Pressable
            style={modalStyles.dismissArea}
            onPress={() => setWalletOpen(false)}
          />
          <View
            style={[
              modalStyles.sheet,
              {
                backgroundColor: isDark ? "#161625" : "#FFFFFF",
                borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
              },
            ]}
          >
            <View style={modalStyles.headerRow}>
              <View style={modalStyles.titleGroup}>
                <Text
                  style={[
                    modalStyles.title,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Coin Wallet
                </Text>
                <Text
                  style={[
                    modalStyles.sub,
                    { color: isDark ? "#9E9AB0" : "#64748B" },
                  ]}
                >
                  Support creators and send gifts during live streams
                </Text>
              </View>
              <Pressable
                onPress={() => setWalletOpen(false)}
                style={[
                  modalStyles.closeBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "#C4C1D4" : "#475569"}
                />
              </Pressable>
            </View>

            <LiveRecharge
              balance={balance}
              onCredited={async (pack, paymentId) => {
                await demo.act(person, {
                  type: "topUp",
                  paymentId,
                  coins: pack.coins,
                  priceRwf: pack.priceRwf,
                });
              }}
              onDone={() => setWalletOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#161625",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 16,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    gap: 4,
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    color: "#9E9AB0",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
});
