import type { AccountType } from "@/context/AuthContext";
import { PROFILE_FEATURES, type BusinessVerificationStatus, type ProfileFeature } from "@/services/profileService";

export type CustomerProfileTab = "overview" | "bookings" | "tickets" | "saved-organisers" | "reviews";
export type PublisherProfileTab = "overview" | "published" | "manage" | "analytics";
export type ProfileTab = CustomerProfileTab | PublisherProfileTab;

export interface ProfileTabDef {
  key: ProfileTab;
  label: string;
}

export interface CapabilityInput {
  accountType: AccountType;
  /** Organiser portal unlocked (subscription + organisation in place). */
  hasOrganiserAccess: boolean;
  isPhoneVerified: boolean;
  /** Absent for non-business accounts or when the status hasn't loaded. */
  businessVerification?: BusinessVerificationStatus;
  /** Overridable for tests; defaults to the service's feature map. */
  features?: Record<ProfileFeature, boolean>;
}

export interface AccountCapabilities {
  accountType: AccountType;
  isPublisher: boolean;
  profileTabs: ProfileTabDef[];

  canManageEvents: boolean;
  canViewAnalytics: boolean;
  /** Promotional banners/posts/stories are a business-only tool. */
  canPromote: boolean;
  /** Paid tickets need a verified business (journey compliance rule). */
  canPublishPaidEvents: boolean;
  /** Human-readable reason when paid publishing is blocked, for inline guidance. */
  paidEventsBlockedReason?: string;

  settings: {
    editBusinessProfile: boolean;
    accountVisibility: boolean;
    blockedUsers: boolean;
    notifications: boolean;
    savedOrganiserNotifications: boolean;
    businessVerification: boolean;
    discoveryPreferences: boolean;
    languagePreference: boolean;
  };
}

const CUSTOMER_TABS: ProfileTabDef[] = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "My Bookings" },
  { key: "tickets", label: "My Tickets" },
  { key: "saved-organisers", label: "Saved Organisers" },
  { key: "reviews", label: "My Reviews" },
];

/**
 * Single source of truth for which profile sections, actions and settings an
 * account sees. Screens should branch on these flags, never on raw account
 * fields, so permission rules stay in one place.
 */
export function getAccountCapabilities(input: CapabilityInput): AccountCapabilities {
  const features = input.features ?? PROFILE_FEATURES;
  const { accountType, hasOrganiserAccess } = input;
  const isPublisher = accountType !== "customer";
  const isBusiness = accountType === "business";

  const canManageEvents = isPublisher && hasOrganiserAccess;
  const canViewAnalytics = isBusiness && hasOrganiserAccess;
  const isVerifiedBusiness = isBusiness && input.businessVerification === "verified";

  let paidEventsBlockedReason: string | undefined;
  if (!canManageEvents) paidEventsBlockedReason = "Organiser access is required to publish events.";
  else if (!isBusiness) paidEventsBlockedReason = "Paid events can only be published by verified business accounts.";
  else if (!isVerifiedBusiness) paidEventsBlockedReason = "Complete business verification to publish paid events.";

  const profileTabs: ProfileTabDef[] = isPublisher
    ? [
        { key: "overview", label: "Overview" },
        { key: "published", label: "Published Events" },
        ...(canManageEvents ? [{ key: "manage" as const, label: "Event Management" }] : []),
        ...(canViewAnalytics ? [{ key: "analytics" as const, label: "Analytics" }] : []),
      ]
    : CUSTOMER_TABS.filter(
        (t) =>
          (t.key !== "saved-organisers" || features.savedOrganisers) && (t.key !== "reviews" || features.reviews),
      );

  return {
    accountType,
    isPublisher,
    profileTabs,
    canManageEvents,
    canViewAnalytics,
    canPromote: isBusiness && hasOrganiserAccess,
    canPublishPaidEvents: canManageEvents && isVerifiedBusiness,
    paidEventsBlockedReason,
    settings: {
      editBusinessProfile: isBusiness && hasOrganiserAccess,
      accountVisibility: features.accountVisibility,
      blockedUsers: features.blockedUsers,
      notifications: features.notificationPreferences,
      savedOrganiserNotifications: features.notificationPreferences && features.savedOrganisers,
      businessVerification: isBusiness && features.businessVerification,
      discoveryPreferences: features.discoveryPreferences,
      languagePreference: features.languagePreference,
    },
  };
}
