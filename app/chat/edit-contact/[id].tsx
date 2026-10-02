import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "@/context/ChatContext";
import { useChatColors } from "@/hooks/useChatColors";

const digits = (value: string) => value.replace(/\D/g, "");

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useChatColors();
  const chat = useChat();
  const contact = chat.getContact(id);
  const initial = useMemo(() => {
    const parts = contact?.name.trim().split(/\s+/) ?? [];
    return {
      first: contact?.firstName ?? parts[0] ?? "",
      last: contact?.lastName ?? parts.slice(1).join(" "),
    };
  }, [contact?.firstName, contact?.lastName, contact?.name]);
  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [syncToPhone, setSyncToPhone] = useState(Platform.OS !== "web");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/chat");

  async function syncContact() {
    if (Platform.OS === "web") return undefined;
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Allow Contacts access in your phone settings to sync this person.",
      );
    let deviceContactId = contact?.deviceContactId;
    if (!deviceContactId) {
      const records = await Contacts.Contact.getAllDetails([
        Contacts.ContactField.PHONES,
      ]);
      deviceContactId = records.find((record) =>
        record.phones?.some(
          (item) => digits(item.number ?? "") === digits(phone),
        ),
      )?.id;
    }
    const record = {
      givenName: firstName.trim(),
      familyName: lastName.trim(),
      phones: [{ label: "mobile", number: phone.trim() }],
    };
    if (deviceContactId) {
      await new Contacts.Contact(deviceContactId).patch(record);
      return deviceContactId;
    }
    return (await Contacts.Contact.create(record)).id;
  }

  async function save() {
    if (!contact || saving || !firstName.trim() || !phone.trim()) return;
    setSaving(true);
    setError("");
    try {
      const deviceContactId = syncToPhone
        ? await syncContact()
        : contact.deviceContactId;
      await chat.updateContact(contact.id, {
        firstName,
        lastName,
        phone,
        isInAddressBook: syncToPhone ? true : contact.isInAddressBook,
        deviceContactId,
      });
      back();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this contact.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!contact)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Contact unavailable</Text>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.workspace, { paddingTop: insets.top + 4 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.headerAction}
          >
            <Text style={[styles.headerButton, { color: colors.primary }]}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {contact.isInAddressBook ? "Edit contact" : "New contact"}
          </Text>
          <Pressable
            onPress={() => void save()}
            disabled={saving || !firstName.trim() || !phone.trim()}
            accessibilityRole="button"
            accessibilityLabel="Save contact"
            style={styles.headerAction}
          >
            <Text
              style={[
                styles.headerButton,
                {
                  color:
                    firstName.trim() && phone.trim()
                      ? colors.primary
                      : colors.disabled,
                },
              ]}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          <Image
            source={{ uri: contact.avatarUrl }}
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          />
          <View
            style={[
              styles.form,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoFocus
              colors={colors}
            />
            <Field
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              colors={colors}
            />
            <Field
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              colors={colors}
            />
          </View>
          <View
            style={[
              styles.syncRow,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <View style={[styles.syncIcon, { backgroundColor: colors.glass }]}>
              <Ionicons
                name="phone-portrait-outline"
                size={21}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.syncTitle, { color: colors.foreground }]}>
                Sync to phone contacts
              </Text>
              <Text
                style={[styles.syncText, { color: colors.mutedForeground }]}
              >
                {Platform.OS === "web"
                  ? "Available in the installed Android and iOS app."
                  : "Keep this name and number in your device address book."}
              </Text>
            </View>
            <Switch
              value={syncToPhone}
              onValueChange={setSyncToPhone}
              disabled={Platform.OS === "web"}
              trackColor={{ false: colors.disabled, true: colors.primary }}
            />
          </View>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.destructive }]}
            >
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useChatColors>;
  autoFocus?: boolean;
  keyboardType?: "phone-pad";
}) {
  return (
    <View style={[styles.field, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.disabled}
        style={[styles.input, { color: colors.foreground }]}
        maxLength={60}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  workspace: { flex: 1, width: "100%", maxWidth: 720 },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    minWidth: 72,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerButton: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  content: { padding: 18, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, marginVertical: 22 },
  form: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  field: {
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 11, marginBottom: 2 },
  input: { fontSize: 16, paddingVertical: 7 },
  syncRow: {
    width: "100%",
    marginTop: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  syncTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  syncText: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  error: { width: "100%", marginTop: 14, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
