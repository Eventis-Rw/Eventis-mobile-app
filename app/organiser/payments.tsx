import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

const PROVIDER_LABEL: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
};

const STATUS_CONFIG: Record<
  ManualPaymentSubmission["status"],
  {
    bg: string;
    fg: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
  }
> = {
  pending: {
    bg: "rgba(245,158,11,0.12)",
    fg: "#F59E0B",
    border: "rgba(245,158,11,0.28)",
    icon: "hourglass-outline",
    label: "Awaiting review",
    description: "Proof uploaded. Waiting for admin queue.",
  },
  under_review: {
    bg: "rgba(14,165,233,0.12)",
    fg: "#0284C7",
    border: "rgba(14,165,233,0.28)",
    icon: "sync-outline",
    label: "Under review",
    description: "Our team is actively reviewing your payment.",
  },
  approved: {
    bg: "rgba(16,185,129,0.12)",
    fg: "#10B981",
    border: "rgba(16,185,129,0.28)",
    icon: "checkmark-circle",
    label: "Approved & Active",
    description: "Payment confirmed. Plan activated.",
  },
  rejected: {
    bg: "rgba(239,68,68,0.12)",
    fg: "#EF4444",
    border: "rgba(239,68,68,0.28)",
    icon: "alert-circle",
    label: "Needs attention",
    description: "Payment proof could not be verified.",
  },
};

