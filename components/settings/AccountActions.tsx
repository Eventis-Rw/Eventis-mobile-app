import { useRouter } from "expo-router";
import React, { useState } from "react";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { useAuth } from "@/context/AuthContext";

/**
 * Group 7: log out (confirmed in an in-app dialog, since React Native's Alert
 * buttons don't work on web) and delete account, which opens the secure
 * three-step flow in app/delete-account.tsx.
 */
export function AccountActions() {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doLogout = async () => {
    setBusy(true);
    setError(null);
    try {
      await logout();
      setConfirming(false);
    } catch {
      setConfirming(false);
      setError("We couldn't log you out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsGroup title="Account actions" footer={error ?? undefined} footerTone="error">
        <SettingsRow icon="log-out-outline" label="Log out" destructive onPress={() => setConfirming(true)} />
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          sublabel="Permanently remove your account and data"
          destructive
          onPress={() => router.push("/delete-account" as any)}
        />
      </SettingsGroup>
      <ChatConfirmDialog
        visible={confirming}
        title="Log out of Eventis?"
        description="You'll need to sign in again to see your tickets and bookings."
        confirmLabel="Log out"
        destructive
        busy={busy}
        onConfirm={() => void doLogout()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
