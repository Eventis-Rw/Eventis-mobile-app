import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { PortalActionList } from "@/components/PortalActionList";
import { CREATE_ACTIONS } from "@/constants/organiserPortal";
import { useColors } from "@/hooks/useColors";

export default function PortalCreateScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OrganiserPortalHeader title="Create" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Everything you create here is published as your organisation, not your personal profile.
        </Text>
        <PortalActionList actions={CREATE_ACTIONS} prominent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
