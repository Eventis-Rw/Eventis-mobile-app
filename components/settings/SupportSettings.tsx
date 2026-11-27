import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/** Group 6: help, problem reports, legal documents and about. All in-app. */
export function SupportSettings() {
  const router = useRouter();
  return (
    <SettingsGroup title="Help & Support">
      <SettingsRow icon="help-circle-outline" label="Help" sublabel="Answers to common questions" onPress={() => router.push("/help" as any)} />
      <SettingsRow icon="flag-outline" label="Report a problem" sublabel="Tell us what went wrong" onPress={() => router.push("/report-problem" as any)} />
      <SettingsRow icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push("/legal/terms" as any)} />
      <SettingsRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push("/legal/privacy" as any)} />
      <SettingsRow icon="people-outline" label="Community Guidelines" onPress={() => router.push("/legal/guidelines" as any)} />
      <SettingsRow icon="receipt-outline" label="Cancellation & Refund Policy" onPress={() => router.push("/legal/refunds" as any)} />
      <SettingsRow icon="ellipse-outline" label="Cookies Policy" onPress={() => router.push("/legal/cookies" as any)} />
      <SettingsRow icon="briefcase-outline" label="Publisher & Organiser Agreement" onPress={() => router.push("/legal/organiser" as any)} />
      <SettingsRow icon="information-circle-outline" label="About Eventis" sublabel={`Version ${APP_VERSION}`} onPress={() => router.push("/about" as any)} />
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
