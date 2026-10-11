import React from "react";

import { AppearanceRow, SettingsGroup } from "@/components/settings/SettingsPrimitives";

/**
 * Group 3: how the app looks and what it shows you.
 * TEMPORARY: preferred categories, location and language join in subtask 7.
 */
export function PreferenceSettings() {
  return (
    <SettingsGroup title="Preferences">
      <AppearanceRow />
    </SettingsGroup>
  );
}
