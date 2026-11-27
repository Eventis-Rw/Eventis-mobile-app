import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { LegalDocumentView } from "@/components/support/LegalDocumentView";
import {
  FINDLOVE_LEGAL_DOCUMENTS,
  type FindLoveLegalKey,
} from "@/constants/findLoveLegal";
import { useColors } from "@/hooks/useColors";

const TABS: { key: FindLoveLegalKey; label: string }[] = [
  { key: "terms", label: "Terms" },
  { key: "guidelines", label: "Guidelines" },
  { key: "privacy", label: "Privacy" },
];

function isKey(value: unknown): value is FindLoveLegalKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(FINDLOVE_LEGAL_DOCUMENTS, value);
}

/**
 * FindLove Terms, Community Guidelines and Privacy Notice.
 * Reached from "Terms & privacy" on the Me tab and from the age-check consent links.
 * `/love/policies?doc=terms|guidelines|privacy` opens a specific tab.
 */
export default function LovePoliciesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const [tab, setTab] = useState<FindLoveLegalKey>(isKey(doc) ? doc : "terms");

  return (
    <LoveScreenShell title="FindLove policies" onBack={() => router.back()}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[
                styles.tab,
                { backgroundColor: active ? "#FF2D55" : colors.card, borderColor: active ? "#FF2D55" : colors.border },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabLabel, { color: active ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <LegalDocumentView document={FINDLOVE_LEGAL_DOCUMENTS[tab]} />

      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        These add to the Eventis{" "}
        <Text style={styles.link} onPress={() => router.push("/legal/terms" as any)} accessibilityRole="link">
          Terms & Conditions
        </Text>
        ,{" "}
        <Text style={styles.link} onPress={() => router.push("/legal/privacy" as any)} accessibilityRole="link">
          Privacy Policy
        </Text>
        ,{" "}
        <Text style={styles.link} onPress={() => router.push("/legal/guidelines" as any)} accessibilityRole="link">
          Community Guidelines
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={() => router.push("/legal/refunds" as any)} accessibilityRole="link">
          Refund Policy
        </Text>
        , which also apply.
      </Text>
    </LoveScreenShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  link: { color: "#FF2D55", fontFamily: "Inter_600SemiBold" },
});
