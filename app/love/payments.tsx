import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { SectionState } from "@/components/profile/ProfileSection";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import { USE_FINDLOVE_API } from "@/services/findLoveService";
import {
  fetchMyManualPayments,
  formatMinorAmount,
  manualPaymentStatusLabel,
  type ManualPaymentSubmission,
} from "@/services/manualPaymentsService";

const PROVIDER_LABEL: Record<string, string> = { mtn_momo: "MTN MoMo", airtel_money: "Airtel Money" };

const STATUS_COLOR: Record<ManualPaymentSubmission["status"], { bg: string; fg: string }> = {
  pending: { bg: "rgba(245,158,11,0.16)", fg: "#B45309" },
  under_review: { bg: "rgba(59,130,246,0.16)", fg: "#1D4ED8" },
  approved: { bg: "rgba(16,185,129,0.16)", fg: "#047857" },
  rejected: { bg: "rgba(239,68,68,0.16)", fg: "#B91C1C" },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * FindLove membership payment history: every manual-payment submission the
 * member has made, newest first, with its status. Reachable from the "Me"
 * tab. Approving a submission activates the membership on the server, so a
 * load that finds one newly approved reloads the profile (reload() from
 * MyLoveProfileContext) so the rest of the app picks it up immediately.
 */
export default function LoveFindLovePaymentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { reload } = useMyLoveProfile();

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
        const page = await fetchMyManualPayments({ platform: "findlove", limit: 50 });
        setItems(page.items);
        if (page.items.some((item) => item.status === "approved")) void reload();
      } catch (err) {
        setError(describeError(err, "We couldn't load your payment history."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reload],
  );

  useEffect(() => {
    if (USE_FINDLOVE_API) void load(false);
    else setLoading(false);
  }, [load]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/love" as any));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={leave} style={[styles.backButton, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment history</Text>
        <View style={styles.backButton} />
      </View>

      {!USE_FINDLOVE_API ? (
        <View style={styles.content}>
          <SectionState
            kind="empty"
            icon="receipt-outline"
            title="Not available in demo mode"
            message="Payment history appears here once FindLove is connected to the live service."
          />
        </View>
      ) : loading ? (
        <View style={styles.content}>
          <SectionState kind="loading" message="Loading your payments…" />
        </View>
      ) : error ? (
        <View style={styles.content}>
          <SectionState kind="error" message={error} onRetry={() => void load(false)} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }, items.length === 0 ? { flexGrow: 1 } : null]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <SectionState
              kind="empty"
              icon="receipt-outline"
              title="No payments yet"
              message="Membership payments you submit for review will show up here."
            />
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLOR[item.status];
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.plan, { color: colors.foreground }]} numberOfLines={1}>{item.plan.name}</Text>
                    <Text style={[styles.reference, { color: colors.mutedForeground }]}>Ref {item.reference}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.pillText, { color: statusColor.fg }]}>{manualPaymentStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.row}>
                  <Ionicons name="cash-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.rowText, { color: colors.foreground }]}>{formatMinorAmount(item.amountMinor, item.currency)}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="phone-portrait-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.rowText, { color: colors.mutedForeground }]}>
                    {PROVIDER_LABEL[item.paymentMethod.provider] ?? item.paymentMethod.provider} · {item.paymentMethod.phoneNumber}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.rowText, { color: colors.mutedForeground }]}>Submitted {formatDate(item.createdAt)}</Text>
                </View>
                {item.status === "rejected" && item.rejectionReason ? (
                  <View style={[styles.reasonBox, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                    <Text style={[styles.reasonText, { color: colors.foreground }]}>{item.rejectionReason}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  backButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 21, fontFamily: "Inter_700Bold" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 18 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
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
