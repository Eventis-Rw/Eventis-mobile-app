import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type AccountType = "business" | "individual";

export default function BusinessRegisterScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user, registerBusiness } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.isBusinessAccount) {
    router.replace("/business/dashboard" as any);
    return null;
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    await registerBusiness({ businessName, type: accountType, website: website || undefined });
    setLoading(false);
    router.replace("/business/dashboard" as any);
  };

  const TYPES: { type: AccountType; icon: string; title: string; desc: string }[] = [
    {
      type: "individual",
      icon: "person-outline",
      title: "Individual Poster",
      desc: "Freelancers, community organizers, artists & influencers",
    },
    {
      type: "business",
      icon: "business-outline",
      title: "Business Account",
      desc: "Companies, brands, clubs, venues & professional organizers",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          List Events
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(80).springify() : undefined}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Start Posting Events
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Choose how you want to list events on Eventis and reach thousands of attendees.
          </Text>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(140).springify() : undefined}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Account Type</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <Pressable
                key={t.type}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: accountType === t.type ? colors.primary : colors.border,
                    borderWidth: accountType === t.type ? 2 : 1,
                  },
                ]}
                onPress={() => setAccountType(t.type)}
              >
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: accountType === t.type ? colors.primary : colors.secondary },
                  ]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={22}
                    color={accountType === t.type ? "#fff" : colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.typeTitle, { color: colors.foreground }]}>
                  {t.title}
                </Text>
                <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                  {t.desc}
                </Text>
                {accountType === t.type && (
                  <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {accountType === "business" ? "Business Name" : "Your Name / Brand"}
          </Text>
          <View style={[styles.inputField, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons
              name={accountType === "business" ? "business-outline" : "person-outline"}
              size={18}
              color={colors.mutedForeground}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder={accountType === "business" ? "e.g. Pulse Events Ltd" : "e.g. Alex Johnson"}
              placeholderTextColor={colors.mutedForeground}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(260).springify() : undefined}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            Website <Text style={{ color: colors.mutedForeground }}>(required for paid events)</Text>
          </Text>
          <View style={[styles.inputField, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={colors.mutedForeground}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </Animated.View>

        {/* Paid event requirements */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(320).springify() : undefined}
          style={[styles.infoBox, { backgroundColor: colors.glass, borderColor: colors.border }]}
        >
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            For Paid Events
          </Text>
          {[
            "Business registration documents",
            "Legal business name",
            "Website URL for payment processing",
            "Tax/business identification (if applicable)",
          ].map((item) => (
            <View key={item} style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
          <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>
            Eventis does not process payments directly. Customers are redirected to your website.
          </Text>
        </Animated.View>

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(380).springify() : undefined}>
          <Pressable
            style={[
              styles.submitBtn,
              {
                backgroundColor: businessName.trim() ? colors.primary : colors.border,
                opacity: loading ? 0.75 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={!businessName.trim() || loading}
          >
            <Ionicons name="rocket-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {loading ? "Creating account..." : "Start Posting Events"}
            </Text>
          </Pressable>
        </Animated.View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  typeGrid: { flexDirection: "row", gap: 12 },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    gap: 8,
    position: "relative",
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  typeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  typeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  typeCheck: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  infoBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  infoTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  infoNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 4,
    fontStyle: "italic",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
