import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserSurface } from "@/components/OrganiserSurface";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserColors, useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { describeError, USE_ORGANISER_API } from "@/services/organiserService";
import {
  fetchMyManualPayments,
  formatMinorAmount,
  manualPaymentStatusLabel,
  type ManualPaymentSubmission,
} from "@/services/manualPaymentsService";

const PROVIDER_LABEL: Record<string, string> = { mtn_momo: "MTN MoMo", airtel_money: "Airtel Money" };

const STATUS_COLOR: Record<ManualPaymentSubmission["status"], { bg: string; fg: string }> = {
  pending: { bg: "rgba(245,158,11,0.16)", fg: "#D97706" },
  under_review: { bg: "rgba(56,189,248,0.16)", fg: "#38BDF8" },
  approved: { bg: "rgba(16,185,129,0.16)", fg: "#10B981" },
  rejected: { bg: "rgba(239,68,68,0.16)", fg: "#EF4444" },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Organiser plan payment history: every manual-payment submission the member
 * has made, newest first, with its status. Reachable from the organiser hub.
 * Approving a submission activates the plan on the server (out of band), so
 * a load that finds one newly approved re-fetches the organiser subscription
 * (AuthContext's refreshOrganiserSubscription) so the rest of the app picks
 * it up immediately.
 */
export default function OrganiserPaymentsScreen() {
  const colors = useOrganiserColors();
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { refreshOrganiserSubscription } = useAuth();

  const [items, setItems] = useState<ManualPaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await fetchMyManualPayments({ platform: "organiser", limit: 50 });
        setItems(page.items);
        if (page.items.some((item) => item.status === "approved")) void refreshOrganiserSubscription();
      } catch (err) {
        setError(describeError(err, "We couldn't load your payment history."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshOrganiserSubscription],
  );

  useEffect(() => {
    if (USE_ORGANISER_API) void load(false);
    else setLoading(false);
  }, [load]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/organiser" as any));

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: palette.line }]}>
        <Pressable
          onPress={leave}
          style={[styles.backButton, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={21} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Payment history</Text>
        <View style={styles.backButton} />
      </View>

      {!USE_ORGANISER_API ? (
        <View style={styles.content}>
          <OrganiserSurface style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Ionicons name="receipt-outline" size={32} color={palette.muted} />
            <Text style={[styles.stateTitle, { color: palette.text }]}>Not available in demo mode</Text>
            <Text style={[styles.stateText, { color: palette.muted }]}>Payment history appears here once the organiser workspace is connected to the live service.</Text>
          </OrganiserSurface>
        </View>
      ) : loading ? (
        <View style={styles.content}>
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: palette.muted }]}>Loading your payments…</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.content}>
          <OrganiserSurface style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.destructive} />
            <Text style={[styles.stateText, { color: palette.muted }]}>{error}</Text>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => void load(false)} accessibilityRole="button">
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </OrganiserSurface>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }, items.length === 0 ? { flexGrow: 1 } : null]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <OrganiserSurface style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <Ionicons name="receipt-outline" size={32} color={palette.muted} />
              <Text style={[styles.stateTitle, { color: palette.text }]}>No payments yet</Text>
              <Text style={[styles.stateText, { color: palette.muted }]}>Organiser plan payments you submit for review will show up here.</Text>
            </OrganiserSurface>
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLOR[item.status];
            return (
              <OrganiserSurface style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.plan, { color: palette.text }]} numberOfLines={1}>{item.plan.name}</Text>
                    <Text style={[styles.reference, { color: palette.muted }]}>Ref {item.reference}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.pillText, { color: statusColor.fg }]}>{manualPaymentStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: palette.line }]} />
                <View style={styles.row}>
                  <Ionicons name="cash-outline" size={16} color={palette.muted} />
                  <Text style={[styles.rowText, { color: palette.text }]}>{formatMinorAmount(item.amountMinor, item.currency)}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="phone-portrait-outline" size={16} color={palette.muted} />
                  <Text style={[styles.rowText, { color: palette.muted }]}>
                    {PROVIDER_LABEL[item.paymentMethod.provider] ?? item.paymentMethod.provider} · {item.paymentMethod.phoneNumber}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                  <Text style={[styles.rowText, { color: palette.muted }]}>Submitted {formatDate(item.createdAt)}</Text>
                </View>
                {item.status === "rejected" && item.rejectionReason ? (
                  <View style={[styles.reasonBox, { backgroundColor: palette.surfaceRaised }]}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                    <Text style={[styles.reasonText, { color: palette.text }]}>{item.rejectionReason}</Text>
                  </View>
                ) : null}
              </OrganiserSurface>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 18 },
  inlineState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  stateCard: { borderRadius: 18, padding: 24, alignItems: "center", gap: 10 },
  stateTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  stateText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center" },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  smallBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  card: { borderRadius: 18, padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  plan: { fontSize: 15, fontFamily: "Inter_700Bold" },
  reference: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  pillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  reasonBox: { flexDirection: "row", gap: 8, borderRadius: 12, padding: 10 },
  reasonText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
});
