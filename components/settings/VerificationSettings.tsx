import React from "react";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import type { User } from "@/context/AuthContext";
import type { BusinessVerificationStatus } from "@/services/profileService";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

const BUSINESS_STATUS: Record<BusinessVerificationStatus, { text: string; tone: "success" | "warning" | "destructive" | "mutedForeground"; sublabel: string }> = {
  verified: { text: "Verified", tone: "success", sublabel: "You can publish paid events." },
  pending: { text: "In review", tone: "warning", sublabel: "We're checking your documents." },
  rejected: { text: "Declined", tone: "destructive", sublabel: "Update your details and submit again." },
  unverified: { text: "Not verified", tone: "mutedForeground", sublabel: "Needed before you sell paid tickets." },
};

/**
 * Group 5: phone verification for everyone, business verification for businesses.
 * TEMPORARY: these rows show status only; the verification flows arrive in subtask 8.
 */
export function VerificationSettings({
  user,
  capabilities,
  businessStatus,
}: {
  user: User;
  capabilities: AccountCapabilities;
  businessStatus?: BusinessVerificationStatus;
}) {
  const business = BUSINESS_STATUS[businessStatus ?? "unverified"];
  return (
    <SettingsGroup title="Verification">
      <SettingsRow
        icon="phone-portrait-outline"
        label="Phone number"
        sublabel={
          user.phone
            ? `${user.phone}${user.isPhoneVerified ? "" : " · needed for chat and paid bookings"}`
            : "Add a phone number in Edit profile"
        }
        badge={user.isPhoneVerified ? { text: "Verified", tone: "success" } : { text: "Not verified", tone: "warning" }}
      />
      {capabilities.settings.businessVerification ? (
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Business verification"
          sublabel={business.sublabel}
          badge={{ text: business.text, tone: business.tone }}
        />
      ) : null}
    </SettingsGroup>
  );
}
