import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useColors } from "@/hooks/useColors";

const TERMS = `
Eventis Terms of Service

Welcome to Eventis. These terms govern access to the Eventis mobile application and services. By creating an account, you agree to use Eventis for lawful event discovery, ticketing, and community interaction. You are responsible for the accuracy of your account information and for maintaining the security of your login.

You may not misuse the platform, impersonate others, post deceptive or harmful content, or attempt unauthorized access to other users' content or accounts. Eventis may update, suspend, or remove features at any time to maintain platform integrity.

Eventis is not a marketplace for regulated or illegal activity. Any behavior that violates safety, community standards, or local law may lead to suspension or account restriction.

Privacy Policy

Eventis collects the information needed to create and secure your account, support event discovery, and improve the user experience. This may include your username, contact details, saved preferences, and activity related to bookings or app usage.

We use your information to provide account access, personalize recommendations, support your bookings, and communicate important service updates. We do not sell your personal data. We may share information only where required for service delivery, legal compliance, or platform safety.

You may request access to, correction of, or deletion of your personal information where applicable. We retain some records to meet legal, security, and service obligations.

By continuing, you confirm that you have read and understood the above terms and privacy information.
`;

export default function TermsScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  const policySections = useMemo(
    () => [
      { title: "Terms of Service", body: TERMS.split("Privacy Policy")[0].trim() },
      { title: "Privacy Policy", body: TERMS.split("Privacy Policy")[1].trim() },
    ],
    []
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms & Policies</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {policySections.map((section) => (
          <View key={section.title} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{section.body}</Text>
          </View>
        ))}

        <Pressable
          onPress={() => setAccepted((v) => !v)}
          style={styles.acceptRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: accepted ? colors.primary : "transparent",
                borderColor: accepted ? colors.primary : colors.border,
              },
            ]}
          >
            {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.acceptText, { color: colors.foreground }]}>
            I have read and accept the Eventis Terms of Service and Privacy Policy.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!accepted) return;
            router.push("/auth/register" as any);
          }}
          style={[
            styles.primaryButton,
            {
              backgroundColor: accepted ? colors.primary : colors.secondary,
              opacity: accepted ? 1 : 0.65,
            },
          ]}
          disabled={!accepted}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_500Medium",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
