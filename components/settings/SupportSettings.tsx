import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import { Linking } from "react-native";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/**
 * Group 6: help and legal.
 * TEMPORARY: help, report a problem, terms, privacy and about become in-app
 * screens in subtask 10; until then these open email and the website.
 */
export function SupportSettings() {
  const router = useRouter();
  return (
    <SettingsGroup title="Help & Support">
      <SettingsRow
        icon="help-circle-outline"
        label="Help & contact"
        sublabel="Email the Eventis team"
        external
        onPress={() => void Linking.openURL("mailto:support@eventis.app").catch(() => {})}
      />
      <SettingsRow
        icon="document-text-outline"
        label="Terms & Privacy Policy"
        external
        onPress={() => void Linking.openURL("https://eventis.app/terms").catch(() => {})}
      />
      {__DEV__ ? (
        <SettingsRow
          icon="play-circle-outline"
          label="Replay onboarding"
          sublabel="Developer builds only"
          onPress={() => router.push("/presentation-splash" as any)}
        />
      ) : null}
    </SettingsGroup>
  );
}
