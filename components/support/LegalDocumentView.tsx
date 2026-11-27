import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { LEGAL_DRAFT_NOTICE, LEGAL_IS_DRAFT, type LegalBlock, type LegalDocument } from "@/constants/legal";
import { useColors } from "@/hooks/useColors";

/** Renders text with **bold** spans. */
function RichText({ text, style }: { text: string; style: object[] }) {
  const parts = text.split("**");
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.bold}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const colors = useColors();
  const body = [styles.body, { color: colors.mutedForeground }];
  switch (block.type) {
    case "p":
      return <RichText text={block.text} style={body} />;
    case "subheading":
      return <Text style={[styles.subheading, { color: colors.foreground }]}>{block.text}</Text>;
    case "list":
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={body}>{"•"}</Text>
              <View style={styles.listText}>
                <RichText text={item} style={body} />
              </View>
            </View>
          ))}
        </View>
      );
    case "table": {
      const [head, ...rows] = block.rows;
      return (
        <View style={styles.list}>
          {rows.map((row, i) => (
            <RichText
              key={i}
              text={row.map((cell, c) => (c === 0 ? `**${cell}**` : cell || "—")).join(": ")}
              style={body}
            />
          ))}
          {rows.length === 0 && head ? <RichText text={head.join(" | ")} style={body} /> : null}
        </View>
      );
    }
  }
}

/** Banner shown on every legal document while the texts await legal sign-off. */
export function LegalDraftBanner() {
  if (!LEGAL_IS_DRAFT) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>{LEGAL_DRAFT_NOTICE}</Text>
    </View>
  );
}

/** Renders an Eventis or FindLove legal document as a titled card with headed sections. */
export function LegalDocumentView({ document, showTitle = true }: { document: LegalDocument; showTitle?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LegalDraftBanner />
      {showTitle ? (
        <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
          {document.title}
        </Text>
      ) : null}
      {document.subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{document.subtitle}</Text>
      ) : null}
      {document.preamble.map((block, i) => (
        <Block key={`pre-${i}`} block={block} />
      ))}
      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.foreground }]} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5A524",
    backgroundColor: "rgba(245,165,36,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold", color: "#B26A00" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  section: { gap: 6 },
  heading: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subheading: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  bold: { fontFamily: "Inter_600SemiBold" },
  list: { gap: 4 },
  listItem: { flexDirection: "row", gap: 8 },
  listText: { flex: 1 },
});
