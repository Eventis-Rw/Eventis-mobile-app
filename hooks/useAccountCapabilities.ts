import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccountType, useAuth } from "@/context/AuthContext";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import {
  describeProfileError,
  fetchBusinessVerification,
  PROFILE_FEATURES,
  type BusinessVerification,
} from "@/services/profileService";
import { getAccountCapabilities } from "@/utils/accountCapabilities";

/**
 * Account capabilities for the signed-in user, plus the business verification
 * record they depend on. Loads verification only for business accounts.
 */
export function useAccountCapabilities() {
  const { user } = useAuth();
  const { hasOrganiserAccess } = useOrganiserAccess();
  const accountType = getAccountType(user);
  const organisationId = accountType === "business" ? user?.organisation?.id : undefined;
  const userId = user?.id;
  const isPhoneVerified = !!user?.isPhoneVerified;

  const [verification, setVerification] = useState<BusinessVerification | undefined>();
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const loadVerification = useCallback(async () => {
    if (!userId || !organisationId || !PROFILE_FEATURES.businessVerification) {
      setVerification(undefined);
      return;
    }
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      setVerification(await fetchBusinessVerification(userId, organisationId, isPhoneVerified));
    } catch (error) {
      setVerificationError(describeProfileError(error, "We couldn't load your verification status."));
    } finally {
      setVerificationLoading(false);
    }
  }, [userId, organisationId, isPhoneVerified]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  // The organisation record may carry a status from the API; the dedicated
  // verification endpoint is more detailed and wins once loaded.
  const businessVerification = verification?.status ?? user?.organisation?.verificationStatus;

  const capabilities = useMemo(
    () =>
      getAccountCapabilities({
        accountType,
        hasOrganiserAccess,
        isPhoneVerified,
        businessVerification,
      }),
    [accountType, hasOrganiserAccess, isPhoneVerified, businessVerification],
  );

  return {
    ...capabilities,
    verification,
    businessVerification,
    verificationLoading,
    verificationError,
    refreshVerification: loadVerification,
    /** Lets the verification screen push a fresh record without refetching. */
    setVerification,
  };
}
