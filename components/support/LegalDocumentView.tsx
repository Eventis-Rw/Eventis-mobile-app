import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { LegalDocument } from "@/constants/legal";
import { useColors } from "@/hooks/useColors";

/** Renders a Terms or Privacy document as a titled card with headed sections. */
export function LegalDocumentView({ document, showTitle = true }: { document: LegalDocument; showTitle?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {showTitle ? (
        <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
          {document.title}
        </Text>
      ) : null}
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{document.intro}</Text>
      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.foreground }]} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={[styles.body, { color: colors.mutedForeground }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  section: { gap: 6 },
  heading: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
});
