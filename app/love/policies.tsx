import { useRouter } from "expo-router";
import React from "react";

import { LoveScreenShell } from "@/components/love/LoveScreenShell";
import { LegalDocumentView } from "@/components/support/LegalDocumentView";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/constants/legal";

/** Terms of Service and Privacy Policy, reached from Account safety. */
export default function LovePoliciesScreen() {
  const router = useRouter();

  return (
    <LoveScreenShell title="App policies" onBack={() => router.back()}>
      <LegalDocumentView document={TERMS_OF_SERVICE} />
      <LegalDocumentView document={PRIVACY_POLICY} />
    </LoveScreenShell>
  );
}
