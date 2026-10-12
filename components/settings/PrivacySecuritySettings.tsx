import { useRouter } from "expo-router";
import React from "react";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

/**
 * Group 4: security and visibility. Blocked users and visibility switches are
 * listed only when their features exist (`capabilities.settings`).
 */
export function PrivacySecuritySettings({ capabilities }: { capabilities: AccountCapabilities }) {
  const router = useRouter();
  return (
    <SettingsGroup title="Privacy & Security">
      <SettingsRow
        icon="lock-closed-outline"
        label="Security"
        sublabel="Sign-in details, password and account deletion"
        onPress={() => router.push("/security" as any)}
      />
      <SettingsRow
        icon="eye-outline"
        label="Privacy & visibility"
        sublabel={capabilities.isPublisher ? "What's on your public page" : "What others can see about you"}
        onPress={() => router.push("/privacy-visibility" as any)}
      />
    </SettingsGroup>
  );
}
