import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { FindLoveIntro } from "@/components/love/FindLoveIntro";
import { LoveHeader, useExitFindLove } from "@/components/love/LoveHeader";
import { SectionState } from "@/components/profile/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { useFindLoveChat } from "@/context/FindLoveChatContext";
import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeAgeVerification, isAgeVerified } from "@/utils/findLoveAgeVerification";

type IconName = keyof typeof Ionicons.glyphMap;

// Members see the intro until they have a FindLove profile of their own, then
// the ID age check until the server says they're verified, then a plan to pay
// for (Public or Private). Only then the tabs.
export default function FindLoveTabsLayout() {
  const colors = useColors();
  const { user } = useAuth();
  const { myProfile, status, error, reload, verification, hasMembership } = useMyLoveProfile();
  if (myProfile && isAgeVerified(verification)) return hasMembership ? <LoveTabs /> : <MembershipGate />;
  if (myProfile) return <AgeCheckGate />;
  // Signed-out visitors also get the intro; "Get started" asks them to sign in.
  if (status === "ready" || !user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LoveHeader title="FindLove" />
        <FindLoveIntro />
      </View>
    );
  }
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="FindLove" />
      <View style={styles.gateState}>
        {status === "error" ? (
          <SectionState kind="error" message={error ?? "We couldn't load FindLove."} onRetry={() => void reload()} />
        ) : (
          <SectionState kind="loading" message="Opening FindLove…" />
        )}
      </View>
    </View>
  );
}

/** Shown instead of FindLove until the member's ID age check is approved. */
function AgeCheckGate() {
  const colors = useColors();
  const router = useRouter();
  const { verification } = useMyLoveProfile();
  const copy = describeAgeVerification(verification);
  const rejected = verification.status === "rejected";
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="FindLove" />
      <View style={styles.gateState}>
        <SectionState
          kind="empty"
          icon={rejected ? "hand-left-outline" : "shield-checkmark-outline"}
          title={copy.title}
          message={copy.message}
          actionLabel={
            rejected ? undefined : verification.status === "not_started" || verification.status === "failed" ? copy.action ?? undefined : "View status"
          }
          onAction={rejected ? undefined : () => router.push("/love/verify" as any)}
        />
      </View>
    </View>
  );
}

/** Shown instead of FindLove until the member has a paid, unexpired Public or Private plan. */
function MembershipGate() {
  const colors = useColors();
  const router = useRouter();
  const { myProfile } = useMyLoveProfile();
  const expired = myProfile?.membership.status === "expired" || !!myProfile?.membership.expiresAt;
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="FindLove" />
      <View style={styles.gateState}>
        <SectionState
          kind="empty"
          icon="diamond-outline"
          title={expired ? "Your membership has ended" : "Choose your plan"}
          message={
            expired
              ? "Renew your Public or Private plan to keep using FindLove."
              : "FindLove is for members with a Public or Private plan. Pay weekly, monthly or yearly."
          }
          actionLabel={expired ? "Renew membership" : "See plans"}
          onAction={() => router.push("/love/membership" as any)}
        />
      </View>
    </View>
  );
}

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: "index", title: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "messages", title: "Inbox", icon: "chatbubbles-outline", activeIcon: "chatbubbles" },
  { name: "eventis", title: "Eventis", icon: "calendar-outline", activeIcon: "calendar" },
  { name: "me", title: "Me", icon: "person-circle-outline", activeIcon: "person-circle" },
];

function LoveTabs() {
  const colors = useColors();
  const exit = useExitFindLove();
  const { totalUnread } = useFindLoveChat();
  // Unread messages plus requests waiting for an answer.
  const inboxCount = totalUnread + useFindLoveDemo().receivedRequests.length;
  const insets = useAppSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  return (
    <Tabs
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: isWeb ? 64 : 58 + insets.bottom,
          paddingBottom: isWeb ? 8 : Math.max(insets.bottom - 4, 6),
          paddingTop: 6,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          // The Eventis tab is a way out of FindLove, not a screen.
          listeners={
            tab.name === "eventis"
              ? {
                  tabPress: (event) => {
                    event.preventDefault();
                    exit();
                  },
                }
              : undefined
          }
          options={{
            title: tab.title,
            tabBarBadge: tab.name === "messages" && inboxCount > 0 ? (inboxCount > 99 ? "99+" : inboxCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: "#FFFFFF", fontSize: 10 },
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? tab.activeIcon : tab.icon} size={23} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gateState: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
