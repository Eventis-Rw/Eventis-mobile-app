/**
 * Eventis legal documents shown at sign-up, in Help & Support and in About.
 *
 * The text comes from the team lead's documents as finalised in doc/legal-final
 * (operator: Travelis Rwanda Ltd). It is generated into legalContent.generated.ts;
 * edit the Markdown there and run `npm run build:app` in doc/legal-final/tools.
 *
 * DRAFT: still pending legal review and the lead's answers (effective date,
 * registration year, emails, feature name, refund rules). Every screen shows
 * LEGAL_DRAFT_NOTICE until LEGAL_IS_DRAFT becomes false.
 */
import { LEGAL_CONTENT } from "@/constants/legalContent.generated";

export type { LegalBlock, LegalDocument, LegalSection } from "@/constants/legalContent.generated";
export { LEGAL_DRAFT_NOTICE, LEGAL_IS_DRAFT } from "@/constants/legalContent.generated";

/**
 * Sent to the API when a user accepts these documents at sign-up (max 20 chars).
 * Bump it whenever the wording changes in a way users must re-accept.
 */
export const EVENTIS_LEGAL_VERSION = "2026-11-27-draft";

export const TERMS_OF_SERVICE = LEGAL_CONTENT.terms;
export const PRIVACY_POLICY = LEGAL_CONTENT.privacy;

/** Opened by `/legal/<key>`. */
export const LEGAL_DOCUMENTS = {
  terms: LEGAL_CONTENT.terms,
  privacy: LEGAL_CONTENT.privacy,
  cookies: LEGAL_CONTENT.cookies,
  refunds: LEGAL_CONTENT.refunds,
  guidelines: LEGAL_CONTENT.guidelines,
  organiser: LEGAL_CONTENT.organiser,
} as const;
export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;

export const TERMS_URL = "https://www.eventis.today/terms";
export const PRIVACY_POLICY_URL = "https://www.eventis.today/privacy-policy";
