import React from "react";

import { SettingsGroup, SettingsRow, SettingsToggleRow } from "@/components/settings/SettingsPrimitives";
import { useNotificationPreferences, type NotificationKey } from "@/hooks/useNotificationPreferences";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

type IconName = React.ComponentProps<typeof SettingsToggleRow>["icon"];

interface ToggleDef {
  key: NotificationKey;
  icon: IconName;
  label: string;
  sublabel: string;
}

/**
 * Group 2: what Eventis may notify you about. Every toggle saves on change and
 * rolls back if the save fails. Saved-organiser updates only apply to
 * customers, who are the ones with a saved organisers list.
 */
export function NotificationSettings({ capabilities }: { capabilities: AccountCapabilities }) {
  const notifications = useNotificationPreferences();
  if (!capabilities.settings.notifications || !notifications.enabled) return null;

  const toggles: ToggleDef[] = [
    {
      key: "bookingUpdates",
      icon: "ticket-outline",
      label: "Bookings & tickets",
      sublabel: "Confirmations, changes and reminders before your events",
    },
    {
      key: "eventRecommendations",
      icon: "location-outline",
      label: "Events near you",
      sublabel: "Recommendations based on your location and past events",
    },
    {
      key: "categoryUpdates",
      icon: "pricetags-outline",
      label: "New in your categories",
      sublabel: "When events are published in categories you prefer",
    },
    ...(capabilities.settings.savedOrganiserNotifications
      ? [
          {
            key: "savedOrganiserUpdates" as const,
            icon: "bookmark-outline" as const,
            label: "Saved organisers",
            sublabel: "When an organiser you saved publishes a new event",
          },
        ]
      : []),
    {
      key: "promotional",
      icon: "megaphone-outline",
      label: "News & offers from Eventis",
      sublabel: "Occasional product news and featured events",
    },
  ];

  if (notifications.isLoading) {
    return (
      <SettingsGroup title="Notifications">
        <SettingsRow icon="notifications-outline" label="Notifications" sublabel="Loading your settings…" />
      </SettingsGroup>
    );
  }

  if (notifications.loadError || !notifications.preferences) {
    return (
      <SettingsGroup title="Notifications" footer={notifications.loadError ?? undefined} footerTone="error">
        <SettingsRow
          icon="refresh-outline"
          label="Couldn't load notification settings"
          sublabel="Tap to try again"
          onPress={() => void notifications.reload()}
        />
      </SettingsGroup>
    );
  }

  const prefs = notifications.preferences;
  return (
    <SettingsGroup
      title="Notifications"
      footer={notifications.saveError ?? "Changes save automatically."}
      footerTone={notifications.saveError ? "error" : "muted"}
    >
      {toggles.map((t) => (
        <SettingsToggleRow
          key={t.key}
          icon={t.icon}
          label={t.label}
          sublabel={t.sublabel}
          value={prefs[t.key]}
          pending={notifications.isPending(t.key)}
          onChange={(value) => void notifications.toggle(t.key, value)}
        />
      ))}
    </SettingsGroup>
  );
}
