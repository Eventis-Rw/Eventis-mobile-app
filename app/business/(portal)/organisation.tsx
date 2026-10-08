import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { PortalActionList } from "@/components/PortalActionList";
import { ORGANISATION_ACTIONS } from "@/constants/organiserPortal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function PortalOrganisationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const org = user?.organisation;
  const subscription = user?.organiserSubscription;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OrganiserPortalHeader title="Organisation" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {org ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.identity}>
              <View style={[styles.logo, { backgroundColor: colors.primary }]}>
                {org.logoUrl ? (
                  <Image source={{ uri: org.logoUrl }} style={styles.logoImg} />
                ) : (
                  <Text style={styles.logoLetter}>{org.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.name, { color: colors.foreground }]}>{org.name}</Text>
                <Text style={[styles.muted, { color: colors.mutedForeground }]}>{org.activities}</Text>
              </View>
            </View>
            <Text style={[styles.body, { color: colors.foreground }]}>{org.description}</Text>
            <InfoRow icon="location-outline" text={org.location} />
            {org.website && (
              <InfoRow icon="globe-outline" text={org.website} onPress={() => Linking.openURL(org.website!).catch(() => {})} />
            )}
          </View>
        ) : (
          // Organisers set up before organisation profiles existed only have a business name.
          <View style={[styles.card, styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="business-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {user?.businessName ? `Complete ${user.businessName}'s profile` : "Complete your organisation profile"}
            </Text>
            <Text style={[styles.muted, styles.center, { color: colors.mutedForeground }]}>
              Add a description, location and logo so attendees know who's behind your events.
            </Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/business/edit-organisation" as any)}
              accessibilityRole="button"
            >
              <Text style={styles.emptyBtnText}>Add details</Text>
            </Pressable>
          </View>
        )}

        {subscription && (
          <View style={[styles.card, styles.subRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={20} color={colors.success} />
            <View style={styles.flex}>
              <Text style={[styles.subTitle, { color: colors.foreground }]}>Organiser subscription active</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                Renews {new Date(subscription.renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Manage</Text>
        <PortalActionList actions={ORGANISATION_ACTIONS} />
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "link" : "text"}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.muted, styles.flex, { color: onPress ? colors.primary : colors.foreground }]} numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoLetter: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  name: { fontSize: 18, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyBtn: { marginTop: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subRow: { flexDirection: "row", alignItems: "center" },
  subTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
});
