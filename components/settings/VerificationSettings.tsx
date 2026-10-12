import { useRouter } from "expo-router";
import React from "react";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import type { User } from "@/context/AuthContext";
import type { BusinessVerificationStatus } from "@/services/profileService";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

const BUSINESS_STATUS: Record<BusinessVerificationStatus, { text: string; tone: "success" | "warning" | "destructive" | "mutedForeground"; sublabel: string }> = {
  verified: { text: "Verified", tone: "success", sublabel: "You can publish paid events." },
  pending: { text: "In review", tone: "warning", sublabel: "We're checking your documents." },
  rejected: { text: "Declined", tone: "destructive", sublabel: "See what to fix and submit again." },
  unverified: { text: "Not verified", tone: "mutedForeground", sublabel: "Needed before you sell paid tickets." },
};

/** Group 5: phone verification for everyone, business verification for businesses. */
export function VerificationSettings({
  user,
  capabilities,
  businessStatus,
}: {
  user: User;
  capabilities: AccountCapabilities;
  businessStatus?: BusinessVerificationStatus;
}) {
  const router = useRouter();
  const business = BUSINESS_STATUS[businessStatus ?? "unverified"];
  const verifyPhone = () => router.push({ pathname: "/verify-phone", params: { purpose: "settings" } } as any);

  return (
    <SettingsGroup
      title="Verification"
      footer={user.isPhoneVerified ? "To verify a different number, change it in Edit profile first." : undefined}
    >
      <SettingsRow
        icon="phone-portrait-outline"
        label="Phone number"
        sublabel={
          user.isPhoneVerified
            ? user.phone
            : user.phone
              ? `${user.phone} · verify to chat and book paid events`
              : "Add and verify a number to chat and book paid events"
        }
        badge={user.isPhoneVerified ? { text: "Verified", tone: "success" } : { text: "Verify", tone: "primary" }}
        onPress={user.isPhoneVerified ? undefined : verifyPhone}
      />
      {capabilities.settings.businessVerification ? (
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Business verification"
          sublabel={business.sublabel}
          badge={{ text: business.text, tone: business.tone }}
          onPress={() => router.push("/business/verification" as any)}
        />
      ) : null}
    </SettingsGroup>
  );
}
