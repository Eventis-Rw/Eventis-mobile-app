import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useColors } from "@/hooks/useColors";

const TOKEN_PACKAGES = [
  { amount: 50, price: "$1.99", note: "A few thoughtful gifts" },
  { amount: 120, price: "$3.99", note: "Most popular", popular: true },
  { amount: 300, price: "$7.99", note: "Best value" },
];

const PAYMENT_METHODS = [
  { id: "mobile", label: "Mobile Money", icon: "phone-portrait-outline" as const },
  { id: "card", label: "Credit or debit card", icon: "card-outline" as const },
  { id: "wallet", label: "Apple Pay / Google Pay", icon: "wallet-outline" as const },
];

export default function LoveWalletScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { tokenBalance, activity, purchaseTokens } = useFindLoveDemo();
  const [selectedAmount, setSelectedAmount] = useState(120);
  const [paymentMethod, setPaymentMethod] = useState("mobile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectedPackage = TOKEN_PACKAGES.find((item) => item.amount === selectedAmount) ?? TOKEN_PACKAGES[1];
  const transactions = useMemo(() => activity.filter((item) => item.type === "purchase" || item.type === "gift"), [activity]);

  function completeDemoPurchase() {
    purchaseTokens(selectedPackage.amount, selectedPackage.price);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccessMessage(`${selectedPackage.amount} tokens were added to your demo balance.`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gift tokens</Text>
        <View style={[styles.demoBadge, { backgroundColor: colors.glass }]}><Text style={[styles.demoText, { color: colors.primary }]}>DEMO</Text></View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.balanceTop}>
            <View style={styles.giftMark}><Ionicons name="gift" size={25} color="#FFFFFF" /></View>
            <Text style={styles.availableLabel}>AVAILABLE BALANCE</Text>
          </View>
          <Text style={styles.balance}>{tokenBalance}</Text>
          <Text style={styles.balanceCaption}>tokens to celebrate your connections</Text>
        </View>

        {successMessage ? (
          <View style={[styles.successBanner, { backgroundColor: colors.glass, borderColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.successText, { color: colors.foreground }]}>{successMessage}</Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a token pack</Text>
        <View style={styles.packages}>
          {TOKEN_PACKAGES.map((item) => {
            const selected = selectedAmount === item.amount;
            return (
              <Pressable
                key={item.amount}
                onPress={() => { setSelectedAmount(item.amount); setSuccessMessage(null); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.packageCard, { backgroundColor: selected ? colors.glass : colors.card, borderColor: selected ? colors.primary : colors.border }]}
              >
                {item.popular ? <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}><Text style={styles.popularText}>POPULAR</Text></View> : null}
                <Ionicons name="sparkles" size={19} color={colors.primary} />
                <Text style={[styles.packageAmount, { color: colors.foreground }]}>{item.amount}</Text>
                <Text style={[styles.packageTokens, { color: colors.mutedForeground }]}>tokens</Text>
                <Text style={[styles.packagePrice, { color: colors.primary }]}>{item.price}</Text>
                <Text style={[styles.packageNote, { color: colors.mutedForeground }]}>{item.note}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment method</Text>
        <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PAYMENT_METHODS.map((method, index) => {
            const selected = paymentMethod === method.id;
            return (
              <Pressable key={method.id} onPress={() => setPaymentMethod(method.id)} style={[styles.paymentRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]} accessibilityRole="radio" accessibilityState={{ selected }}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.secondary }]}><Ionicons name={method.icon} size={20} color={colors.primary} /></View>
                <Text style={[styles.paymentLabel, { color: colors.foreground }]}>{method.label}</Text>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={completeDemoPurchase} style={[styles.purchaseButton, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel={`Buy ${selectedPackage.amount} demo tokens for ${selectedPackage.price}`}>
          <Ionicons name="lock-closed-outline" size={17} color="#FFFFFF" />
          <Text style={styles.purchaseText}>Buy {selectedPackage.amount} tokens · {selectedPackage.price}</Text>
        </Pressable>
        <Text style={[styles.demoNotice, { color: colors.mutedForeground }]}>Demo only — no payment will be processed.</Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent token activity</Text>
        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {transactions.length ? transactions.slice(0, 5).map((entry, index) => (
            <View key={entry.id} style={[styles.historyRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <View style={[styles.historyIcon, { backgroundColor: colors.secondary }]}><Ionicons name={entry.type === "purchase" ? "add-circle-outline" : "gift-outline"} size={19} color={colors.primary} /></View>
              <View style={styles.historyCopy}>
                <Text style={[styles.historyTitle, { color: colors.foreground }]}>{entry.title}</Text>
                <Text style={[styles.historyDescription, { color: colors.mutedForeground }]}>{entry.description}</Text>
              </View>
              <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>{entry.createdAt}</Text>
            </View>
          )) : <Text style={[styles.noHistory, { color: colors.mutedForeground }]}>Your token purchases and gifts will appear here.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  backButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 21, fontFamily: "Inter_700Bold" },
  demoBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  demoText: { fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 18 },
  balanceCard: { borderRadius: 25, padding: 22, overflow: "hidden" },
  balanceTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  giftMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  availableLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1.4, fontFamily: "Inter_700Bold" },
  balance: { color: "#FFFFFF", fontSize: 48, letterSpacing: -2, fontFamily: "Inter_700Bold", marginTop: 17 },
  balanceCaption: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontFamily: "Inter_400Regular" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 15, padding: 12, marginTop: 14 },
  successText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 26, marginBottom: 12 },
  packages: { flexDirection: "row", gap: 8 },
  packageCard: { flex: 1, minHeight: 166, borderWidth: 1, borderRadius: 19, padding: 12, alignItems: "center", justifyContent: "center" },
  popularBadge: { position: "absolute", top: 7, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  popularText: { color: "#FFFFFF", fontSize: 7, letterSpacing: 0.7, fontFamily: "Inter_700Bold" },
  packageAmount: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 5 },
  packageTokens: { fontSize: 10, fontFamily: "Inter_500Medium" },
  packagePrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 7 },
  packageNote: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 3 },
  paymentCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  paymentRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13 },
  paymentIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  paymentLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  purchaseButton: { minHeight: 56, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 },
  purchaseText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  demoNotice: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  historyCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  historyRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  historyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  historyCopy: { flex: 1 },
  historyTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  historyDescription: { fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyTime: { fontSize: 9, fontFamily: "Inter_500Medium" },
  noHistory: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", padding: 24 },
});