const DEMO_PAYMENTS: ManualPaymentSubmission[] = [
  {
    id: "demo_sub_1",
    reference: "PAY-020256",
    platform: "organiser",
    status: "under_review",
    plan: { name: "Pro Monthly", durationDays: 30 },
    amountMinor: "25000",
    currency: "RWF",
    paymentMethod: {
      provider: "mtn_momo",
      accountName: "Travelis Rwanda Ltd",
      phoneNumber: "0788123456",
    },
    receiptUploadId: "demo_receipt_1",
    reviewedAt: null,
    rejectionReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "demo_sub_2",
    reference: "PAY-810425",
    platform: "organiser",
    status: "approved",
    plan: { name: "Starter Monthly", durationDays: 30 },
    amountMinor: "10000",
    currency: "RWF",
    paymentMethod: {
      provider: "mtn_momo",
      accountName: "Travelis Rwanda Ltd",
      phoneNumber: "0788123456",
    },
    receiptUploadId: "demo_receipt_2",
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    rejectionReason: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function PaymentTimeline({
  item,
  palette,
}: {
  item: ManualPaymentSubmission;
  palette: ReturnType<typeof useOrganiserPalette>;
}) {
  const isRejected = item.status === "rejected";
  const isApproved = item.status === "approved";
  const isReviewing = item.status === "under_review";
  const isPending = item.status === "pending";

  const step2Done = isApproved || isRejected;
  const step2Active = isPending || isReviewing;
  const step3Done = isApproved;

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineRow}>
        {/* Step 1: Submitted */}
        <View style={styles.stepNode}>
          <View style={[styles.stepCircle, { backgroundColor: palette.positive }]}>
            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, { color: palette.text }]}>Submitted</Text>
          <Text style={[styles.stepTime, { color: palette.muted }]}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Line 1 -> 2 */}
        <View
          style={[
            styles.timelineLine,
            {
              backgroundColor:
                step2Active || step2Done
                  ? isRejected
                    ? palette.danger
                    : isApproved
                    ? palette.positive
                    : palette.blue
                  : palette.line,
            },
          ]}
        />

        {/* Step 2: Verification */}
        <View style={styles.stepNode}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: isRejected
                  ? palette.danger
                  : isApproved
                  ? palette.positive
                  : step2Active
                  ? palette.blue
                  : palette.surfaceRaised,
                borderWidth: step2Active ? 2 : 0,
                borderColor: palette.blueSoft,
              },
            ]}
          >
            {isRejected ? (
              <Ionicons name="close" size={11} color="#FFFFFF" />
            ) : isApproved ? (
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            ) : (
              <Ionicons name="sync" size={11} color="#FFFFFF" />
            )}
          </View>
          <Text style={[styles.stepLabel, { color: step2Active || step2Done ? palette.text : palette.muted }]}>
            {isRejected ? "Declined" : "Reviewing"}
          </Text>
          <Text style={[styles.stepTime, { color: palette.muted }]}>
            {isRejected ? "Rejected" : isApproved ? "Verified" : "In review"}
          </Text>
        </View>

        {/* Line 2 -> 3 */}
        <View
          style={[
            styles.timelineLine,
            { backgroundColor: step3Done ? palette.positive : palette.line },
          ]}
        />

        {/* Step 3: Activation */}
        <View style={styles.stepNode}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: step3Done ? palette.positive : palette.surfaceRaised,
              },
            ]}
          >
            {step3Done ? (
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            ) : (
              <Ionicons name="lock-closed-outline" size={10} color={palette.muted} />
            )}
          </View>
          <Text style={[styles.stepLabel, { color: step3Done ? palette.text : palette.muted }]}>
            Activated
          </Text>
          <Text style={[styles.stepTime, { color: palette.muted }]}>
            {step3Done ? "Active" : "Pending"}
          </Text>
        </View>
      </View>
    </View>
  );
}

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
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (USE_ORGANISER_API) {
          const page = await fetchMyManualPayments({ platform: "organiser", limit: 50 });
          setItems(page.items);
          await refreshOrganiserSubscription();
        } else {
          // Demo fallback keeps payment tracking fully testable in demo mode
          await new Promise((resolve) => setTimeout(resolve, 350));
          setItems(DEMO_PAYMENTS);
        }
      } catch (err) {
        setError(describeError(err, "We couldn't refresh your payment history or organiser access."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshOrganiserSubscription],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const copyReference = async (ref: string) => {
    await Clipboard.setStringAsync(ref);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef((cur) => (cur === ref ? null : cur));
    }, 2200);
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/organiser" as any));

  const activeSubmission = items.find((item) => item.status === "pending" || item.status === "under_review");

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />

      {/* Screen Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: palette.line }]}>
        <Pressable
          onPress={leave}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.surfaceRaised, borderColor: palette.line },
            pressed && { backgroundColor: palette.surfacePressed },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Track Payments</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>Subscription & Review Status</Text>
        </View>

        <Pressable
          onPress={() => void load(true)}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: palette.surfaceRaised, borderColor: palette.line },
            pressed && { backgroundColor: palette.surfacePressed },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Refresh status"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={palette.blue} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={palette.text} />
          )}
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.content}>
          <View style={styles.inlineState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.stateTitle, { color: palette.text, marginTop: 12 }]}>Checking payment status…</Text>
            <Text style={[styles.stateText, { color: palette.muted }]}>Retrieving your latest manual payment verification data.</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.content}>
          <OrganiserSurface style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.stateIconCircle, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.stateTitle, { color: palette.text }]}>Connection error</Text>
            <Text style={[styles.stateText, { color: palette.muted }]}>{error}</Text>
            <Pressable
              style={[styles.smallBtn, { backgroundColor: colors.primary }]}
              onPress={() => void load(false)}
              accessibilityRole="button"
            >
              <Text style={styles.smallBtnText}>Try again</Text>
            </Pressable>
          </OrganiserSurface>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }, items.length === 0 ? { flexGrow: 1 } : null]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            activeSubmission ? (
              <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={styles.heroHeader}>
                  <View style={[styles.heroIconBox, { backgroundColor: palette.blueSoft }]}>
                    <Ionicons name="time" size={20} color={palette.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroTitle, { color: palette.text }]}>Payment Under Review</Text>
                    <Text style={[styles.heroSubtitle, { color: palette.muted }]}>
                      Reference: #{activeSubmission.reference}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.heroBody, { color: palette.muted }]}>
                  We received your proof of payment for the {activeSubmission.plan.name}. Our team is verifying your transaction. Approvals usually take 5 to 15 minutes.
                </Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <OrganiserSurface style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <View style={[styles.stateIconCircle, { backgroundColor: palette.blueSoft }]}>
                <Ionicons name="receipt-outline" size={28} color={palette.blue} />
              </View>
              <Text style={[styles.stateTitle, { color: palette.text }]}>No payments to track</Text>
              <Text style={[styles.stateText, { color: palette.muted }]}>
                When you upgrade or renew an organiser plan, your payment submissions and review statuses will appear here in real time.
              </Text>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/organiser/subscribe" as any)}
                accessibilityRole="button"
              >
                <Text style={styles.primaryActionBtnText}>Browse plans</Text>
              </Pressable>
            </OrganiserSurface>
          }
          renderItem={({ item }) => {
            const config = STATUS_CONFIG[item.status];
            const isCopied = copiedRef === item.reference;
            const isMTN = item.paymentMethod.provider === "mtn_momo";

            return (
              <OrganiserSurface style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                {/* Card Header: Plan Name, Amount & Status Pill */}
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.plan, { color: palette.text }]} numberOfLines={1}>
                      {item.plan.name}
                    </Text>
                    <Text style={[styles.amountText, { color: palette.text }]}>
                      {formatMinorAmount(item.amountMinor, item.currency)}
                    </Text>
                  </View>

                  <View style={[styles.pill, { backgroundColor: config.bg, borderColor: config.border }]}>
                    <Ionicons name={config.icon} size={12} color={config.fg} />
                    <Text style={[styles.pillText, { color: config.fg }]}>{config.label}</Text>
                  </View>
                </View>

                {/* Tracking Progress Timeline */}
                <PaymentTimeline item={item} palette={palette} />

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: palette.line }]} />

                {/* Metadata Row: Provider, Phone & Reference */}
                <View style={styles.metaSection}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaLabelGroup}>
                      <Ionicons
                        name={isMTN ? "phone-portrait" : "phone-portrait-outline"}
                        size={15}
                        color={isMTN ? "#F59E0B" : palette.muted}
                      />
                      <Text style={[styles.metaLabel, { color: palette.muted }]}>Paid via</Text>
                    </View>
                    <Text style={[styles.metaValue, { color: palette.text }]}>
                      {PROVIDER_LABEL[item.paymentMethod.provider] ?? item.paymentMethod.provider} · {item.paymentMethod.phoneNumber}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaLabelGroup}>
                      <Ionicons name="document-text-outline" size={15} color={palette.muted} />
                      <Text style={[styles.metaLabel, { color: palette.muted }]}>Reference</Text>
                    </View>

                    <Pressable
                      onPress={() => void copyReference(item.reference)}
                      style={[
                        styles.copyRefBtn,
                        { backgroundColor: palette.surfaceRaised, borderColor: palette.line },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Copy reference code"
                    >
                      <Text style={[styles.copyRefText, { color: palette.text }]}>#{item.reference}</Text>
                      <Ionicons
                        name={isCopied ? "checkmark" : "copy-outline"}
                        size={13}
                        color={isCopied ? palette.positive : palette.muted}
                      />
                      {isCopied ? <Text style={[styles.copiedTooltip, { color: palette.positive }]}>Copied</Text> : null}
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaLabelGroup}>
                      <Ionicons name="image-outline" size={15} color={palette.muted} />
                      <Text style={[styles.metaLabel, { color: palette.muted }]}>Proof of payment</Text>
                    </View>
                    <View style={styles.proofBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={palette.positive} />
                      <Text style={[styles.proofBadgeText, { color: palette.positive }]}>Screenshot attached</Text>
                    </View>
                  </View>
                </View>

                {/* Status-specific action or note */}
                {item.status === "rejected" ? (
                  <View style={[styles.reasonBox, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.22)" }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                      <Ionicons name="alert-circle" size={16} color={palette.danger} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reasonTitle, { color: palette.danger }]}>Declined by review team</Text>
                        <Text style={[styles.reasonText, { color: palette.text }]}>
                          {item.rejectionReason || "The uploaded screenshot could not be matched with incoming mobile money records."}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => router.replace("/organiser/subscribe" as any)}
                      style={[styles.retryBtn, { backgroundColor: palette.danger }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.retryBtnText}>Submit new payment</Text>
                    </Pressable>
                  </View>
                ) : item.status === "approved" ? (
                  <View style={[styles.approvedBox, { backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.22)" }]}>
                    <Ionicons name="checkmark-circle" size={17} color={palette.positive} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.approvedTitle, { color: palette.positive }]}>Organiser plan is active</Text>
                      <Text style={[styles.approvedSub, { color: palette.muted }]}>All event creation and marketing features are unlocked.</Text>
                    </View>
                    <Pressable
                      onPress={() => router.replace("/organiser" as any)}
                      style={[styles.dashboardBtn, { backgroundColor: palette.positive }]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.dashboardBtnText}>Dashboard</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.pendingFooter, { backgroundColor: palette.surfaceRaised }]}>
                    <Ionicons name="notifications-outline" size={14} color={palette.muted} />
                    <Text style={[styles.pendingFooterText, { color: palette.muted }]}>
                      You will be notified once review is done.
                    </Text>
                  </View>
                )}
              </OrganiserSurface>
            );
          }}
          ListFooterComponent={
            items.length > 0 ? (
              <View style={[styles.helpSection, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
                <Ionicons name="help-circle-outline" size={18} color={palette.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpTitle, { color: palette.text }]}>Need assistance with your payment?</Text>
                  <Text style={[styles.helpText, { color: palette.muted }]}>
                    Contact our support team at support@eventis.app or mention your reference code for express assistance.
                  </Text>
                </View>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 16,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  inlineState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 6,
  },
  stateCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  smallBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 6,
  },
  smallBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  primaryActionBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  plan: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  amountText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 3,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  timelineContainer: {
    paddingVertical: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepNode: {
    alignItems: "center",
    gap: 3,
    width: 72,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  stepTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 26,
    borderRadius: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  metaSection: {
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  copyRefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  copyRefText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  copiedTooltip: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 2,
  },
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  proofBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  reasonBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  reasonTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  approvedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  approvedTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  approvedSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  dashboardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dashboardBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  pendingFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  pendingFooterText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  helpSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  helpTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  helpText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
