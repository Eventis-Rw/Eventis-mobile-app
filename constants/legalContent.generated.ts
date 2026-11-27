/* eslint-disable */
// GENERATED FILE: do not edit by hand.
// Source: doc/legal-final/*.md, built by doc/legal-final/tools/build-app-content.js (npm run build:app).
// These are DRAFTS pending legal review; the UI must show LEGAL_DRAFT_NOTICE with them.

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

/** Inline text may contain **bold** spans and line breaks. */
export interface LegalDocument {
  title: string;
  subtitle: string;
  preamble: LegalBlock[];
  sections: LegalSection[];
}

export const LEGAL_IS_DRAFT = true;
export const LEGAL_DRAFT_NOTICE =
  "Draft, pending legal review. This text may change before it becomes final.";

export type LegalContentKey = "terms" | "privacy" | "cookies" | "refunds" | "guidelines" | "organiser" | "findloveTerms" | "findloveGuidelines" | "findlovePrivacy";

export const LEGAL_CONTENT: Record<LegalContentKey, LegalDocument> = {
  "terms": {
    "title": "Terms and Conditions",
    "subtitle": "Rules for accounts, public posts, promotions, advertising, events, payments and connections",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      }
    ],
    "sections": [
      {
        "heading": "Platform scope: open promotional marketplace",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis is an open public marketplace and digital billboard for discovering and publishing lawful promotional content. It is not limited to events. Subject to these Terms, individuals and organisations may publish event announcements, products, services, advertisements, offers, business promotions, community notices and other promotional posts aimed at the general public."
          },
          {
            "type": "p",
            "text": "A person or organisation that publishes content is a \"Publisher\". Publishers may include event organisers, businesses, advertisers, service providers, individuals and organisations. A Publisher is responsible for the accuracy, legality, permissions, availability and fulfilment of its own offer, product, service or event. Unless a separate written agreement expressly says otherwise, Eventis provides the platform and promotional tools and is not the seller, supplier, advertiser, event organiser or contracting party for a Publisher's offer."
          },
          {
            "type": "p",
            "text": "Eventis may offer free or paid listings, featured placement, advertising, boosted posts, audience targeting, analytics or other promotional services. Any applicable price, duration, placement conditions, targeting options and cancellation terms will be shown in the relevant order or service terms. Visibility, reach, engagement, sales or attendance are not guaranteed."
          },
          {
            "type": "p",
            "text": "The event ticketing and payment provisions in these Terms apply only where an event listing or transaction involves tickets, reservations or event-related payments. Purchases of products or services promoted by a Publisher are generally arranged directly between the Publisher and the customer unless the checkout expressly states that Eventis or a payment partner is providing a transaction or collection service."
          }
        ]
      },
      {
        "heading": "1. Agreement and eligibility",
        "blocks": [
          {
            "type": "p",
            "text": "These Terms and Conditions (\"Terms\") govern access to Eventis websites, apps and services. By creating an account or using Eventis, you agree to these Terms and the policies linked from them: the Privacy Policy, Cookies Policy, Cancellation and Refund Policy and Community Guidelines. Publishers who list events or promotions also agree to the Publisher, Advertiser and Event Organiser Agreement. If you do not agree, do not use the service."
          },
          {
            "type": "p",
            "text": "You must be at least 18 years old to create an Eventis account or use Eventis. FindLove is strictly for adults."
          }
        ]
      },
      {
        "heading": "2. What Eventis provides",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis provides tools for discovering and promoting events; publishing event listings; booking and, where available, paying for tickets; communicating with other users; posting content; using FindLove; and displaying advertising. Features may vary by country, device, account type or release."
          },
          {
            "type": "p",
            "text": "Eventis is generally a platform, not the organiser, venue, performer, dating partner, payment institution or guarantor of a user's identity. Unless Eventis expressly states otherwise for a particular event or service, the event organiser is responsible for delivering the event and meeting its legal, safety, permit, refund and consumer obligations. Nothing in these Terms removes rights that cannot legally be excluded."
          }
        ]
      },
      {
        "heading": "3. Accounts and security",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Provide accurate, current information and update it when it changes.",
              "Keep your password, device and verification codes secure. You must not share one-time passwords, PINs or payment credentials with anyone claiming to be Eventis support.",
              "You are responsible for activity on your account except where applicable law provides otherwise. Notify us promptly of suspected compromise.",
              "Do not impersonate another person, create deceptive accounts, evade a suspension, or use someone else's identity documents without lawful authority.",
              "We may request proportionate verification for safety, organiser onboarding, payments, fraud prevention or legal compliance. Access may be limited if required verification is not completed."
            ]
          }
        ]
      },
      {
        "heading": "4. Event listings and organisers",
        "blocks": [
          {
            "type": "p",
            "text": "Organisers must provide accurate event names, descriptions, dates, times, venue/location, age limits, accessibility information, capacity, prices, fees, ticket conditions, cancellation rules, organiser contact details and any material restrictions. Organisers must have the rights and permits necessary to hold the event and to use any names, logos, photos, music or other content they submit."
          },
          {
            "type": "p",
            "text": "Organisers must not publish fake, misleading, unlawful, discriminatory or unsafe events, misrepresent ticket availability, sell tickets they cannot honour, manipulate attendance or reviews, or collect attendee information for unrelated purposes. Organisers are responsible for the event, venue, staffing, licences, insurance where required, health and safety, and communicating changes to attendees."
          },
          {
            "type": "p",
            "text": "Organiser onboarding may require business identity, authorised representative, contact, tax, bank or mobile money payout details, merchant codes, permits or other verification. Organisers must provide accurate information and promptly notify Eventis of changes. They must not submit payment PINs or one-time passwords."
          }
        ]
      },
      {
        "heading": "5. Tickets, bookings and attendance",
        "blocks": [
          {
            "type": "p",
            "text": "A booking is subject to availability and the event-specific terms shown before purchase. A booking confirmation or valid ticket may be required for entry. Users must not copy, resell, alter, counterfeit or fraudulently transfer tickets. Eventis or the organiser may verify ticket validity and attendance. The organiser controls admission subject to applicable law and the terms disclosed to attendees."
          },
          {
            "type": "p",
            "text": "Review event details, age restrictions, location, date, start time, entry requirements and refund terms before paying. Eventis cannot guarantee that an event will meet every attendee's personal expectations."
          }
        ]
      },
      {
        "heading": "6. Prices, payments, commissions and payouts",
        "blocks": [
          {
            "type": "p",
            "text": "Prices, taxes, service charges, payment processing fees and currency will be displayed before checkout to the extent required by law and technically possible. Payment transactions may be handled by third-party payment providers under their terms. Eventis does not ask for or need a user's mobile money PIN or one-time password."
          },
          {
            "type": "p",
            "text": "For organisers, Eventis may deduct a disclosed platform commission and other clearly disclosed fees from transactions or payouts. The rate, calculation base, taxes, payout currency, settlement timetable, reserves, chargeback allocation and any minimum payout threshold will be stated in the Publisher, Advertiser and Event Organiser Agreement or the organiser dashboard before the organiser accepts paid bookings."
          },
          {
            "type": "p",
            "text": "Payment providers may reject, reverse, delay or investigate transactions under their rules or applicable law. Eventis may hold or delay a payout when reasonably necessary to investigate fraud, a dispute, chargeback, legal restriction or incorrect payout details, and will handle the matter according to applicable law and the organiser agreement."
          }
        ]
      },
      {
        "heading": "7. Cancellations and refunds",
        "blocks": [
          {
            "type": "p",
            "text": "The Cancellation and Refund Policy and the event-specific terms apply. The event page and checkout will show who is responsible for delivering the event, the applicable cancellation rules, whether any fee is non-refundable where legally permitted, and how to request assistance. Nothing in Eventis policy limits mandatory statutory consumer rights."
          }
        ]
      },
      {
        "heading": "8. Messaging, calls and FindLove",
        "blocks": [
          {
            "type": "p",
            "text": "Users must communicate lawfully and respectfully. Do not harass, threaten, stalk, impersonate, sexually exploit, blackmail, scam, or send unwanted sexual content. Do not use FindLove to misrepresent identity, pressure others, solicit money fraudulently, or bypass a block. A match, message, call or profile does not constitute verification of a person's identity or safety."
          },
          {
            "type": "p",
            "text": "Use the privacy settings available to control profile visibility. Public/private settings operate as described in the app; private settings cannot prevent a recipient from capturing or redistributing information. Do not record or distribute calls or private communications without lawful authority and any consent required by law."
          }
        ]
      },
      {
        "heading": "9. User content and licence",
        "blocks": [
          {
            "type": "p",
            "text": "You retain ownership of content you create, to the extent you own it. You grant Eventis a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, adapt for technical formatting, display and distribute your content as necessary to operate, secure, moderate and promote the services in accordance with your settings and these Terms. For public event listings and public posts, this may include displaying content to the public and promoting the listing within Eventis. The licence ends when content is deleted or your account closes, except for limited copies retained for legal, security, backup or dispute purposes and content already shared by others, as permitted by law."
          },
          {
            "type": "p",
            "text": "You warrant that you have the rights and permissions required to upload content and that it does not violate law or another person's rights. Do not upload another person's identity document, private image, voice recording or personal data without a lawful basis and required permission."
          }
        ]
      },
      {
        "heading": "10. Intellectual property",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis and its software, branding, design and platform materials are owned by or licensed to the Company and protected by applicable intellectual property laws. Except as allowed by law or with written permission, you may not copy, reverse engineer, scrape, resell or exploit the service, interfere with its operation, or use Eventis branding in a misleading way."
          }
        ]
      },
      {
        "heading": "11. Advertising",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis may display paid advertisements, sponsored event listings or promotional content. Advertisers must ensure that advertisements are lawful, accurate, properly authorised and clearly identifiable as advertising where required. Eventis may reject, remove or limit advertising that is deceptive, unsafe, unlawful or inconsistent with platform policies. Advertising performance, placement and reach are not guaranteed unless expressly agreed in writing."
          }
        ]
      },
      {
        "heading": "12. Prohibited use",
        "blocks": [
          {
            "type": "p",
            "text": "You must not use Eventis for:"
          },
          {
            "type": "list",
            "items": [
              "Fraud, theft, money laundering, scams, phishing, fake tickets or fake events.",
              "Threats, hate-based abuse, harassment, stalking, doxxing, non-consensual intimate imagery, sexual exploitation or grooming.",
              "Content that infringes copyright, trademarks, privacy, publicity or other rights.",
              "Malware, unauthorised access, scraping, manipulation of metrics, spam or platform interference.",
              "Unlawful discrimination, incitement to violence, illegal goods or services, or content that violates applicable law.",
              "Misuse of personal information, identity documents, attendee lists, payment details or contact data.",
              "Circumventing age restrictions, safety controls, payment controls, bans or moderation measures."
            ]
          }
        ]
      },
      {
        "heading": "13. Moderation, suspension and termination",
        "blocks": [
          {
            "type": "p",
            "text": "We may review reports and use reasonable moderation processes, including automated tools where disclosed, to protect users and comply with law. We may remove content, limit features, suspend or terminate accounts, cancel or restrict listings, or preserve relevant information where reasonably necessary for safety, fraud prevention, policy enforcement or legal compliance. Where appropriate and legally permitted, we will provide notice and an appeal route as described in the Community Guidelines. We may act without advance notice where needed to address imminent harm, fraud or legal requirements."
          }
        ]
      },
      {
        "heading": "14. Third-party services and links",
        "blocks": [
          {
            "type": "p",
            "text": "Payments, maps, analytics, messaging, calls, hosting and other services may be provided by third parties. Their terms may apply. Eventis is not responsible for third-party services outside its control, subject to mandatory law."
          }
        ]
      },
      {
        "heading": "15. Disclaimers and liability",
        "blocks": [
          {
            "type": "p",
            "text": "To the extent permitted by applicable law, Eventis is provided on an \"as available\" basis, and we do not guarantee uninterrupted access, error-free operation, the conduct of users, the accuracy of every user-submitted listing, or the performance of an event organiser. We are not responsible for disputes between users or between attendees and organisers except to the extent our own obligations under law or an applicable agreement require otherwise."
          },
          {
            "type": "p",
            "text": "Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited, including any mandatory consumer rights, liability for fraud, or other non-excludable liability."
          }
        ]
      },
      {
        "heading": "16. Indemnity and disputes",
        "blocks": [
          {
            "type": "p",
            "text": "To the extent permitted by law, users may be responsible for losses reasonably arising from their unlawful conduct, breach of these Terms or infringement of another person's rights."
          },
          {
            "type": "p",
            "text": "Please raise any dispute with us first at support@eventis.today so we can try to resolve it informally. These Terms are governed by the laws of the Republic of Rwanda. If a dispute is not resolved informally, it may be referred to the competent courts of Kigali, Rwanda. This does not remove any mandatory consumer right or dispute route available to you under applicable law."
          }
        ]
      },
      {
        "heading": "17. Changes and contact",
        "blocks": [
          {
            "type": "p",
            "text": "We may update these Terms and will provide notice of material changes where required. If a change requires your consent, we will ask for it. The effective date appears at the top of the current version."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Support:** support@eventis.today\n**Legal notices:** legal@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "privacy": {
    "title": "Privacy Policy",
    "subtitle": "How Eventis collects, uses, shares and protects information across its public promotional marketplace",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      }
    ],
    "sections": [
      {
        "heading": "Platform scope: events, promotions and public advertising",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis is a public-facing promotional marketplace and digital billboard, not a service limited to events. Individuals, businesses, organisations, creators and other permitted publishers may post event announcements, products and services, offers, advertisements, business promotions, community notices and other lawful promotional content intended for the general public."
          },
          {
            "type": "p",
            "text": "To operate these features, Eventis may process account and profile details, publisher and listing information, content, interactions, approximate or precise location where enabled, device and usage information, and information used to measure the performance of listings or promotions. Where personalised or targeted promotion is offered, the relevant information and available choices are explained in the app and in this policy."
          },
          {
            "type": "p",
            "text": "A publisher is responsible for ensuring that it has a lawful basis and any required permissions to submit personal information about other people in a post, image, video, testimonial or contact list. Eventis may review, moderate, rank, recommend, promote, restrict or remove content under its Terms and Conditions and Community Guidelines."
          }
        ]
      },
      {
        "heading": "1. About this policy",
        "blocks": [
          {
            "type": "p",
            "text": "This Privacy Policy explains how Eventis collects, uses, stores, discloses and protects information when you use our website, mobile applications and related services. Eventis helps people discover events, book or pay for attendance, communicate with others, publish content, connect socially or romantically through FindLove, and enables organisers and advertisers to promote events or services."
          },
          {
            "type": "p",
            "text": "Travelis Rwanda Ltd is the operator of Eventis and the data controller for the personal data it determines how and why to process."
          }
        ]
      },
      {
        "heading": "2. Who this policy applies to",
        "blocks": [
          {
            "type": "p",
            "text": "This policy applies to attendees, account holders, event organisers, advertisers, creators, people using messaging or calling features, and people using FindLove. It also applies to information received from service providers or other permitted sources. Third-party websites, payment services and other external platforms may have separate privacy policies."
          }
        ]
      },
      {
        "heading": "3. Information we may collect",
        "blocks": [
          {
            "type": "subheading",
            "text": "3.1 Account and contact information"
          },
          {
            "type": "list",
            "items": [
              "Name, username, date of birth or age confirmation, email address and phone number.",
              "Profile photograph, biography, preferences, language, city or general location, and account settings.",
              "Login credentials or authentication information, stored using appropriate security controls rather than in readable form where technically feasible."
            ]
          },
          {
            "type": "subheading",
            "text": "3.2 Identity and organiser verification"
          },
          {
            "type": "p",
            "text": "Where reasonably necessary for account integrity, organiser onboarding, fraud prevention, payment compliance or legal obligations, we may request identity or business verification information. Depending on the role and applicable requirements, this may include national identity card or passport details and images, business registration information, authorised representative details, address, event permits or licences, and supporting documents. We will explain the purpose and required fields when collecting these documents."
          },
          {
            "type": "subheading",
            "text": "3.3 Event and transaction information"
          },
          {
            "type": "list",
            "items": [
              "Events viewed, saved, shared or attended; bookings, ticket identifiers, check-in status, purchase history, refunds and customer support records.",
              "Payment status, transaction references, amount, currency, fees, payout records and limited payment-method details returned by payment providers.",
              "Organiser-provided mobile money number, mobile money merchant/code details, bank or payout details, and related verification information needed to receive settlement or pay applicable commissions."
            ]
          },
          {
            "type": "p",
            "text": "We do not intend to store full payment-card credentials or mobile money PINs. Payment credentials are handled by authorised payment providers. Eventis will never ask users to disclose PINs or one-time passwords to Eventis staff."
          },
          {
            "type": "subheading",
            "text": "3.4 Messaging, calls and social content"
          },
          {
            "type": "p",
            "text": "If you use chat, voice messages, audio/video calls, group chats, invitations, posts, comments or uploads, we may process the content you submit and the related information needed to deliver the feature. This may include sender/recipient identifiers, timestamps, delivery status, reports, moderation records, call connection metadata and files you upload."
          },
          {
            "type": "subheading",
            "text": "3.5 FindLove information"
          },
          {
            "type": "p",
            "text": "If you use FindLove, we may process your profile, photos, preferences, interests, visibility settings, likes, matches, messages and blocking/reporting choices. Information shared in a public profile is visible to the audience described in the feature. Private mode limits discovery according to the settings shown, but it cannot prevent a recipient from taking screenshots, copying information, or sharing it outside the app."
          },
          {
            "type": "subheading",
            "text": "3.6 Device, usage and location data"
          },
          {
            "type": "list",
            "items": [
              "Device type, operating system, app version, IP address, language, identifiers, crash logs and security events.",
              "App interactions, search terms, feature usage, referral information, and diagnostic/analytics data.",
              "Approximate or precise location only when enabled or otherwise lawfully available and necessary for a stated feature, such as finding nearby events. You can control device location permissions; some features may not work without them."
            ]
          },
          {
            "type": "subheading",
            "text": "3.7 Information from other sources"
          },
          {
            "type": "p",
            "text": "We may receive limited information from payment providers, verification services, event organisers, advertising or analytics partners, public sources, and users who report an account or piece of content. We use such information only for compatible purposes and as permitted by law."
          }
        ]
      },
      {
        "heading": "4. Why we use information",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Create and manage accounts, authenticate users and provide platform features.",
              "List, search, promote and recommend events; manage bookings, tickets, check-ins, payments, refunds, payouts and organiser commissions.",
              "Deliver messaging, invitations, voice/video calling, social posting, and FindLove features according to user settings.",
              "Verify organisers and, where justified, users; detect fake events, fraud, impersonation, abuse, payment disputes and security threats.",
              "Respond to support requests, investigate reports, enforce policies and protect users and the platform.",
              "Provide advertising, measure campaign performance, limit invalid traffic and personalise content or advertisements where permitted and subject to required choices.",
              "Maintain, troubleshoot and improve our services, conduct analytics, test features and protect reliability.",
              "Meet legal, tax, accounting, consumer-protection, payment, regulatory and lawful government requirements.",
              "Send service notices, security alerts, purchase confirmations and policy updates; send marketing communications where permitted, with an unsubscribe or opt-out mechanism."
            ]
          }
        ]
      },
      {
        "heading": "5. Legal grounds for processing",
        "blocks": [
          {
            "type": "p",
            "text": "Where applicable law requires a legal basis, we may rely on taking steps to provide a requested service or perform a contract; compliance with legal obligations; consent for optional features or communications where required; and legitimate interests such as platform security, fraud prevention, service improvement and defending legal claims, balanced against your rights. The basis may vary by data type, purpose and jurisdiction. You may withdraw consent where processing is based on consent, without affecting processing that occurred before withdrawal."
          }
        ]
      },
      {
        "heading": "6. When we share information",
        "blocks": [
          {
            "type": "p",
            "text": "We do not sell personal information. We may disclose information as reasonably necessary in the following circumstances:"
          },
          {
            "type": "list",
            "items": [
              "With event organisers and their authorised staff to manage attendance, verify tickets, contact attendees about the event, and provide the purchased service. We share only the information they need, and we explain any attendee-list sharing before checkout where appropriate.",
              "With other users according to the audience and privacy settings you choose, including public posts, profile details, messages, calls, matches and invitations.",
              "With payment processors, mobile money operators, banks, identity/business verification providers, hosting providers, messaging/calling providers, analytics services, customer-support vendors and security providers.",
              "With advertising partners to deliver or measure campaigns, subject to applicable law, notice, consent and opt-out requirements. We do not share identity documents, private messages or sensitive dating details for advertising.",
              "With professional advisers, auditors, insurers, regulators, courts or law-enforcement authorities where required or legally permitted.",
              "With a successor or purchaser in a merger, financing, restructuring or asset transfer, subject to appropriate safeguards and applicable law.",
              "At your direction or with your consent, or where needed to protect users, rights, property, security or the integrity of Eventis."
            ]
          },
          {
            "type": "p",
            "text": "We require service providers by contract to use information only to provide their services to us, to protect it, and not to use it for their own unrelated purposes except where permitted by law."
          }
        ]
      },
      {
        "heading": "7. Public and private information",
        "blocks": [
          {
            "type": "p",
            "text": "Information you post publicly may be viewed, copied, indexed or shared by others. Information sent directly to another user is not the same as a public post, but recipients may copy or disclose it. Messages and call information are processed on our systems to deliver the service and may be reviewed where needed to investigate reports, protect users or comply with law. Use blocking and reporting tools and avoid sending financial credentials or identity documents through chat."
          }
        ]
      },
      {
        "heading": "8. Advertising and personalisation",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis may sell advertising placements or promote events and businesses. We may use event category, approximate location, app activity or advertising interaction to select and measure ads where lawful. We will not use identity documents, private messages, call content, or sensitive dating information to target ads unless a lawful basis and any required explicit consent have been established and the practice is clearly disclosed."
          }
        ]
      },
      {
        "heading": "9. International transfers",
        "blocks": [
          {
            "type": "p",
            "text": "Information may be processed in Rwanda or other countries where our providers operate. Before transferring personal data internationally, we will assess and apply the safeguards required by applicable law, including contractual, organisational or other legally recognised measures where appropriate."
          }
        ]
      },
      {
        "heading": "10. Retention",
        "blocks": [
          {
            "type": "p",
            "text": "We retain personal data only for as long as reasonably necessary for the purposes described here, including service delivery, safety, dispute handling, accounting, legal compliance and enforcement. Retention periods depend on the data type and applicable requirements."
          }
        ]
      },
      {
        "heading": "11. Security",
        "blocks": [
          {
            "type": "p",
            "text": "We implement appropriate technical and organisational measures, which may include encryption in transit and at rest where suitable, role-based access controls, authentication, staff confidentiality obligations, secure payment integrations, backups, logging, security testing and incident response. No online service can guarantee absolute security. If a data incident occurs, we will assess it and notify affected people and authorities where required by applicable law."
          }
        ]
      },
      {
        "heading": "12. Your rights and choices",
        "blocks": [
          {
            "type": "p",
            "text": "Subject to applicable law and any lawful exceptions, you may have rights to request access to your personal data, correction, deletion, restriction, objection, portability, withdrawal of consent, or information about processing. You may also manage profile visibility, location permissions, marketing preferences, blocks and reports in the app settings. We may need to verify your identity before fulfilling a request."
          },
          {
            "type": "p",
            "text": "Applicable privacy requirements include Rwanda Law No. 058/2021 of 13/10/2021 relating to the protection of personal data and privacy and, where applicable, the EU General Data Protection Regulation (GDPR)."
          },
          {
            "type": "p",
            "text": "Send privacy requests to privacy@eventis.today. You also have the right to complain to the relevant data protection authority. In Rwanda, this is the National Cyber Security Authority (NCSA)."
          }
        ]
      },
      {
        "heading": "13. Children and age restrictions",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis accounts are for people aged 18 or older. FindLove and dating features are only for adults aged 18 or older. We do not knowingly allow children to use Eventis. If you believe a child has provided personal information contrary to our age rules, contact us so we can investigate and take appropriate action."
          }
        ]
      },
      {
        "heading": "14. Third-party services",
        "blocks": [
          {
            "type": "p",
            "text": "Links to external sites and services are provided for convenience. Their privacy practices are governed by their own terms. Eventis is not responsible for independent third-party services, except to the extent applicable law provides otherwise."
          }
        ]
      },
      {
        "heading": "15. Changes and contact",
        "blocks": [
          {
            "type": "p",
            "text": "We may update this policy to reflect changes in the platform, business or law. We will provide notice of material changes as required, show the effective date, and ask for fresh consent where legally required. Continued use does not replace consent where consent is legally necessary."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Privacy requests:** privacy@eventis.today\n**Support:** support@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "cookies": {
    "title": "Cookies Policy",
    "subtitle": "Cookies and similar technologies used for platform functions, analytics and promotions",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      }
    ],
    "sections": [
      {
        "heading": "Platform scope: promotional content and advertising",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis is an open public promotional marketplace covering events, products, services, offers, advertisements, business promotions and other lawful posts from individuals and organisations. Cookies and similar technologies may support account functions, remember preferences, measure listing and advertising performance, prevent fraud, and, where enabled and legally permitted, deliver or measure relevant or targeted promotional content."
          }
        ]
      },
      {
        "heading": "1. Purpose",
        "blocks": [
          {
            "type": "p",
            "text": "This Cookies Policy explains how Eventis uses cookies and similar technologies on its website and, where relevant, software development kits (SDKs), local storage, pixels and mobile advertising identifiers in its apps."
          },
          {
            "type": "p",
            "text": "**What we use today.** Eventis currently uses only strictly necessary and preference technologies (for example, keeping you signed in and remembering your settings). We do not currently use third-party analytics or advertising cookies. If that changes, we will update this policy and, where required, ask for your consent first."
          }
        ]
      },
      {
        "heading": "2. What cookies and similar technologies are",
        "blocks": [
          {
            "type": "p",
            "text": "Cookies are small data files stored by a browser. Similar technologies, such as local storage and SDKs, may store preferences, measure activity, support security, or help deliver and measure advertising. First-party technologies are set by Eventis; third-party technologies may be supplied by analytics, payment, video, advertising or other vendors."
          }
        ]
      },
      {
        "heading": "3. Categories",
        "blocks": [
          {
            "type": "subheading",
            "text": "3.1 Strictly necessary"
          },
          {
            "type": "p",
            "text": "These technologies support core functions such as sign-in, session management, security, load balancing, payment flow integrity and remembering privacy choices. They cannot be disabled through our controls without affecting essential functions, but browser or device controls may still affect them."
          },
          {
            "type": "subheading",
            "text": "3.2 Preferences and functionality"
          },
          {
            "type": "p",
            "text": "These technologies remember choices such as language, region or display settings and help provide features you request."
          },
          {
            "type": "subheading",
            "text": "3.3 Analytics and performance"
          },
          {
            "type": "p",
            "text": "These technologies help us understand page visits, feature use, errors and performance so we can improve Eventis. Where required by law, we will obtain consent before placing non-essential analytics technologies."
          },
          {
            "type": "subheading",
            "text": "3.4 Advertising and measurement"
          },
          {
            "type": "p",
            "text": "These technologies may measure ad impressions, limit repeated ads, understand campaign performance or personalise advertisements. We will provide consent and opt-out controls where required by applicable law. We will not describe a technology as anonymous if it can reasonably be linked to an identifiable person."
          }
        ]
      },
      {
        "heading": "4. Third-party technologies",
        "blocks": [
          {
            "type": "p",
            "text": "Third parties may set or access technologies when their services are integrated into Eventis. Examples could include analytics, video/call functionality, maps, payment processing and advertising measurement. When we add a third-party provider of this kind, we will list the provider and its purpose in a cookie preference tool or vendor list. Third-party providers may process information under their own terms and privacy notices."
          }
        ]
      },
      {
        "heading": "5. Consent and controls",
        "blocks": [
          {
            "type": "p",
            "text": "Where required, non-essential cookies and tracking technologies stay off until you make an affirmative choice. You will be able to accept all, reject non-essential technologies, or customise your preferences with comparable ease, and to change your choice later through [to be confirmed]. Browser settings can also block or delete cookies, although essential features may stop working."
          },
          {
            "type": "p",
            "text": "On mobile devices, you may be able to limit advertising identifiers or change app permissions through device settings. Those settings differ by operating system and version."
          }
        ]
      },
      {
        "heading": "6. How long technologies remain",
        "blocks": [
          {
            "type": "p",
            "text": "Session cookies expire when a browser session ends. Persistent cookies and local storage remain for a defined period or until you sign out, clear them in your browser, or uninstall the app."
          }
        ]
      },
      {
        "heading": "7. Changes and contact",
        "blocks": [
          {
            "type": "p",
            "text": "We may update this policy when our technologies or legal obligations change. The effective date appears at the top of the current version."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Privacy and cookies:** privacy@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "refunds": {
    "title": "Cancellation and Refund Policy",
    "subtitle": "How event cancellations and refunds work on Eventis, with separate treatment for other advertised offers",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      },
      {
        "type": "p",
        "text": "This policy applies to events listed on Eventis. Eventis is a marketplace connecting event organisers with the public. The organiser (the \"Organiser\") is ordinarily responsible for the event, ticketing, direct payments and refunds. This policy does not limit rights that cannot be excluded under applicable law."
      }
    ],
    "sections": [
      {
        "heading": "Scope of Eventis's wider promotional marketplace",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis is an open public promotional marketplace and digital billboard. In addition to event announcements, individuals and organisations may post product promotions, service advertisements, offers, business promotions and other lawful promotional content for the general public."
          },
          {
            "type": "p",
            "text": "This policy governs event bookings and event-related cancellation, postponement and refund issues, and, in section 12, fees paid directly to Eventis for its own services. It does not govern purchases of products or services advertised by Publishers. For those transactions, the Publisher is ordinarily responsible for the sale, delivery, returns, cancellations and refunds, and customers should review the Publisher's terms before paying. If a specific checkout expressly states that Eventis or a payment partner provides a collection or transaction service, the applicable checkout and payment terms also apply."
          }
        ]
      },
      {
        "heading": "1. Eventis's role",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis provides a marketplace for discovering and promoting events and connecting customers with Organisers. Unless the listing or checkout expressly states that an Eventis payment collection service is being used, Eventis does not sell or issue tickets, manage ticket inventory, receive or hold ticket funds, or process the customer's payment."
          },
          {
            "type": "p",
            "text": "Payment arrangements can differ by event. Before paying, customers should check the listing and payment instructions to see whether they are paying the Organiser directly or using an Eventis or payment-partner collection service."
          }
        ]
      },
      {
        "heading": "2. Payments made directly to the Organiser",
        "blocks": [
          {
            "type": "p",
            "text": "Where the listing instructs customers to pay the Organiser directly (for example, by bank transfer, mobile money, cash or another method supplied by the Organiser), the payment is between the customer and the Organiser."
          },
          {
            "type": "p",
            "text": "The Organiser is responsible for confirming receipt, issuing tickets or booking confirmations, explaining payment errors, assessing and paying any refund due, and responding to payment disputes. Customers should contact the Organiser using the details on the event listing or payment instructions."
          },
          {
            "type": "p",
            "text": "Eventis does not receive or hold direct payments and cannot itself reverse, trace or refund money paid directly to an Organiser. Eventis may, at its discretion, forward a complaint, request a response or take action regarding a listing or account. Such assistance does not guarantee recovery of funds. Customers should keep receipts, transfer confirmations and communications."
          }
        ]
      },
      {
        "heading": "3. Payments collected through Eventis or a payment partner",
        "blocks": [
          {
            "type": "p",
            "text": "For some events, Eventis may offer a payment collection or facilitation service through its payment platform or third-party payment partners. This applies only where the checkout or transaction terms expressly indicate that the service is enabled."
          },
          {
            "type": "p",
            "text": "Where that service is used, payment and refund processing are subject to the checkout disclosures, applicable provider terms, transaction status and law. Eventis and/or the relevant payment partner may facilitate collection and settlement for the Organiser and may facilitate a refund when one is due. The Organiser remains responsible for the event and, unless law or a separate written agreement says otherwise, for funding refunds arising from cancellation, non-delivery or material changes."
          },
          {
            "type": "p",
            "text": "Refunds may be returned through the original payment method where available. Processing times depend on the payment provider, bank or mobile-money operator and may vary. Eventis cannot guarantee a specific timeframe controlled by a third party. Any collection or processing fees and their refundability are governed by the checkout terms and applicable law."
          }
        ]
      },
      {
        "heading": "4. Customer cancellation or change of plans",
        "blocks": [
          {
            "type": "p",
            "text": "If a customer can no longer attend, the refund or transfer rules disclosed by the Organiser at the time of booking generally apply, subject to applicable law. Some tickets may be non-refundable where lawful and clearly disclosed; others may permit cancellation, transfer or partial refund."
          },
          {
            "type": "p",
            "text": "Customers should contact the Organiser as soon as possible. Eventis does not set each Organiser's ticket terms and cannot promise a refund solely because a customer changes plans. Any separate Eventis fee will be treated according to the fee disclosure at checkout and applicable law."
          }
        ]
      },
      {
        "heading": "5. Event cancelled by the Organiser",
        "blocks": [
          {
            "type": "p",
            "text": "If an event is cancelled, the Organiser must promptly notify customers and Eventis, explain the cancellation and provide information about refunds or alternatives. The Organiser is responsible for meeting refund obligations under its published terms and applicable law."
          },
          {
            "type": "p",
            "text": "For direct payments, the Organiser must arrange any refund directly with the customer. For payments collected through an enabled Eventis or partner collection service, Eventis or the payment partner may facilitate a refund under the applicable terms, subject to available funds, required information and law."
          },
          {
            "type": "p",
            "text": "Customers should keep booking confirmations and proof of payment. If the Organiser does not respond, customers may report the matter to Eventis. Eventis may investigate or take platform action but cannot guarantee recovery of funds paid directly to the Organiser."
          }
        ]
      },
      {
        "heading": "6. Postponed, rescheduled, relocated or materially changed events",
        "blocks": [
          {
            "type": "p",
            "text": "If an event is postponed, rescheduled, relocated or materially changed, the Organiser must notify customers promptly and explain whether existing tickets remain valid, what alternatives are available and how to request any refund that may be due."
          },
          {
            "type": "p",
            "text": "Refunds or transfers are handled under the Organiser's disclosed terms and applicable law. For a payment collected through Eventis or a payment partner, that provider may assist with an eligible refund under the applicable terms. For a direct payment, the Organiser must handle any refund directly."
          }
        ]
      },
      {
        "heading": "7. Event not delivered or listing appears misleading",
        "blocks": [
          {
            "type": "p",
            "text": "If a customer believes an event was not delivered, a ticket was not honoured or a listing was materially misleading, the customer should contact the Organiser and keep evidence such as the listing, ticket, receipt and messages."
          },
          {
            "type": "p",
            "text": "The customer may also report the matter to Eventis. Eventis may review the listing, request information, restrict or remove the listing, or take other action under its platform rules. This does not mean Eventis received the payment or can guarantee a refund, particularly for direct payments."
          }
        ]
      },
      {
        "heading": "8. How to request a refund or report a problem",
        "blocks": [
          {
            "type": "p",
            "text": "**Step 1:** Review the event listing, booking confirmation and refund terms shown when you booked."
          },
          {
            "type": "p",
            "text": "**Step 2:** Contact the Organiser using the contact details on the listing or ticket. Include the event name and date, booking or ticket reference, payment date and amount, and a clear explanation. Do not send passwords, PINs or full payment-card details."
          },
          {
            "type": "p",
            "text": "**Step 3:** If you used an Eventis or payment-partner collection service, follow the checkout or confirmation instructions and contact Eventis at support@eventis.today if needed."
          },
          {
            "type": "p",
            "text": "**Step 4:** If the Organiser does not respond or you suspect fraud, report the matter to Eventis at support@eventis.today. For a direct payment, contact your bank or mobile-money provider promptly to ask whether a dispute or recovery process is available."
          }
        ]
      },
      {
        "heading": "9. Timing, fees and deductions",
        "blocks": [
          {
            "type": "p",
            "text": "Refund timing depends on who received the payment, the payment method, the Organiser's response, any payment-provider investigation and applicable law. Eventis cannot promise a fixed timeframe for direct payments or third-party processing."
          },
          {
            "type": "p",
            "text": "Any cancellation fee, platform fee, payment-processing fee or deduction must have been disclosed and must comply with applicable law. This policy does not permit a deduction or refusal of a refund where prohibited by law."
          }
        ]
      },
      {
        "heading": "10. Fraud prevention",
        "blocks": [
          {
            "type": "p",
            "text": "Be cautious if you are asked to pay an unexpected account, use payment details that do not match the listing, or provide passwords, PINs or one-time verification codes. Verify payment instructions through a reliable Organiser contact channel before sending money."
          },
          {
            "type": "p",
            "text": "Eventis may suspend or remove listings, restrict accounts or cooperate with payment providers or authorities where there are reasonable grounds to suspect fraud, abuse or unlawful conduct. Eventis does not guarantee the conduct or solvency of an Organiser."
          }
        ]
      },
      {
        "heading": "11. Legal rights",
        "blocks": [
          {
            "type": "p",
            "text": "This policy is subject to applicable consumer-protection and other mandatory laws. If any part conflicts with a non-waivable legal right, that right prevails."
          }
        ]
      },
      {
        "heading": "12. Fees paid to Eventis for its own services",
        "blocks": [
          {
            "type": "p",
            "text": "Some Eventis services are paid to Eventis directly, for example FindLove memberships, featured placement, boosted posts or advertising. For these, Eventis is the seller, and the price, duration and any cancellation terms are shown before you pay."
          },
          {
            "type": "p",
            "text": "**Memberships.** Memberships do not renew automatically. Once a paid period has started it is not refunded, except where the law requires a refund or a payment was taken by mistake."
          },
          {
            "type": "p",
            "text": "**Promotions and advertising.** [to be confirmed]"
          },
          {
            "type": "p",
            "text": "To ask about a payment to Eventis, contact support@eventis.today with your account username, the payment date, amount and reference."
          }
        ]
      },
      {
        "heading": "13. Updates and contact",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis may update this policy from time to time and will communicate material changes through the platform or another reasonable channel. The version that applies to a transaction is determined under applicable law and the terms presented at the time of the transaction."
          },
          {
            "type": "p",
            "text": "For event-specific cancellation or refund requests, contact the Organiser directly in the first instance."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Support:** support@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "guidelines": {
    "title": "Community Guidelines",
    "subtitle": "Standards for public posts, advertisements, events, chat, calls and FindLove",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      }
    ],
    "sections": [
      {
        "heading": "What these guidelines cover",
        "blocks": [
          {
            "type": "p",
            "text": "These Guidelines apply to all content and activity on Eventis, not only events. This includes posts and listings for products, services, offers, advertisements, business promotions, community notices and other promotional content published by individuals or organisations, as well as profiles, comments, messages, calls and FindLove."
          },
          {
            "type": "p",
            "text": "Publishers must have the rights and permissions needed to publish their content and must make offers clear, accurate and not misleading. Posts must not promote illegal goods or services, counterfeit products, scams, deceptive claims, impersonation, prohibited discrimination, harassment or other content that violates these Guidelines or applicable law. Paid or sponsored placement must be identified where required by law or Eventis's product rules."
          }
        ]
      },
      {
        "heading": "1. Our community standard",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis should help people discover events, communicate, share creativity and build genuine connections. Everyone using the platform must act lawfully, respectfully and safely. These guidelines apply to profiles, event listings, tickets, posts, comments, direct and group messages, voice notes, audio/video calls, invitations, advertising, and FindLove."
          }
        ]
      },
      {
        "heading": "2. Be respectful",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Do not threaten, harass, bully, stalk, intimidate or repeatedly contact someone who has asked you to stop.",
              "Do not use hate speech, dehumanising slurs, targeted abuse or content that encourages violence against a person or group.",
              "Respect boundaries, consent, blocks, privacy settings and a person's decision not to respond or meet.",
              "Do not impersonate another person, public figure, organiser, business or Eventis employee."
            ]
          }
        ]
      },
      {
        "heading": "3. Dating and FindLove safety",
        "blocks": [
          {
            "type": "list",
            "items": [
              "FindLove is for adults aged 18 or older. Do not misstate your age or create a profile for a minor.",
              "Be honest about who you are and do not use fake photos, deceptive relationship status or fabricated identity details to manipulate others.",
              "Sexual contact, images and conversations must be consensual and lawful. Do not send unsolicited sexual content, pressure someone for intimate images, threaten to expose private material, or share intimate images without consent.",
              "Never demand money, gift cards, cryptocurrency, mobile money transfers, passwords or financial credentials as proof of affection. Report suspected romance scams.",
              "Meet in public places when possible, tell a trusted person about plans, arrange your own transport and leave if you feel unsafe.",
              "A profile, badge, match or conversation does not guarantee identity, intentions, background or safety. Verification badges show only what Eventis actually checked."
            ]
          }
        ]
      },
      {
        "heading": "4. Protect personal information",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Do not post another person's phone number, address, live location, private messages, identity documents or other personal information without a lawful basis and permission.",
              "Do not publish screenshots or recordings of private chats or calls in a way that violates privacy, consent or law.",
              "Never share mobile money PINs, passwords, one-time codes or full payment credentials in posts or chat.",
              "Use public/private profile settings carefully. Do not assume that content sent to another user can never be copied or redistributed.",
              "Do not publish attendee lists or use event registration data for unrelated marketing without a lawful basis and appropriate notice/consent."
            ]
          }
        ]
      },
      {
        "heading": "5. Safe and genuine events",
        "blocks": [
          {
            "type": "list",
            "items": [
              "List only real events that you are authorised to organise or promote.",
              "Provide truthful dates, locations, prices, age restrictions, accessibility details and cancellation terms.",
              "Do not sell fake tickets, misrepresent performers or venue access, inflate attendance figures, or use fake reviews.",
              "Do not advertise illegal activities, dangerous conduct, fraudulent fundraising or prohibited goods and services.",
              "Organisers must comply with permits, venue safety requirements, capacity limits, and applicable local law."
            ]
          }
        ]
      },
      {
        "heading": "6. Content, copyright and advertising",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Only upload photos, videos, music, logos and text that you own or are authorised to use.",
              "Do not post malware, phishing links, scams, deceptive promotions or misleading sponsored content.",
              "Clearly identify paid promotions or sponsored content where required.",
              "Do not post graphic violence, threats, sexual exploitation, non-consensual intimate imagery or content otherwise prohibited by law or Eventis rules.",
              "Do not manipulate engagement, spam users, scrape profiles, or send bulk unsolicited invitations or messages."
            ]
          }
        ]
      },
      {
        "heading": "7. Fraud, manipulation and platform abuse",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Do not trick users into paying outside the platform by falsely claiming a payment or ticket is official.",
              "Do not misuse organiser payout details, merchant codes, refunds, chargebacks or payment systems.",
              "Do not access accounts, private content, systems or data without permission.",
              "Do not evade a block, suspension, age gate or moderation action by creating replacement accounts.",
              "Do not make knowingly false reports or use reports to threaten or silence other users."
            ]
          }
        ]
      },
      {
        "heading": "8. Reporting and blocking",
        "blocks": [
          {
            "type": "p",
            "text": "Use the in-app report tools where available, or contact safety@eventis.today. Report the profile, message, event or content and include relevant context. Block users who make you uncomfortable. If someone appears to be in immediate danger, contact local emergency services (in Rwanda, dial 112). Eventis is not an emergency-response service."
          },
          {
            "type": "p",
            "text": "Do not send unnecessary sensitive documents in a report. Eventis may ask for limited additional information to investigate, and may restrict access to reported content where reasonably necessary."
          }
        ]
      },
      {
        "heading": "9. How we enforce these rules",
        "blocks": [
          {
            "type": "p",
            "text": "Depending on severity, context, history and legal obligations, Eventis may warn users, remove or limit content, restrict messaging or discovery, suspend or terminate accounts, remove events, disable organiser payouts where lawfully justified, preserve evidence, or refer matters to appropriate authorities. Serious safety threats, exploitation, credible threats, fraud or illegal conduct may lead to immediate action."
          },
          {
            "type": "p",
            "text": "Where appropriate and legally permitted, we will tell the affected user the reason and how to appeal (see section 10). We may limit details where disclosure would compromise safety, an investigation or another person's privacy."
          }
        ]
      },
      {
        "heading": "10. How to appeal",
        "blocks": [
          {
            "type": "p",
            "text": "If you believe an enforcement action was mistaken, email safety@eventis.today with the subject \"Appeal\" within 10 calendar days of the action. Include your account username, the content or listing reference and an explanation. We will review the appeal where feasible and tell you the outcome."
          }
        ]
      },
      {
        "heading": "11. Updates",
        "blocks": [
          {
            "type": "p",
            "text": "We may update these Guidelines as the platform and risks evolve. The current version is always available at https://eventis.today/community-guidelines."
          }
        ]
      },
      {
        "heading": "12. Contact",
        "blocks": [
          {
            "type": "p",
            "text": "**Safety reports and appeals:** safety@eventis.today\n**General support:** support@eventis.today\n**Operator:** Travelis Rwanda Ltd, Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "organiser": {
    "title": "Publisher, Advertiser and Event Organiser Agreement",
    "subtitle": "Terms for individuals and organisations publishing events, products, services, advertisements and other promotions to the public through Eventis",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date of this version:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "This Publisher, Advertiser and Event Organiser Agreement (the \"Agreement\") takes effect on the date the Organiser accepts it electronically in Eventis or signs it, and is between:"
      },
      {
        "type": "p",
        "text": "(1) **Travelis Rwanda Ltd**, a company organised under the laws of the Republic of Rwanda, registered on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda, operating Eventis at https://eventis.today (\"Eventis\"); and"
      },
      {
        "type": "p",
        "text": "(2) the individual or organisation named in its Eventis organiser account or in Schedule 1, with the address, registration or identification number (if applicable), email and telephone given there (the \"Organiser\" or \"Publisher\")."
      },
      {
        "type": "p",
        "text": "Each is a \"Party\" and together they are the \"Parties\"."
      }
    ],
    "sections": [
      {
        "heading": "Platform scope: events and all other promotional posts",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis operates as an open public promotional marketplace and digital billboard. The platform is not limited to event listings. Depending on the features made available, individuals, businesses, organisations and other permitted publishers may publish event announcements, products, services, offers, advertisements, business promotions, community notices and other lawful promotional posts intended for the general public."
          },
          {
            "type": "p",
            "text": "For purposes of this Agreement, \"Publisher\" includes an event organiser, advertiser, business, service provider, individual or organisation that submits or pays to display content on Eventis, and \"Organiser\" refers to the same Party. This Agreement applies to the Publisher's use of Eventis to publish or promote content. Event-specific duties in this Agreement apply only where the Publisher is promoting or organising an event; product- and service-related duties apply to the relevant offer."
          },
          {
            "type": "p",
            "text": "The Publisher remains responsible for its content, claims, products, services, offers, permissions, compliance with law, customer communications and fulfilment. Eventis provides listing, discovery, advertising and promotional services and does not ordinarily become the seller, supplier, event organiser or contracting party for a Publisher's product, service or event. Any paid promotion, featured placement, targeting, campaign duration, fee or performance reporting is governed by the order or commercial terms presented for that service."
          },
          {
            "type": "p",
            "text": "The ticketing and payment provisions apply to event transactions where relevant. For other product or service promotions, the Publisher and customer ordinarily arrange any purchase, delivery, returns and refund directly unless a specific checkout or separate written agreement expressly provides that Eventis or a payment partner will facilitate the transaction or collect funds."
          }
        ]
      },
      {
        "heading": "1. Purpose and marketplace role",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis operates an online marketplace and promotional platform that helps individuals and organisations publish and promote events, products, services, advertisements, offers and other lawful promotional content, and helps the public discover and contact publishers. Eventis is not ordinarily the event organiser, ticket seller, venue owner or manager of the Organiser's ticket inventory."
          },
          {
            "type": "p",
            "text": "Unless an Eventis payment collection service is expressly enabled and disclosed for a particular event or transaction, Eventis does not issue tickets, collect or hold ticket proceeds, manage admission, or administer payments between the Organiser and customers. In those cases, the Organiser and customer transact directly with each other."
          },
          {
            "type": "p",
            "text": "Where available, Eventis may provide a payment collection or facilitation service through its payment platform or third-party payment partners. This applies only where the checkout or transaction terms expressly say so. Eventis or its partner may collect or facilitate payment and settlement for the Organiser, but this does not make Eventis the event organiser or supplier of the event."
          },
          {
            "type": "p",
            "text": "The Organiser must comply with the Eventis Terms and Conditions, Privacy Policy, Cookies Policy, Cancellation and Refund Policy, Community Guidelines and any separately disclosed payment or promotional terms."
          }
        ]
      },
      {
        "heading": "2. Registration and verification",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser must have legal capacity and authority to enter this Agreement and must provide accurate, complete and current information. Eventis may request identity, business registration, licences, venue authorisation, tax or payment details where reasonably required for verification, safety, fraud prevention or legal compliance."
          },
          {
            "type": "p",
            "text": "The Organiser must update its information promptly and may not impersonate another person, submit false documents or use payout details without authorisation. Eventis may restrict access where verification is incomplete or a legal, security, fraud or safety concern arises."
          }
        ]
      },
      {
        "heading": "3. Listings, ticketing and event delivery",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser is responsible for ensuring each listing is accurate, complete, lawful and not misleading. Listings must clearly disclose the event description, date and time, venue or online access, organiser contact details, age limits, accessibility information, ticket types and availability, prices, fees, payment method, admission conditions and cancellation/refund terms."
          },
          {
            "type": "p",
            "text": "The Organiser alone is responsible for setting ticket prices and quantities, managing ticket availability, issuing tickets or booking confirmations, keeping attendance records, checking customers in, and delivering the event. If the Organiser takes payment directly, it must clearly explain how customers pay and receive confirmation."
          },
          {
            "type": "p",
            "text": "The Organiser must promptly correct inaccurate information and notify Eventis of material changes or cancellation. Eventis may moderate, reject, unpublish or remove listings to enforce platform rules, respond to reports, protect users or comply with law. Eventis does not guarantee sales, attendance, promotional reach or event success."
          }
        ]
      },
      {
        "heading": "4. Permits, safety and legal compliance",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser is responsible for all permits, licences, venue approvals, insurance, performance rights, security and other authorisations required for its event. It must comply with applicable laws, consumer-protection and tax requirements, venue rules, capacity limits, public-safety requirements and accessibility obligations."
          },
          {
            "type": "p",
            "text": "The Organiser must take reasonable steps to protect attendees, staff, performers, vendors and the public and promptly notify Eventis of any serious incident, credible threat, regulatory action or safety issue. It must not facilitate unlawful, fraudulent, exploitative, violent, harassing or otherwise prohibited activity."
          }
        ]
      },
      {
        "heading": "5. Direct payments between Organiser and customer",
        "blocks": [
          {
            "type": "p",
            "text": "Where the listing or payment instructions say that payment is made directly to the Organiser, the customer pays the Organiser using the method the Organiser provides. The Organiser is responsible for receiving and confirming payment, issuing tickets or booking confirmations, keeping records, handling payment errors and resolving payment-related questions."
          },
          {
            "type": "p",
            "text": "Eventis is not a party to a direct payment, does not receive or hold those funds, and cannot itself reverse, refund, trace or guarantee recovery of money paid directly to the Organiser. Eventis may, at its discretion, forward a complaint or take action regarding a listing or account, but this does not make Eventis responsible for the payment or guarantee a resolution."
          },
          {
            "type": "p",
            "text": "The Organiser must not represent a direct payment as processed, protected or guaranteed by Eventis. The Organiser must provide clear payment instructions and a reliable contact channel."
          }
        ]
      },
      {
        "heading": "6. Optional Eventis or partner collection service",
        "blocks": [
          {
            "type": "p",
            "text": "If Eventis expressly enables payment collection for an event, the checkout disclosures and applicable payment terms govern that service. Those terms will identify applicable fees, payment methods and settlement arrangements."
          },
          {
            "type": "p",
            "text": "Where enabled, Eventis and/or its payment partners may collect or facilitate collection of payments for the Organiser and settle eligible proceeds after disclosed fees, refunds, reversals, chargebacks, reserves or legally required deductions. The Organiser authorises only deductions and processes disclosed in the applicable terms."
          },
          {
            "type": "p",
            "text": "The Organiser must provide accurate, authorised payout details and cooperate with verification, disputes and lawful requests. Settlement may be delayed where reasonably necessary for verification, suspected fraud, refunds, chargebacks, security, legal compliance or payment-provider rules, subject to applicable law and the disclosed terms. Collection services do not transfer responsibility for planning, licensing, delivering or cancelling the event to Eventis."
          }
        ]
      },
      {
        "heading": "7. Fees and taxes",
        "blocks": [
          {
            "type": "p",
            "text": "Any Eventis listing, advertising, commission, service or payment collection fee will be disclosed in the organiser dashboard, pricing schedule, Schedule 1 or a separate written agreement before the relevant paid service is used. Eventis will not charge an undisclosed fee, subject to applicable law."
          },
          {
            "type": "p",
            "text": "Unless applicable terms state otherwise, the Organiser is responsible for taxes, levies, royalties and public charges arising from its event or income. The Organiser is also responsible for fees charged by its own bank, mobile-money operator or payment provider for direct transactions."
          }
        ]
      },
      {
        "heading": "8. Cancellation, postponement and refunds",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser is responsible for clearly disclosing event-specific cancellation and refund conditions, subject to applicable law and the Eventis Cancellation and Refund Policy. It must promptly inform customers and Eventis if an event is cancelled, postponed, relocated or materially changed."
          },
          {
            "type": "p",
            "text": "For direct payments, the Organiser must assess and pay any refunds due, communicate with customers and resolve disputes directly. Eventis does not hold those funds and cannot itself issue a refund for a direct transaction."
          },
          {
            "type": "p",
            "text": "For payments collected through an expressly enabled Eventis or partner collection service, the Organiser remains responsible for event-related refund obligations unless applicable law or a separate written agreement provides otherwise. Eventis or its payment partner may facilitate processing under the applicable terms. The Organiser must provide required refund funds and cooperate with disputes and chargebacks."
          },
          {
            "type": "p",
            "text": "Nothing in this Agreement removes mandatory rights customers have under applicable law. Eventis may remove or suspend a listing in response to credible concerns about non-delivery, misleading information, fraud or failure to address refund obligations."
          }
        ]
      },
      {
        "heading": "9. Content and promotion",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser retains ownership of content it owns and submits. It grants Eventis a non-exclusive, worldwide, royalty-free licence to host, reproduce, format, display and promote that content as reasonably necessary to operate the marketplace and list or promote the event, subject to applicable law and any written restrictions agreed by Eventis."
          },
          {
            "type": "p",
            "text": "The Organiser confirms it has all necessary rights to submitted content. It may not use Eventis names, logos or branding except as permitted and must not imply that Eventis endorses or sponsors an event without authorisation. Paid promotional placements may be governed by separate terms."
          }
        ]
      },
      {
        "heading": "10. Attendee data and privacy",
        "blocks": [
          {
            "type": "p",
            "text": "Each Party must comply with applicable privacy and data-protection laws, including Rwanda Law No. 058/2021 relating to the protection of personal data and privacy, and the Eventis Privacy Policy to the extent applicable. The Organiser may use attendee information received through Eventis only for legitimate event administration, customer service, safety, legal compliance and other purposes disclosed to attendees and permitted by law."
          },
          {
            "type": "p",
            "text": "The Organiser must not sell attendee information, share it with unauthorised parties or use it for unrelated marketing without a lawful basis and any required consent. It must use reasonable safeguards and promptly notify Eventis at privacy@eventis.today of suspected loss, unauthorised access, disclosure or misuse."
          }
        ]
      },
      {
        "heading": "11. Representations, records and complaints",
        "blocks": [
          {
            "type": "p",
            "text": "The Organiser represents that it has authority to enter this Agreement; its information is accurate; it holds required rights, permits and approvals; its event and content comply with law and Eventis policies; and it will honour its disclosed ticket, payment and refund arrangements."
          },
          {
            "type": "p",
            "text": "The Organiser must keep records reasonably necessary for event delivery, sales, direct payments, refunds, taxes and compliance. It must cooperate reasonably with attendee complaints, safety investigations, payment disputes and lawful requests and is responsible for responding to event-specific enquiries."
          }
        ]
      },
      {
        "heading": "12. Indemnity and liability",
        "blocks": [
          {
            "type": "p",
            "text": "To the extent permitted by law, the Organiser will indemnify and hold harmless Eventis, its affiliates, officers, employees and agents against third-party claims and reasonable costs arising from the event or its delivery; injury, death or property damage caused by the event or Organiser; breach of law or this Agreement; infringement by submitted content; failure to honour bookings or refund obligations; or misuse of attendee data. This does not apply to the extent a claim is caused by Eventis's own negligence, wilful misconduct or breach of law."
          },
          {
            "type": "p",
            "text": "To the maximum extent permitted by law, Eventis is not liable for indirect or consequential losses, loss of profits or event performance, or disputes between an Organiser and customer, including direct-payment, ticket, admission or event-delivery disputes. Nothing excludes liability that cannot lawfully be excluded."
          }
        ]
      },
      {
        "heading": "13. Suspension and termination",
        "blocks": [
          {
            "type": "p",
            "text": "Either Party may terminate this Agreement by giving 7 calendar days' written notice. Eventis may suspend or remove a listing or restrict an account with immediate effect where it reasonably believes there is a breach, false information, fraud, safety risk, legal concern, repeated complaints or misuse of the platform. Where appropriate and lawful, Eventis will give notice and an opportunity to address the issue; urgent action may be taken where delay could cause harm or legal exposure."
          },
          {
            "type": "p",
            "text": "Termination does not remove the Organiser's responsibility for events already advertised or sold, direct payments, tickets, customer communications, refunds, taxes or outstanding obligations."
          }
        ]
      },
      {
        "heading": "14. General terms and disputes",
        "blocks": [
          {
            "type": "p",
            "text": "The Parties are independent contractors. Nothing creates a partnership, employment or agency relationship, and the Organiser cannot bind Eventis. This Agreement and the incorporated Eventis policies form the entire agreement on its subject. Amendments will be notified by a reasonable method. If a provision is unenforceable, the remaining provisions continue."
          },
          {
            "type": "p",
            "text": "Notices to Eventis must be sent to legal@eventis.today or to the registered address above. Notices to the Organiser will be sent to the email address on its Eventis account or in Schedule 1. Electronic acceptance or signature may be used where permitted by law."
          },
          {
            "type": "p",
            "text": "This Agreement is governed by the laws of the Republic of Rwanda, subject to mandatory laws. The Parties will first attempt good-faith resolution; if a dispute is unresolved within thirty (30) days, either Party may refer it to the competent courts of Kigali, Rwanda, unless agreed otherwise in writing."
          }
        ]
      },
      {
        "heading": "Signatures",
        "blocks": [
          {
            "type": "p",
            "text": "Where this Agreement is not accepted electronically, the Parties' authorised representatives sign below to confirm that they have read and agree to it."
          },
          {
            "type": "p",
            "text": "**For Eventis — Travelis Rwanda Ltd**\nName: ____________________\nTitle: ____________________\nSignature: ____________________\nDate: ____________________"
          },
          {
            "type": "p",
            "text": "**For the Organiser**\nLegal name: ____________________\nRepresentative: ____________________\nTitle: ____________________\nSignature: ____________________\nDate: ____________________"
          }
        ]
      },
      {
        "heading": "Schedule 1 — Organiser and commercial details",
        "blocks": [
          {
            "type": "p",
            "text": "_Completed separately for each Organiser. Fields left blank mean \"None\" unless the organiser dashboard states otherwise._"
          },
          {
            "type": "table",
            "rows": [
              [
                "Item",
                "Details"
              ],
              [
                "Organiser full legal name / registered business name",
                ""
              ],
              [
                "Address",
                ""
              ],
              [
                "Registration or identification number (if applicable)",
                ""
              ],
              [
                "Email and telephone",
                ""
              ],
              [
                "Event / event series",
                ""
              ],
              [
                "Eventis listing or advertising fee",
                "Amount, or \"None\""
              ],
              [
                "Eventis commission, if any",
                "Amount/percentage, or \"None\""
              ],
              [
                "Payment model",
                "Direct payment to Organiser / Eventis or partner collection service"
              ],
              [
                "Collection or payment partner, if applicable",
                ""
              ],
              [
                "Collection service fees, if applicable",
                ""
              ],
              [
                "Payout method and timing, if applicable",
                "Under the applicable payment terms"
              ],
              [
                "Event-specific refund terms",
                "Must comply with law and the Cancellation and Refund Policy"
              ],
              [
                "Event support contact",
                ""
              ],
              [
                "Special terms",
                "Details, or \"None\""
              ]
            ]
          }
        ]
      }
    ]
  },
  "findloveTerms": {
    "title": "FindLove Terms",
    "subtitle": "Extra rules for the Eventis dating and connections feature",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      },
      {
        "type": "p",
        "text": "FindLove is the dating and connections part of Eventis. These FindLove Terms add to the Eventis Terms and Conditions, Privacy Policy, Cancellation and Refund Policy and Community Guidelines; they do not replace them. If these FindLove Terms and the Eventis Terms and Conditions conflict on a FindLove matter, these FindLove Terms apply. By turning on FindLove you agree to both."
      }
    ],
    "sections": [
      {
        "heading": "1. Who can use FindLove",
        "blocks": [
          {
            "type": "p",
            "text": "You must be at least 18 years old. To use FindLove you confirm your date of birth and send a photo of an official ID, which our team reviews before your profile goes live."
          },
          {
            "type": "p",
            "text": "You may have one FindLove profile, linked to your own Eventis account. Profiles made for someone else, shared, or sold are not allowed."
          }
        ]
      },
      {
        "heading": "2. Your profile",
        "blocks": [
          {
            "type": "p",
            "text": "Everything on your profile must be true and about you: your photos, age, gender, location and what you are looking for. Photos are reviewed and may be removed if they break the Community Guidelines or the FindLove Community Guidelines."
          },
          {
            "type": "p",
            "text": "Your profile shows your username, photos, age, city and neighbourhood, bio, interests and relationship goal to other FindLove members. Your exact location, phone number and email address are never shown on your profile."
          }
        ]
      },
      {
        "heading": "3. Connections and messages",
        "blocks": [
          {
            "type": "p",
            "text": "You can like profiles and send connection requests, with an optional note. The other person decides whether to accept, and either of you can remove the connection at any time."
          },
          {
            "type": "p",
            "text": "You are responsible for what you send. Follow the Community Guidelines in every message and every meeting. A profile, an approved age check, a match or a conversation does not confirm a person's identity, intentions or safety."
          }
        ]
      },
      {
        "heading": "4. Meeting in person",
        "blocks": [
          {
            "type": "p",
            "text": "Eventis does not run background checks on members and cannot guarantee anyone's identity, intentions or behaviour. Use your own judgement, meet in public places, arrange your own transport and tell someone you trust where you are going."
          }
        ]
      },
      {
        "heading": "5. Memberships and payments",
        "blocks": [
          {
            "type": "p",
            "text": "Some FindLove features need a paid membership. When you buy one, Eventis is the seller. Prices and billing periods are shown in the app before you pay and may change; a change never affects a period you have already paid for."
          },
          {
            "type": "p",
            "text": "You pay by mobile money and upload your payment receipt. Your membership starts once our team confirms the payment. If we cannot confirm it, we will tell you why. Never send your mobile money PIN or one-time codes to anyone, including people claiming to be Eventis staff."
          },
          {
            "type": "p",
            "text": "Memberships do not renew automatically. Once a paid period has started it is not refunded, except where the law requires a refund or a payment was taken by mistake. This rule is also set out in section 12 of the Cancellation and Refund Policy."
          }
        ]
      },
      {
        "heading": "6. Suspension and removal",
        "blocks": [
          {
            "type": "p",
            "text": "We may hide photos, remove profiles, or suspend FindLove or your whole Eventis account if you break these terms or the Community Guidelines, if your age cannot be confirmed, or to protect other members. Serious cases may be reported to the authorities. You can appeal a decision as described in section 10 of the Eventis Community Guidelines."
          }
        ]
      },
      {
        "heading": "7. Changes and contact",
        "blocks": [
          {
            "type": "p",
            "text": "We may update these terms. If a change matters, we will ask you to accept the new version before you keep using FindLove. The effective date appears at the top of the current version."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Support:** support@eventis.today\n**Safety reports and appeals:** safety@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  },
  "findloveGuidelines": {
    "title": "FindLove Community Guidelines",
    "subtitle": "Extra safety rules for FindLove profiles, messages and meetings",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Eventis is available at https://eventis.today and through the Eventis mobile apps."
      },
      {
        "type": "p",
        "text": "FindLove only works if everyone feels safe and respected. These rules apply to FindLove profiles, messages and meetings. They add to the Eventis Community Guidelines, including section 3 (Dating and FindLove safety), which also apply in full."
      }
    ],
    "sections": [
      {
        "heading": "1. Be real",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Use your own recent photos and true details.",
              "No fake profiles and no pretending to be someone else.",
              "No using FindLove for anyone under 18, and no misstating your age."
            ]
          }
        ]
      },
      {
        "heading": "2. Be respectful",
        "blocks": [
          {
            "type": "list",
            "items": [
              "No harassment, threats, hate speech or bullying.",
              "No pressuring anyone, and no sexual messages or photos that the other person has not clearly agreed to.",
              "A declined or removed connection means no. Do not contact that person again through other accounts or apps."
            ]
          }
        ]
      },
      {
        "heading": "3. Keep it safe",
        "blocks": [
          {
            "type": "list",
            "items": [
              "No nudity or sexual content in profile photos. No violence, weapons or illegal drugs.",
              "Never share another person's private information, messages or photos without their permission.",
              "Meet in public places when possible, tell someone you trust where you are going, and leave if you feel unsafe."
            ]
          }
        ]
      },
      {
        "heading": "4. No selling or scams",
        "blocks": [
          {
            "type": "list",
            "items": [
              "FindLove is not for advertising, selling, sex work or recruiting.",
              "Never ask for money, gifts, cryptocurrency, mobile money transfers, passwords or codes. If someone asks you for money, stop and report them."
            ]
          }
        ]
      },
      {
        "heading": "5. Report problems",
        "blocks": [
          {
            "type": "p",
            "text": "If someone breaks these rules or makes you feel unsafe, email safety@eventis.today with their username and what happened. Reports are confidential."
          },
          {
            "type": "p",
            "text": "If you are in immediate danger, contact the police or emergency services first (in Rwanda, dial 112). Eventis is not an emergency-response service."
          }
        ]
      },
      {
        "heading": "6. What happens if rules are broken",
        "blocks": [
          {
            "type": "p",
            "text": "We may hide photos, remove profiles, restrict messaging, or suspend FindLove or your whole Eventis account, as described in section 9 of the Eventis Community Guidelines. You can appeal as described in section 10 of those Guidelines."
          }
        ]
      }
    ]
  },
  "findlovePrivacy": {
    "title": "FindLove Privacy Notice",
    "subtitle": "The extra information FindLove uses, and how it is protected",
    "preamble": [
      {
        "type": "p",
        "text": "**Effective date:** [to be confirmed]\n**Last updated:** [to be confirmed]"
      },
      {
        "type": "p",
        "text": "**Operator:** Travelis Rwanda Ltd, a company registered in Rwanda on 15 June 2026, with its registered address at Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda (the \"Company\", \"Eventis\", \"we\", \"us\" or \"our\"). Travelis Rwanda Ltd is the data controller for FindLove."
      },
      {
        "type": "p",
        "text": "This notice explains the extra information FindLove uses. It adds to the Eventis Privacy Policy, which still applies in full, including your rights in section 12."
      }
    ],
    "sections": [
      {
        "heading": "1. What FindLove collects",
        "blocks": [
          {
            "type": "list",
            "items": [
              "**Profile details:** username, gender, who you are interested in, date of birth, country, city, neighbourhood, and optionally your occupation, bio, interests and relationship goal.",
              "**Activity:** profile photos, likes, connection requests and notes, FindLove messages, and when you were last active.",
              "**Age verification:** photos of your ID (front and, where needed, back) and your date of birth.",
              "**Memberships:** the plan you chose, the amount, and the payment receipt you upload."
            ]
          }
        ]
      },
      {
        "heading": "2. ID photos",
        "blocks": [
          {
            "type": "p",
            "text": "ID photos are stored privately, are never shown on your profile, and are seen only by the Eventis team members who review age checks. We use them only to confirm that you are 18 or older. We keep them for [to be confirmed]."
          }
        ]
      },
      {
        "heading": "3. Who can see what",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Other FindLove members see your public profile (see section 2 of the FindLove Terms).",
              "Your messages are visible to you and the person you are talking to. They are stored on Eventis systems and are not end-to-end encrypted. Authorised Eventis staff may see profiles, photos and messages only when reviewing content, investigating a report, protecting members or when the law requires it.",
              "We do not sell your FindLove information and we do not show it outside FindLove. We do not use your FindLove profile, messages or ID for advertising.",
              "We use service providers to store photos and to send emails and SMS. By contract, they may use the data only to provide that service."
            ]
          }
        ]
      },
      {
        "heading": "4. Your choices and rights",
        "blocks": [
          {
            "type": "p",
            "text": "You can edit your profile and photos at any time, and you can remove connections."
          },
          {
            "type": "p",
            "text": "When you delete your Eventis account, your FindLove profile is no longer shown to anyone."
          },
          {
            "type": "p",
            "text": "To get a copy of your data, or to ask us to correct or delete it, email privacy@eventis.today. We handle requests under Rwanda Law No. 058/2021 relating to the protection of personal data and privacy. You can also complain to the National Cyber Security Authority (NCSA)."
          }
        ]
      },
      {
        "heading": "5. Changes and contact",
        "blocks": [
          {
            "type": "p",
            "text": "We may update this notice. If a change matters, we will tell you, and ask for your consent again where the law requires it. The effective date appears at the top of the current version."
          },
          {
            "type": "p",
            "text": "**Operator:** Travelis Rwanda Ltd\n**Address:** Ibuhoro, Nyagatovu, Kimironko, Gasabo, Kigali, Rwanda\n**Privacy requests:** privacy@eventis.today\n**Website:** https://eventis.today"
          }
        ]
      }
    ]
  }
};
