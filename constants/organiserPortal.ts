import type { Ionicons } from "@expo/vector-icons";
import type React from "react";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Organiser portal entries. To add a feature, add an item here and (if it has
 * an `href`) a screen under app/business. Items without `href` render as
 * "Soon" so the portal can show what's planned without dead ends.
 */
export interface PortalAction {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  href?: string;
}

export const CREATE_ACTIONS: PortalAction[] = [
  {
    key: "event",
    title: "Create Event",
    description: "List an event with date, venue, capacity and tickets.",
    icon: "calendar-outline",
    href: "/business/create-event",
  },
  {
    key: "post",
    title: "Create Post",
    description: "Share an update, photo or announcement with your audience.",
    icon: "create-outline",
    href: "/business/create-post",
  },
  {
    key: "story",
    title: "Create Story",
    description: "Post a photo story that shows at the top of the home feed.",
    icon: "aperture-outline",
    href: "/business/create-story",
  },
];

export const ORGANISATION_ACTIONS: PortalAction[] = [
  {
    key: "edit",
    title: "Edit organisation details",
    description: "Name, logo, description, location and website.",
    icon: "business-outline",
    href: "/business/edit-organisation",
  },
  {
    key: "team",
    title: "Team members",
    description: "Invite people to help manage your organisation.",
    icon: "people-outline",
  },
  {
    key: "payouts",
    title: "Payouts",
    description: "Where ticket revenue is paid out.",
    icon: "wallet-outline",
  },
  {
    key: "verification",
    title: "Verification",
    description: "Get a verified badge on your posts and events.",
    icon: "shield-checkmark-outline",
  },
];
