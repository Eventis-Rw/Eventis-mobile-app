import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { LegalDocumentView } from "@/components/support/LegalDocumentView";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/constants/legal";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

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
        {[TERMS_OF_SERVICE, PRIVACY_POLICY].map((document) => (
          <View key={document.title} style={styles.section}>
            <LegalDocumentView document={document} />
          </View>
        ))}
        <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>
          By continuing, you confirm that you have read and understood the above terms and privacy information.
        </Text>

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
    marginBottom: 14,
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
