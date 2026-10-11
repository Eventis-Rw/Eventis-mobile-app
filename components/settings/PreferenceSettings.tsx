import { useRouter } from "expo-router";
import React from "react";

import { AppearanceRow, SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { useDiscoveryPreferences } from "@/hooks/useDiscoveryPreferences";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

function summarise(categories: string[], location?: string) {
  const parts = [
    categories.length
      ? categories.length <= 2
        ? categories.join(", ")
        : `${categories.slice(0, 2).join(", ")} +${categories.length - 2}`
      : "No categories yet",
    location,
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * Group 3: what the app shows you and how it looks. Language is listed only
 * when `PROFILE_FEATURES.languagePreference` is on: the app ships English only
 * today, so a picker would change nothing.
 */
export function PreferenceSettings({ capabilities }: { capabilities?: AccountCapabilities }) {
  const router = useRouter();
  const discovery = useDiscoveryPreferences();
  const showDiscovery = !!capabilities?.settings.discoveryPreferences && discovery.enabled;

  const sublabel = discovery.isLoading
    ? "Loading…"
    : discovery.error
      ? "Couldn't load. Tap to try again"
      : summarise(discovery.preferences?.categories ?? [], discovery.preferences?.location);

  return (
    <SettingsGroup title="Preferences">
      {showDiscovery ? (
        <SettingsRow
          icon="compass-outline"
          label="Categories & location"
          sublabel={sublabel}
          onPress={discovery.error ? () => void discovery.reload() : () => router.push("/preferences" as any)}
        />
      ) : null}
      <AppearanceRow />
    </SettingsGroup>
  );
}
