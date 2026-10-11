import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SectionState } from "@/components/profile/ProfileSection";
import { LegalDocumentView } from "@/components/support/LegalDocumentView";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/constants/legal";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

/** `/legal/terms` or `/legal/privacy`. Same text as the sign-up screen. */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const document =
    doc && Object.prototype.hasOwnProperty.call(LEGAL_DOCUMENTS, doc) ? LEGAL_DOCUMENTS[doc as LegalDocumentKey] : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title={document?.title ?? "Legal"} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {document ? (
          <LegalDocumentView document={document} showTitle={false} />
        ) : (
          <SectionState kind="empty" icon="document-text-outline" title="Page not found" message="This document doesn't exist." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
});
