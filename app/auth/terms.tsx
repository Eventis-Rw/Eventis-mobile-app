import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { LegalDocumentView } from "@/components/support/LegalDocumentView";
import { PRIVACY_POLICY, PRIVACY_POLICY_URL, TERMS_OF_SERVICE, TERMS_URL } from "@/constants/legal";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

type DocumentTab = "all" | "terms" | "privacy";

export default function TermsScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ doc?: string }>();

  const initialTab: DocumentTab =
    params.doc === "terms" || params.doc === "privacy" ? params.doc : "all";
  const [selectedTab, setSelectedTab] = useState<DocumentTab>(initialTab);
  const [accepted, setAccepted] = useState(false);

  const displayedDocs =
    selectedTab === "terms"
      ? [TERMS_OF_SERVICE]
      : selectedTab === "privacy"
      ? [PRIVACY_POLICY]
      : [TERMS_OF_SERVICE, PRIVACY_POLICY];

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/register" as any);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleGoBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {selectedTab === "terms"
            ? "Terms of Service"
            : selectedTab === "privacy"
            ? "Privacy Policy"
            : "Terms & Policies"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(
          [
            { key: "all", label: "All" },
            { key: "terms", label: "Terms of Service" },
            { key: "privacy", label: "Privacy Policy" },
          ] as const
        ).map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isActive
                    ? "#00A3FF"
                    : isDark
                    ? "#161616"
                    : colors.input,
                  borderColor: isActive
                    ? "#00A3FF"
                    : isDark
                    ? "#262626"
                    : colors.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive
                      ? "#FFFFFF"
                      : isDark
                      ? colors.foreground
                      : colors.foreground,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {displayedDocs.map((document) => (
          <View key={document.title} style={styles.section}>
            <LegalDocumentView document={document} />
          </View>
        ))}

        <Pressable
          onPress={() => {
            const url = selectedTab === "privacy" ? PRIVACY_POLICY_URL : TERMS_URL;
            void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
          }}
          style={styles.webLinkRow}
          accessibilityRole="link"
        >
          <Ionicons name="open-outline" size={15} color="#00A3FF" />
          <Text style={styles.webLinkText}>
            View {selectedTab === "privacy" ? "Privacy Policy" : selectedTab === "terms" ? "Terms of Service" : "full policies"} online at eventis.today
          </Text>
        </Pressable>

        <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>
          By continuing, you confirm that you have read and understood the above terms and privacy information.
        </Text>

        <Pressable
          onPress={() => setAccepted((v) => !v)}
          style={styles.acceptRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: accepted ? "#00A3FF" : "transparent",
                borderColor: accepted ? "#00A3FF" : colors.border,
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
          onPress={handleGoBack}
          style={[
            styles.primaryButton,
            {
              backgroundColor: accepted ? "#00A3FF" : colors.secondary,
              opacity: accepted ? 1 : 0.75,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue back to sign up"
        >
          <Text
            style={[
              styles.primaryButtonText,
              { color: accepted ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {accepted ? "Accept & Continue" : "Back to Sign Up"}
          </Text>
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  webLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  webLinkText: {
    fontSize: 13,
    color: "#00A3FF",
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
});
