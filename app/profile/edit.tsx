import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import {
  FormField,
  OrganisationFields,
  organisationFormValues,
  toOrganisationInput,
  validateOrganisation,
  type OrganisationFormValues,
} from "@/components/OrganisationForm";
import { InlineError, SectionState } from "@/components/profile/ProfileSection";
import { useAuth, type User } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { describeError } from "@/services/organiserService";
import {
  describeProfileError,
  fetchPublisherProfile,
  updatePublisherProfile,
  type PublisherProfile,
  type SocialPlatform,
} from "@/services/profileService";
import {
  normalisePhone,
  normaliseSocialLink,
  normaliseWebsite,
  PROFILE_LIMITS,
  samePhone,
  SOCIAL_PLATFORMS,
  validateCategories,
  validateEmail,
  validateMaxLength,
  validatePhone,
  validateRegistrationNumber,
  validateSocialLink,
  validateTaxId,
  validateUsername,
  validateWebsite,
} from "@/utils/profileValidation";

interface AccountValues {
  username: string;
  bio: string;
  location: string;
  phone: string;
  avatarUri?: string;
}

interface PublicValues {
  contactEmail: string;
  contactPhone: string;
  website: string;
  categories: string[];
  social: Record<SocialPlatform, string>;
  legalName: string;
  registrationNumber: string;
  taxId: string;
}

interface FormValues {
  account: AccountValues;
  organisation: OrganisationFormValues;
  logoUri?: string;
  public: PublicValues;
}

type FieldKey = string;

function initialValues(user: User, profile?: PublisherProfile): FormValues {
  const social = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p.key, profile?.socialLinks[p.key] ?? ""]),
  ) as Record<SocialPlatform, string>;
  return {
    account: {
      username: user.username,
      bio: user.bio ?? "",
      location: user.location ?? "",
      phone: user.phone ?? "",
      avatarUri: user.avatarUrl,
    },
    organisation: organisationFormValues(user.organisation ?? { name: user.businessName, website: user.businessWebsite }),
    logoUri: user.organisation?.logoUrl,
    public: {
      contactEmail: profile?.contactEmail ?? "",
      contactPhone: profile?.contactPhone ?? "",
      website: profile?.website ?? user.businessWebsite ?? "",
      categories: profile?.categories ?? [],
      social,
      legalName: profile?.legalName ?? "",
      registrationNumber: profile?.registrationNumber ?? "",
      taxId: profile?.taxId ?? "",
    },
  };
}

/**
 * Edit Profile. Fields depend on the account type:
 * - customers: photo, name, bio, location, phone
 * - individual posters: + public contact, website, categories, social links
 * - businesses: logo and organisation details instead of photo/bio/location,
 *   + public contact, categories, social links and legal identity
 */
