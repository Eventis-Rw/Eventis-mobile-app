import { useRouter } from "expo-router";
import React, { useState } from "react";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { useAuth } from "@/context/AuthContext";

/**
 * Group 7: sign out and delete account. Both confirm in an in-app dialog
 * (React Native's Alert buttons don't work on web).
 * TEMPORARY: delete gets OTP re-authentication and type-to-confirm in subtask 9.
 */
export function AccountActions() {
  const router = useRouter();
  const { logout, deleteAccount } = useAuth();
  const [confirm, setConfirm] = useState<"logout" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      if (confirm === "logout") await logout();
      else await deleteAccount();
      setConfirm(null);
      router.replace("/onboarding" as any);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsGroup title="Account actions">
        <SettingsRow icon="log-out-outline" label="Log out" destructive onPress={() => setConfirm("logout")} />
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          sublabel="Permanently remove your account and data"
          destructive
          onPress={() => setConfirm("delete")}
        />
      </SettingsGroup>
      <ChatConfirmDialog
        visible={!!confirm}
        title={confirm === "delete" ? "Delete your account?" : "Log out of Eventis?"}
        description={
          confirm === "delete"
            ? "Your profile, bookings and saved items will be removed. This can't be undone."
            : "You'll need to sign in again to see your tickets and bookings."
        }
        confirmLabel={confirm === "delete" ? "Delete account" : "Log out"}
        destructive
        busy={busy}
        onConfirm={() => void run()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
