/**
 * FindLove Terms, Community Guidelines and Privacy Notice.
 * They add to the general Eventis documents (constants/legal.ts); they don't replace them.
 *
 * Text source: doc/legal-final/08–10 (generated into legalContent.generated.ts).
 * DRAFT pending legal review; open decisions are listed in doc/legal-final/00-shared-details.md
 * (ID photo retention, membership refund rule, erasure after account deletion,
 * in-app report/block for FindLove chats).
 * Bump FINDLOVE_LEGAL_VERSION whenever the wording changes in a way users must re-accept.
 */
import { LEGAL_CONTENT } from "@/constants/legalContent.generated";

export const FINDLOVE_LEGAL_VERSION = "2026-11-27-draft";
export const FINDLOVE_SUPPORT_EMAIL = "support@eventis.today";

export const FINDLOVE_TERMS = LEGAL_CONTENT.findloveTerms;
export const FINDLOVE_COMMUNITY_GUIDELINES = LEGAL_CONTENT.findloveGuidelines;
export const FINDLOVE_PRIVACY_NOTICE = LEGAL_CONTENT.findlovePrivacy;

export const FINDLOVE_LEGAL_DOCUMENTS = {
  terms: FINDLOVE_TERMS,
  guidelines: FINDLOVE_COMMUNITY_GUIDELINES,
  privacy: FINDLOVE_PRIVACY_NOTICE,
} as const;
export type FindLoveLegalKey = keyof typeof FINDLOVE_LEGAL_DOCUMENTS;