export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, updateProfile, updateOrganisation } = useAuth();
  const { categories: eventCategories } = useEvents();
  const { accountType, isPublisher } = useAccountCapabilities();
  const isBusiness = accountType === "business" && !!user?.organisation;
  const scrollRef = useRef<ScrollView>(null);
  const allowLeave = useRef(false);

  const [initial, setInitial] = useState<FormValues | undefined>(() =>
    user && !isPublisher ? initialValues(user) : undefined,
  );
  const [values, setValues] = useState<FormValues | undefined>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  const loadPublisherDetails = useCallback(async () => {
    if (!user || !isPublisher) return;
    setLoadError(null);
    try {
      const next = initialValues(user, await fetchPublisherProfile(user.id));
      setInitial(next);
      setValues(next);
    } catch (err) {
      setLoadError(describeProfileError(err, "We couldn't load your profile details."));
    }
    // Load once per account; later user updates come from this screen's own save.
  }, [user?.id, isPublisher]);

  useEffect(() => {
    void loadPublisherDetails();
  }, [loadPublisherDetails]);

  const categoryOptions = useMemo(() => eventCategories.filter((c) => c !== "All"), [eventCategories]);

  const errors = useMemo(() => {
    const e: Record<FieldKey, string | undefined> = {};
    if (!values) return e;
    const { account, public: pub } = values;
    e.username = validateUsername(account.username);
    // A number can be changed but not removed once set: it's used for sign-in and verification.
    e.phone = validatePhone(account.phone, { required: !!user?.phone });
    if (!isBusiness) {
      e.bio = validateMaxLength(account.bio, PROFILE_LIMITS.bio);
      e.location = validateMaxLength(account.location, PROFILE_LIMITS.location);
    }
    if (isBusiness) {
      Object.entries(validateOrganisation(values.organisation)).forEach(([key, message]) => {
        e[`organisation.${key}`] = message;
      });
    }
    if (isPublisher) {
      e.contactEmail = validateEmail(pub.contactEmail);
      e.contactPhone = validatePhone(pub.contactPhone);
      if (!isBusiness) e.website = validateWebsite(pub.website);
      e.categories = validateCategories(pub.categories);
      SOCIAL_PLATFORMS.forEach((p) => {
        e[`social.${p.key}`] = validateSocialLink(p.key, pub.social[p.key]);
      });
    }
    if (isBusiness) {
      e.legalName = validateMaxLength(pub.legalName, PROFILE_LIMITS.legalName);
      e.registrationNumber = validateRegistrationNumber(pub.registrationNumber);
      e.taxId = validateTaxId(pub.taxId);
    }
    return e;
  }, [values, isBusiness, isPublisher, user?.phone]);

  const errorCount = Object.values(errors).filter(Boolean).length;
  const errorFor = (key: FieldKey) => (submitAttempted || touched[key] ? errors[key] : undefined);
  const isDirty = !!values && JSON.stringify(values) !== JSON.stringify(initial);

  // Ask before throwing away edits (back button, swipe or hardware back).
  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (allowLeave.current || !isDirty || saving) return;
      event.preventDefault();
      setPendingLeave(() => () => navigation.dispatch(event.data.action));
    });
  }, [navigation, isDirty, saving]);

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="Edit Profile" onBack={() => router.back()} />
        <View style={styles.state}>
          <SectionState
            kind="empty"
            icon="person-outline"
            title="Sign in to edit your profile"
            message="Your profile details are saved to your account."
            actionLabel="Sign in"
            onAction={() => router.replace("/auth/login" as any)}
          />
        </View>
      </View>
    );
  }

  if (!values) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="Edit Profile" onBack={() => router.back()} />
        <View style={styles.state}>
          {loadError ? (
            <SectionState kind="error" message={loadError} onRetry={() => void loadPublisherDetails()} />
          ) : (
            <SectionState kind="loading" message="Loading your details…" />
          )}
        </View>
      </View>
    );
  }

  const setAccount = (key: keyof AccountValues, value: string | undefined) => {
    setSaveError(null);
    setValues((v) => v && { ...v, account: { ...v.account, [key]: value } });
  };
  const setPublic = <K extends keyof PublicValues>(key: K, value: PublicValues[K]) => {
    setSaveError(null);
    setValues((v) => v && { ...v, public: { ...v.public, [key]: value } });
  };
  const setSocial = (platform: SocialPlatform, value: string) =>
    setPublic("social", { ...values.public.social, [platform]: value });
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const toggleCategory = (category: string) => {
    const current = values.public.categories;
    setPublic(
      "categories",
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  };

  const pickPhoto = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) setAccount("avatarUri", result.assets[0].uri);
    } catch {
      setPhotoError("We couldn't open your photos. Check photo permissions and try again.");
    }
  };

  const phoneChanged = !samePhone(values.account.phone, user.phone);

  const save = async () => {
    setSubmitAttempted(true);
    if (errorCount) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (!isDirty) {
      router.back();
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { account, public: pub } = values;
    try {
      await updateProfile({
        username: account.username.trim(),
        phone: normalisePhone(account.phone),
        // A new number has to be verified again before chat or paid bookings.
        isPhoneVerified: phoneChanged ? false : user.isPhoneVerified,
        ...(isBusiness
          ? {}
          : {
              bio: account.bio.trim() || undefined,
              location: account.location.trim() || undefined,
              avatarUrl: account.avatarUri,
            }),
      });

      if (isBusiness && JSON.stringify([values.organisation, values.logoUri]) !== JSON.stringify([initial?.organisation, initial?.logoUri])) {
        await updateOrganisation(toOrganisationInput(values.organisation, values.logoUri));
      }

      if (isPublisher && JSON.stringify(pub) !== JSON.stringify(initial?.public)) {
        const socialLinks = Object.fromEntries(
          SOCIAL_PLATFORMS.map((p) => [p.key, normaliseSocialLink(p.key, pub.social[p.key])]).filter(([, url]) => url),
        );
        await updatePublisherProfile(user.id, {
          contactEmail: pub.contactEmail.trim() || undefined,
          contactPhone: normalisePhone(pub.contactPhone),
          // Businesses keep their website on the organisation record.
          website: isBusiness ? undefined : normaliseWebsite(pub.website),
          categories: pub.categories,
          socialLinks,
          ...(isBusiness
            ? {
                legalName: pub.legalName.trim() || undefined,
                registrationNumber: pub.registrationNumber.trim() || undefined,
                taxId: pub.taxId.replace(/\s/g, "") || undefined,
              }
            : {}),
        });
      }

      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      allowLeave.current = true;
      router.back();
    } catch (err) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError(
        isBusiness
          ? describeError(err, "We couldn't save all your changes. Please try again.")
          : describeProfileError(err, "We couldn't save all your changes. Please try again."),
      );
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setSaving(false);
    }
  };

  const accountField = (key: keyof AccountValues) => ({
    value: (values.account[key] as string) ?? "",
    onChangeText: (text: string) => setAccount(key, text),
    onBlur: () => touch(key),
    error: errorFor(key),
    editable: !saving,
  });
  const publicField = (key: Exclude<keyof PublicValues, "categories" | "social">) => ({
    value: values.public[key],
    onChangeText: (text: string) => setPublic(key, text),
    onBlur: () => touch(key),
    error: errorFor(key),
    editable: !saving,
  });

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        title="Edit Profile"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={save}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.8 : 1 }]}
            accessibilityRole="button"
            accessibilityState={{ busy: saving }}
          >
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {saveError ? <Banner tone="error" message={saveError} /> : null}
        {submitAttempted && errorCount ? (
          <Banner
            tone="error"
            message={`Fix ${errorCount === 1 ? "the highlighted field" : `${errorCount} highlighted fields`} to save.`}
          />
        ) : null}

        {isBusiness ? (
          <Section title="Business details" hint="Shown on your profile and events.">
            <OrganisationFields
              values={values.organisation}
              onChange={(key, text) => {
                setSaveError(null);
                setValues((v) => v && { ...v, organisation: { ...v.organisation, [key]: text } });
              }}
              onBlur={(key) => touch(`organisation.${key}`)}
              errorFor={(key) => errorFor(`organisation.${key}`)}
              logoUri={values.logoUri}
              onLogoChange={(uri) => setValues((v) => v && { ...v, logoUri: uri })}
            />
          </Section>
        ) : (
          <View style={styles.photoBlock}>
            <Pressable
              onPress={pickPhoto}
              disabled={saving}
              style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={values.account.avatarUri ? "Change profile photo" : "Add profile photo"}
            >
              {values.account.avatarUri ? (
                <Image source={{ uri: values.account.avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{(values.account.username || "U").charAt(0).toUpperCase()}</Text>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="camera" size={14} color={colors.foreground} />
              </View>
            </Pressable>
            <View style={styles.photoActions}>
              <Pressable onPress={pickPhoto} disabled={saving} hitSlop={6} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.primary }]}>
                  {values.account.avatarUri ? "Change photo" : "Add photo"}
                </Text>
              </Pressable>
              {values.account.avatarUri ? (
                <Pressable onPress={() => setAccount("avatarUri", undefined)} disabled={saving} hitSlop={6} accessibilityRole="button">
                  <Text style={[styles.link, { color: colors.destructive }]}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            {photoError ? <InlineError message={photoError} /> : null}
          </View>
        )}

        <Section title="Account" hint={isBusiness ? "The person who manages this business account." : undefined}>
          <Card>
            <FormField
              label={isBusiness ? "Account holder name" : "Name"}
              required
              icon="person-outline"
              placeholder="How you appear on Eventis"
              maxLength={PROFILE_LIMITS.username}
              autoCapitalize="words"
              {...accountField("username")}
            />
            {!isBusiness ? (
              <>
                <FormField
                  label="Bio"
                  placeholder={isPublisher ? "What kind of events you host" : "A line about you (optional)"}
                  multiline
                  showCount
                  maxLength={PROFILE_LIMITS.bio}
                  {...accountField("bio")}
                />
                <FormField
                  label="Location"
                  icon="location-outline"
                  placeholder="e.g. Kigali, Rwanda"
                  maxLength={PROFILE_LIMITS.location}
                  {...accountField("location")}
                />
              </>
            ) : null}
            <FormField
              label="Phone number"
              icon="call-outline"
              placeholder="+250 788 123 456"
              keyboardType="phone-pad"
              maxLength={20}
              {...accountField("phone")}
            />
            <PhoneStatus verified={user.isPhoneVerified && !phoneChanged} changed={phoneChanged && !!values.account.phone.trim()} />
            <ReadOnlyRow icon="mail-outline" label="Sign-in email" value={user.email} hint="Contact support to change your sign-in email." />
          </Card>
        </Section>

        {isPublisher ? (
          <Section title="Public contact" hint="Shown on your profile so attendees can reach you.">
            <Card>
              <FormField
                label="Contact email"
                icon="mail-outline"
                placeholder={user.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                {...publicField("contactEmail")}
              />
              <FormField
                label="Contact phone"
                icon="call-outline"
                placeholder="+250 788 123 456"
                keyboardType="phone-pad"
                maxLength={20}
                {...publicField("contactPhone")}
              />
              {!isBusiness ? (
                <FormField
                  label="Website"
                  icon="globe-outline"
                  placeholder="https://yourwebsite.com"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  {...publicField("website")}
                />
              ) : null}
            </Card>
          </Section>
        ) : null}

        {isPublisher ? (
          <Section
            title="Event categories"
            hint={`Pick up to ${PROFILE_LIMITS.categories} so customers know what you run.`}
          >
            <View style={styles.chips}>
              {categoryOptions.map((category) => {
                const selected = values.public.categories.includes(category);
                return (
                  <Pressable
                    key={category}
                    onPress={() => toggleCategory(category)}
                    disabled={saving}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.secondary,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.categories ? <InlineError message={errors.categories} /> : null}
          </Section>
        ) : null}

        {isPublisher ? (
          <Section title="Social media" hint="Optional. Paste a link or just your username.">
            <Card>
              {SOCIAL_PLATFORMS.map((p) => (
                <FormField
                  key={p.key}
                  label={p.label}
                  placeholder={p.key === "linkedin" ? "company-name or link" : "@username or link"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  value={values.public.social[p.key]}
                  onChangeText={(text) => setSocial(p.key, text)}
                  onBlur={() => touch(`social.${p.key}`)}
                  error={errorFor(`social.${p.key}`)}
                  editable={!saving}
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {isBusiness ? (
          <Section
            title="Legal identity"
            hint="Used for business verification and paid events. Only the last 3 digits of your TIN are shown."
          >
            <Card>
              <FormField
                label="Legal business name"
                icon="business-outline"
                placeholder="As registered with RDB"
                maxLength={PROFILE_LIMITS.legalName}
                {...publicField("legalName")}
              />
              <FormField
                label="Registration number"
                icon="document-text-outline"
                placeholder="RDB company code"
                autoCapitalize="characters"
                maxLength={PROFILE_LIMITS.registrationNumber}
                {...publicField("registrationNumber")}
              />
              <FormField
                label="TIN"
                icon="receipt-outline"
                placeholder="9 digits"
                keyboardType="number-pad"
                maxLength={11}
                {...publicField("taxId")}
              />
            </Card>
          </Section>
        ) : null}

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.bottomSave,
            { backgroundColor: colors.primary, opacity: saving || pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ busy: saving }}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.bottomSaveText}>Save changes</Text>}
        </Pressable>
      </ScrollView>

      <ChatConfirmDialog
        visible={!!pendingLeave}
        title="Discard changes?"
        description="You have unsaved changes to your profile."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          const leave = pendingLeave;
          setPendingLeave(null);
          allowLeave.current = true;
          leave?.();
        }}
        onClose={() => setPendingLeave(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.foreground }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      {hint ? <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function Banner({ tone, message }: { tone: "error"; message: string }) {
  const colors = useColors();
  const color = tone === "error" ? colors.destructive : colors.primary;
  return (
    <View
      style={[styles.banner, { backgroundColor: `${color}14`, borderColor: `${color}55` }]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="alert-circle" size={18} color={color} />
      <Text style={[styles.bannerText, { color: colors.foreground }]}>{message}</Text>
    </View>
  );
}

function PhoneStatus({ verified, changed }: { verified: boolean; changed: boolean }) {
  const colors = useColors();
  const color = verified ? colors.success : colors.warning;
  const text = changed
    ? "You'll need to verify this new number before chatting or booking paid events."
    : verified
      ? "Verified"
      : "Not verified. Verification is needed for chat and paid bookings.";
  return (
    <View style={styles.phoneStatus}>
      <Ionicons name={verified ? "checkmark-circle" : "alert-circle-outline"} size={15} color={color} />
      <Text style={[styles.phoneStatusText, { color }]}>{text}</Text>
    </View>
  );
}

function ReadOnlyRow({ icon, label, value, hint }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; hint: string }) {
  const colors = useColors();
  return (
    <View style={styles.readOnly}>
      <Text style={[styles.readOnlyLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.readOnlyValue, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.mutedForeground} />
        <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="lock-closed-outline" size={14} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  headerRight: { minWidth: 72, alignItems: "flex-end" },
  saveBtn: { paddingHorizontal: 18, minHeight: 40, borderRadius: 12, minWidth: 72, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 22 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  photoBlock: { alignItems: "center", gap: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", borderRadius: 48 },
  avatarLetter: { color: "#FFFFFF", fontSize: 38, fontFamily: "Inter_700Bold" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: { flexDirection: "row", gap: 20 },
  link: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  sectionHint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 38, justifyContent: "center", borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  phoneStatus: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  phoneStatusText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  readOnly: { gap: 6 },
  readOnlyLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  readOnlyValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  readOnlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  bottomSave: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  bottomSaveText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
