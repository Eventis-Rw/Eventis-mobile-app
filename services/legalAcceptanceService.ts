import { EVENTIS_LEGAL_VERSION } from "@/constants/legal";
import { api, getToken } from "@/utils/apiClient";

/**
 * Records on the server that the signed-in user accepted the current Eventis
 * Terms of Service and Privacy Policy. The API stamps the acceptance time.
 *
 * INTEGRATION POINT: PATCH /api/v1/users/me { termsVersion }
 *
 * Best effort: sign-up has already succeeded when this runs, so a failure is
 * logged rather than shown. Demo sessions have no server account and are skipped.
 */
export async function recordEventisTermsAcceptance(): Promise<void> {
  const token = await getToken();
  if (!token || token.startsWith("demo_token_")) return;
  try {
    await api.patch("/api/v1/users/me", { termsVersion: EVENTIS_LEGAL_VERSION });
  } catch (error) {
    console.warn("Could not record terms acceptance", error);
  }
}
