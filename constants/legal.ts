/**
 * Terms of Service and Privacy Policy shown at sign-up and in Help & Support.
 * One source so both places always match.
 *
 * DRAFT: the wording came from the original sign-up screen plus the payment
 * and verification rules in docs/Eventis_Customer_and_Business_Journey.pdf.
 * It needs legal review before release.
 */
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  intro:
    "Welcome to Eventis. These terms govern access to the Eventis mobile application and services. By creating an account, you agree to use Eventis for lawful event discovery, ticketing and community interaction.",
  sections: [
    {
      heading: "Your account",
      paragraphs: [
        "You are responsible for the accuracy of your account information and for keeping your sign-in secure.",
        "Some actions need extra verification: booking a paid event and using chat need a verified phone number, and publishing paid events needs a verified business.",
      ],
    },
    {
      heading: "Using Eventis",
      paragraphs: [
        "You may not misuse the platform, impersonate others, post deceptive or harmful content, or attempt unauthorised access to other users' content or accounts.",
        "Eventis is not a marketplace for regulated or illegal activity. Behaviour that violates safety, community standards or local law may lead to suspension or account restriction.",
      ],
    },
    {
      heading: "Paid events and payments",
      paragraphs: [
        "Eventis does not process payments for paid events. Customers are sent to the organiser's official website to pay.",
        "The organiser is responsible for payments, refunds, ticket processing and financial compliance for their events.",
      ],
    },
    {
      heading: "Organisers",
      paragraphs: [
        "Organisers must give accurate event information. Businesses that sell tickets must complete verification, including registration documents, legal name, tax identification and a payment website.",
        "Home page placements and promotions are paid and reviewed by Eventis before they go live.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: ["Eventis may update, suspend or remove features at any time to maintain platform integrity."],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  intro:
    "Eventis collects the information needed to create and secure your account, support event discovery and improve the experience.",
  sections: [
    {
      heading: "What we collect",
      paragraphs: [
        "Your username, contact details, saved preferences, and activity related to bookings or app usage. Businesses also provide registration and tax details for verification.",
      ],
    },
    {
      heading: "How we use it",
      paragraphs: [
        "To provide account access, personalise recommendations, support your bookings and send important service updates. You choose which notifications you receive in Settings.",
      ],
    },
    {
      heading: "Sharing",
      paragraphs: [
        "We do not sell your personal data. We share information only where needed to deliver the service (for example, so an organiser can check you in), for legal compliance, or for platform safety.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can access, correct or delete your personal information. You can delete your account at any time from Settings. We keep some records where required for legal, security and service obligations.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = { terms: TERMS_OF_SERVICE, privacy: PRIVACY_POLICY } as const;
export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
