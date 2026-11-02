import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { Section } from "@/components/love/LoveProfileForm";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

/** FindLove account safety settings, opened from Me. */
export default function LoveSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const doLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setConfirmingLogout(false);
    } catch {
      setConfirmingLogout(false);
      setLogoutError("We couldn't log you out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <LoveScreenShell title="Settings" onBack={() => router.back()}>
        <Section title="Account safety">
          <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => router.push("/love/policies" as any)}
              style={styles.row}
              accessibilityRole="button"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
                <Ionicons name="document-text-outline" size={19} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>App policies</Text>
                <Text style={[styles.rowText, { color: colors.mutedForeground }]}>Terms of Service and Privacy Policy.</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              onPress={() => setConfirmingLogout(true)}
              style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              accessibilityRole="button"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
                <Ionicons name="log-out-outline" size={19} color={colors.destructive} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowLabel, { color: colors.destructive }]}>Log out</Text>
                <Text style={[styles.rowText, { color: colors.mutedForeground }]}>Sign out of your Eventis account.</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {logoutError ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{logoutError}</Text>
          ) : null}
        </Section>
      </LoveScreenShell>

      <ChatConfirmDialog
        visible={confirmingLogout}
        title="Log out of Eventis?"
        description="You'll need to sign in again to use FindLove, see your tickets and bookings."
        confirmLabel="Log out"
        destructive
        busy={loggingOut}
        onConfirm={() => void doLogout()}
        onClose={() => setConfirmingLogout(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 4 },
});
