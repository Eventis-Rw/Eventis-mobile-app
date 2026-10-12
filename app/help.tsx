import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { SUPPORT_EMAIL } from "@/services/supportService";

interface Faq {
  q: string;
  a: string;
}

const BOOKING_FAQS: Faq[] = [
  {
    q: "Do I need to verify my account to book?",
    a: "Not for free events: you can reserve straight away. Paid events need a verified phone number, which takes one code by SMS and only happens once.",
  },
  {
    q: "How do I pay for a paid event?",
    a: "Eventis doesn't take payments. When you book a paid event, we send you to the organiser's official website to pay.",
  },
  {
    q: "Where are my tickets?",
    a: "Open your profile and choose My Tickets. Tap a ticket to see your pass and ticket code, and show it at the entrance.",
  },
  {
    q: "How do refunds work?",
    a: "The organiser handles payments and refunds for their event. Contact them through the website you paid on.",
  },
];

const CUSTOMER_FAQS: Faq[] = [
  {
    q: "What does saving an organiser do?",
    a: "It keeps them in Saved Organisers on your profile so you can find their events quickly. It's private: organisers aren't told and there are no follower counts.",
  },
  {
    q: "How do I review an event?",
    a: "After you attend, open My Reviews on your profile and tap Rate next to the event. You can edit or delete your review at any time.",
  },
];

const PUBLISHER_FAQS: Faq[] = [
  {
    q: "How do I publish an event?",
    a: "Open your profile, choose Event Management, then Create event. Published events appear in discovery straight away.",
  },
  {
    q: "Why can't I sell paid tickets?",
    a: "Only verified businesses can publish paid events. Businesses can apply in Settings → Verification with their registration details, TIN and payment website.",
  },
  {
    q: "How long does business verification take?",
    a: "Usually 1–2 working days. You'll see the status in Settings and on your profile.",
  },
  {
    q: "What's the difference between pausing and deleting an event?",
    a: "Pausing hides the event from discovery and keeps its bookings; you can resume it later. Deleting removes it for good.",
  },
];

const BUSINESS_FAQS: Faq[] = [
  {
    q: "How do home page promotions work?",
    a: "From Analytics, choose Promote and pick an event, placement and duration. The Eventis team reviews each request and confirms the price before anything goes live or is charged.",
  },
];

/** Help: answers grouped by topic for this account type, plus ways to reach the team. */
export default function HelpScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const accountType = getAccountType(user);
  const [copied, setCopied] = useState(false);

  const topics: { title: string; faqs: Faq[] }[] = [
    { title: "Booking & tickets", faqs: BOOKING_FAQS },
    ...(accountType === "customer" ? [{ title: "Your profile", faqs: CUSTOMER_FAQS }] : []),
    ...(accountType !== "customer" ? [{ title: "Publishing events", faqs: PUBLISHER_FAQS }] : []),
    ...(accountType === "business" ? [{ title: "Promotions", faqs: BUSINESS_FAQS }] : []),
  ];

  const emailSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Eventis help")}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {}
    // No mail app: copy the address instead of failing silently.
    await Clipboard.setStringAsync(SUPPORT_EMAIL);
    setCopied(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="Help" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {topics.map((topic) => (
          <View key={topic.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]} accessibilityRole="header">
              {topic.title.toUpperCase()}
            </Text>
            <GlassSurface style={styles.card}>
              {topic.faqs.map((faq, i) => (
                <FaqItem key={faq.q} faq={faq} first={i === 0} />
              ))}
            </GlassSurface>
          </View>
        ))}

        <SettingsGroup
          title="Still need help?"
          footer={copied ? `No mail app found, so we copied ${SUPPORT_EMAIL}.` : undefined}
        >
          <SettingsRow
            icon="flag-outline"
            label="Report a problem"
            sublabel="Tell us what went wrong"
            onPress={() => router.push("/report-problem" as any)}
          />
          <SettingsRow icon="mail-outline" label="Email support" sublabel={SUPPORT_EMAIL} external onPress={() => void emailSupport()} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

function FaqItem({ faq, first }: { faq: Faq; first: boolean }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={[!first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.question}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.questionText, { color: colors.foreground }]}>{faq.q}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </Pressable>
      {open ? <Text style={[styles.answer, { color: colors.mutedForeground }]}>{faq.a}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  card: { paddingHorizontal: 14 },
  question: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 12 },
  questionText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  answer: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", paddingBottom: 14 },
});
