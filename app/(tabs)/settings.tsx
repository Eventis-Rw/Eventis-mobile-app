import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { AccountActions } from "@/components/settings/AccountActions";
import { AccountSettings, AccountSummary } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PreferenceSettings } from "@/components/settings/PreferenceSettings";
import { PrivacySecuritySettings } from "@/components/settings/PrivacySecuritySettings";
import { APP_VERSION, SupportSettings } from "@/components/settings/SupportSettings";
import { VerificationSettings } from "@/components/settings/VerificationSettings";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

/**
 * Settings, in seven groups: Account, Notifications, Preferences, Privacy &
 * Security, Verification, Help & Support, Account actions. Each group lives in
 * components/settings and shows only the options that are supported and apply
 * to this account (`useAccountCapabilities`); an empty group is not rendered.
 */
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const capabilities = useAccountCapabilities();
  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: headerTop + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/" as any))}
          hitSlop={8}
          style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
          Settings
        </Text>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 104 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated && user ? (
          <>
            <AccountSummary user={user} accountType={getAccountType(user)} />
            <AccountSettings capabilities={capabilities} />
            <NotificationSettings capabilities={capabilities} />
            <PreferenceSettings capabilities={capabilities} />
            <PrivacySecuritySettings capabilities={capabilities} />
            <VerificationSettings
              user={user}
              capabilities={capabilities}
              businessStatus={capabilities.businessVerification}
            />
            <SupportSettings />
            <AccountActions />
          </>
        ) : (
          <>
            <GlassSurface style={styles.guest}>
              <Ionicons name="person-circle-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.guestTitle, { color: colors.foreground }]}>You're browsing as a guest</Text>
              <Text style={[styles.guestText, { color: colors.mutedForeground }]}>
                Sign in to manage your account, notifications and verification.
              </Text>
              <Pressable
                onPress={() => router.push("/auth/login" as any)}
                style={({ pressed }) => [styles.signIn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={styles.signInText}>Sign in / Register</Text>
              </Pressable>
            </GlassSurface>
            <PreferenceSettings />
            <SupportSettings />
          </>
        )}

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Eventis v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconSpacer: { width: 44 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 22 },
  guest: { alignItems: "center", padding: 20, gap: 8, borderRadius: 22 },
  guestTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  signIn: { marginTop: 6, paddingHorizontal: 24, minHeight: 48, justifyContent: "center", borderRadius: 14 },
  signInText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
