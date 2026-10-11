import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { GlassSurface } from "@/components/GlassSurface";
import {
  FilterChips,
  InlineError,
  ProfileCard,
  ProfileNavRow,
  ProfileSection,
  ProfileStatGrid,
  SectionState,
} from "@/components/profile/ProfileSection";
import { PromotionSheet } from "@/components/profile/PromotionSheet";
import { getEventImage } from "@/constants/eventImages";
import type { AccountType, User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { usePublisherEvents, ManagedEvent } from "@/hooks/usePublisherEvents";
import type { usePublisherInsights } from "@/hooks/usePublisherInsights";
import type { Organisation } from "@/services/organiserService";
import type {
  BusinessVerification,
  BusinessVerificationStatus,
  PublisherProfile,
  SocialPlatform,
} from "@/services/profileService";
import { PROMOTION_PLACEMENTS, type PromotionStatus } from "@/services/publisherService";
import type { ProfileTab } from "@/utils/accountCapabilities";
import { localToday } from "@/utils/dates";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type PublisherEventsState = ReturnType<typeof usePublisherEvents>;
type InsightsState = ReturnType<typeof usePublisherInsights>;

const today = () => localToday();
const isPast = (m: ManagedEvent) => m.event.date < today();

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function openUrl(value: string) {
  const url = /^https?:\/\//.test(value) ? value : `https://${value}`;
  void Linking.openURL(url).catch(() => {});
}

function usePublisherNav() {
  const router = useRouter();
  return {
    /** Management screen when the account can manage this event, the public page otherwise. */
    openEvent: (item: ManagedEvent, canManage: boolean) =>
      canManage && item.manageable
        ? router.push({ pathname: "/business/event/[id]", params: { id: item.event.id } } as any)
        : router.push({ pathname: "/event/[id]", params: { id: item.event.id } } as any),
    createEvent: () => router.push("/business/create-event" as any),
    portal: () => router.push("/business/dashboard" as any),
    editOrganisation: () => router.push("/business/edit-organisation" as any),
  };
}

// ---------------------------------------------------------------------------
// Event rows
// ---------------------------------------------------------------------------

function statusOf(item: ManagedEvent): { label: string; colorKey: "success" | "warning" | "mutedForeground" | "primary" } {
  if (item.status === "paused") return { label: "Paused", colorKey: "warning" };
  if (isPast(item)) return { label: "Ended", colorKey: "mutedForeground" };
  if (item.status === "listed") return { label: "Listed", colorKey: "primary" };
  return { label: "Live", colorKey: "success" };
}

function EventRow({ item, onPress, trailing }: { item: ManagedEvent; onPress: () => void; trailing?: React.ReactNode }) {
  const colors = useColors();
  const { event } = item;
  const status = statusOf(item);
  const statusColor = colors[status.colorKey];
  const attendance = `${event.attendees}/${event.capacity} attending`;

  return (
    <View style={styles.eventRow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.eventMain, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${formatDate(event.date)}, ${status.label}, ${attendance}`}
      >
        <Image source={getEventImage(event.image)} style={styles.eventImage} />
        <View style={styles.eventCopy}>
          <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.eventMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {formatDate(event.date)} · {event.time} · {attendance}
          </Text>
          <View style={[styles.pill, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.pillText, { color: statusColor }]}>{status.label}</Text>
          </View>
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const SOCIAL: Record<SocialPlatform, { label: string; icon: IconName }> = {
  instagram: { label: "Instagram", icon: "logo-instagram" },
  facebook: { label: "Facebook", icon: "logo-facebook" },
  x: { label: "X", icon: "logo-twitter" },
  tiktok: { label: "TikTok", icon: "logo-tiktok" },
  youtube: { label: "YouTube", icon: "logo-youtube" },
  linkedin: { label: "LinkedIn", icon: "logo-linkedin" },
};

const VERIFICATION_COPY: Record<BusinessVerificationStatus, { title: string; message: string; icon: IconName; colorKey: "success" | "warning" | "destructive" | "mutedForeground" }> = {
  verified: {
    title: "Verified business",
    message: "Your business documents are approved.",
    icon: "shield-checkmark",
    colorKey: "success",
  },
  pending: {
    title: "Verification in review",
    message: "We're checking your documents. This usually takes 1–2 working days.",
    icon: "time-outline",
    colorKey: "warning",
  },
  rejected: {
    title: "Verification declined",
    message: "Some details couldn't be confirmed. Update them and submit again.",
    icon: "alert-circle-outline",
    colorKey: "destructive",
  },
  unverified: {
    title: "Not verified yet",
    message: "Submit your business documents to sell paid tickets.",
    icon: "shield-outline",
    colorKey: "mutedForeground",
  },
};

function maskTaxId(taxId: string) {
  const digits = taxId.replace(/\s/g, "");
  return digits.length > 3 ? `•••• ${digits.slice(-3)}` : "••••";
}

function DetailRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.detailRow, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole={onPress ? "link" : "text"}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: onPress ? colors.primary : colors.foreground }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

/** "Add …" prompt for a missing profile detail; leads to Edit Profile. */
function MissingDetail({ label, onPress }: { label: string; onPress: () => void }) {
  return <ProfileNavRow icon="add-circle-outline" label={label} onPress={onPress} />;
}

interface PublisherOverviewTabProps {
  user: User;
  accountType: Exclude<AccountType, "customer">;
  organisation?: Organisation;
  publisherProfile?: PublisherProfile;
  profileLoading: boolean;
  profileError: string | null;
  onRetryProfile: () => void;
  events: PublisherEventsState;
  canManage: boolean;
  verification?: BusinessVerification;
  verificationStatus?: BusinessVerificationStatus;
  canPublishPaidEvents: boolean;
  paidEventsBlockedReason?: string;
  onSelectTab: (tab: ProfileTab) => void;
  onEditProfile: () => void;
}

export function PublisherOverviewTab(props: PublisherOverviewTabProps) {
  const colors = useColors();
  const nav = usePublisherNav();
  const { user, accountType, organisation, publisherProfile: pp, onEditProfile } = props;
  const isBusiness = accountType === "business";
  const items = props.events.items;

  const upcoming = items.filter((m) => !isPast(m) && m.status !== "paused");
  const stats = [
    { label: "Published", value: items.filter((m) => m.status !== "paused").length, icon: "calendar-outline" as const, onPress: () => props.onSelectTab("published") },
    { label: "Upcoming", value: upcoming.length, icon: "time-outline" as const, onPress: () => props.onSelectTab("published") },
    { label: "Attendees", value: items.reduce((sum, m) => sum + m.event.attendees, 0), icon: "people-outline" as const },
  ];

  const description = organisation?.description || user.bio;
  const email = pp?.contactEmail || user.email;
  const phone = pp?.contactPhone || user.phone;
  const website = pp?.website || organisation?.website || user.businessWebsite;
  const location = organisation?.location || user.location;
  const categories = pp?.categories.length
    ? pp.categories
    : (organisation?.activities ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const socials = (Object.keys(SOCIAL) as SocialPlatform[]).filter((key) => pp?.socialLinks[key]);

  return (
    <>
      <ProfileSection title="At a glance">
        <ProfileStatGrid stats={stats} />
      </ProfileSection>

      <ProfileSection title={isBusiness ? "Business info" : "Professional info"}>
        {props.profileLoading ? (
          <SectionState kind="loading" message="Loading your details…" />
        ) : props.profileError ? (
          <SectionState kind="error" message={props.profileError} onRetry={props.onRetryProfile} />
        ) : (
          <ProfileCard>
            {description ? (
              <Text style={[styles.description, { color: colors.foreground }]}>{description}</Text>
            ) : (
              <MissingDetail label={isBusiness ? "Add a business description" : "Add a short bio"} onPress={onEditProfile} />
            )}
            {categories.length ? (
              <View style={styles.categoryBlock}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Event categories</Text>
                <View style={styles.chipRow}>
                  {categories.map((c) => (
                    <View key={c} style={[styles.categoryChip, { backgroundColor: `${colors.primary}14` }]}>
                      <Text style={[styles.categoryText, { color: colors.primary }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <MissingDetail label="Add the event categories you run" onPress={onEditProfile} />
            )}
            {location ? <DetailRow icon="location-outline" label="Based in" value={location} /> : null}
          </ProfileCard>
        )}
      </ProfileSection>

      <ProfileSection title="Contact">
        <ProfileCard>
          {email ? <DetailRow icon="mail-outline" label="Email" value={email} onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
          {phone ? <DetailRow icon="call-outline" label="Phone" value={phone} onPress={() => void Linking.openURL(`tel:${phone}`)} /> : null}
          {website ? (
            <DetailRow icon="globe-outline" label="Website" value={website.replace(/^https?:\/\//, "")} onPress={() => openUrl(website)} />
          ) : (
            <MissingDetail label={isBusiness ? "Add your website (needed for paid events)" : "Add your website"} onPress={onEditProfile} />
          )}
          {socials.length ? (
            <View style={styles.socialRow}>
              {socials.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => openUrl(pp!.socialLinks[key]!)}
                  style={[styles.socialBtn, { borderColor: colors.border }]}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${SOCIAL[key].label}`}
                >
                  <Ionicons name={SOCIAL[key].icon} size={18} color={colors.foreground} />
                </Pressable>
              ))}
            </View>
          ) : (
            <MissingDetail label="Add social media links" onPress={onEditProfile} />
          )}
        </ProfileCard>
      </ProfileSection>

      {isBusiness ? (
        <ProfileSection title="Legal identity">
          <ProfileCard>
            {pp?.legalName ? (
              <DetailRow icon="business-outline" label="Legal business name" value={pp.legalName} />
            ) : null}
            {pp?.registrationNumber ? (
              <DetailRow icon="document-text-outline" label="Registration number" value={pp.registrationNumber} />
            ) : null}
            {pp?.taxId ? <DetailRow icon="receipt-outline" label="TIN" value={maskTaxId(pp.taxId)} /> : null}
            {!pp?.legalName || !pp?.registrationNumber || !pp?.taxId ? (
              <MissingDetail label="Add legal name, registration number and TIN" onPress={onEditProfile} />
            ) : null}
          </ProfileCard>
        </ProfileSection>
      ) : null}

      <VerificationSection
        isBusiness={isBusiness}
        isPhoneVerified={user.isPhoneVerified}
        verification={props.verification}
        status={props.verificationStatus}
        canPublishPaidEvents={props.canPublishPaidEvents}
        paidEventsBlockedReason={props.paidEventsBlockedReason}
      />

      {organisation && props.canManage ? (
        <ProfileCard>
          <ProfileNavRow
            icon="briefcase-outline"
            label="Organiser portal"
            sublabel="Posts, stories and the full dashboard"
            onPress={nav.portal}
          />
        </ProfileCard>
      ) : null}
    </>
  );
}

function VerificationSection({
  isBusiness,
  isPhoneVerified,
  verification,
  status,
  canPublishPaidEvents,
  paidEventsBlockedReason,
}: {
  isBusiness: boolean;
  isPhoneVerified: boolean;
  verification?: BusinessVerification;
  status?: BusinessVerificationStatus;
  canPublishPaidEvents: boolean;
  paidEventsBlockedReason?: string;
}) {
  const colors = useColors();
  const router = useRouter();
  const copy = isBusiness ? VERIFICATION_COPY[status ?? "unverified"] : undefined;
  const requirements = verification?.requirements ?? [];
  const action = isBusiness
    ? {
        label: status === "verified" ? "View verification" : status === "pending" ? "View status" : status === "rejected" ? "Fix and resubmit" : "Start verification",
        onPress: () => router.push("/business/verification" as any),
      }
    : !isPhoneVerified
      ? { label: "Verify phone", onPress: () => router.push({ pathname: "/verify-phone", params: { purpose: "settings" } } as any) }
      : undefined;

  return (
    <ProfileSection title="Verification">
      <GlassSurface style={styles.verifyCard}>
        {copy ? (
          <View style={styles.verifyHeader}>
            <Ionicons name={copy.icon} size={22} color={colors[copy.colorKey]} />
            <View style={styles.detailCopy}>
              <Text style={[styles.verifyTitle, { color: colors.foreground }]}>{copy.title}</Text>
              <Text style={[styles.verifyText, { color: colors.mutedForeground }]}>
                {status === "rejected" && verification?.rejectionReason ? verification.rejectionReason : copy.message}
              </Text>
            </View>
          </View>
        ) : null}

        {isBusiness && requirements.length ? (
          <View style={styles.requirements}>
            {requirements.map((r) => (
              <View key={r.id} style={styles.requirement}>
                <Ionicons
                  name={r.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={r.completed ? colors.success : colors.mutedForeground}
                />
                <Text style={[styles.requirementText, { color: colors.foreground }]}>{r.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.requirement}>
            <Ionicons
              name={isPhoneVerified ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={isPhoneVerified ? colors.success : colors.mutedForeground}
            />
            <Text style={[styles.requirementText, { color: colors.foreground }]}>
              {isPhoneVerified ? "Phone verified: you can message attendees" : "Verify your phone to message attendees"}
            </Text>
          </View>
        )}

        <View style={[styles.paidRow, { borderTopColor: colors.border }]}>
          <Ionicons
            name={canPublishPaidEvents ? "pricetag" : "lock-closed-outline"}
            size={16}
            color={canPublishPaidEvents ? colors.success : colors.mutedForeground}
          />
          <Text style={[styles.verifyText, { color: colors.mutedForeground, flex: 1 }]}>
            {canPublishPaidEvents ? "You can publish paid events." : paidEventsBlockedReason}
          </Text>
        </View>
        {action ? (
          <Pressable
            onPress={action.onPress}
            style={({ pressed }) => [styles.verifyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.verifyBtnText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </GlassSurface>
    </ProfileSection>
  );
}

// ---------------------------------------------------------------------------
// Published Events
// ---------------------------------------------------------------------------

export function PublishedEventsTab({ events, canManage }: { events: PublisherEventsState; canManage: boolean }) {
  const nav = usePublisherNav();
  const visible = events.items.filter((m) => m.status !== "paused");
  const upcoming = visible.filter((m) => !isPast(m));
  const past = visible.filter(isPast);

  if (events.isLoading) return <SectionState kind="loading" message="Loading your events…" />;
  if (events.error && !events.items.length) {
    return <SectionState kind="error" message={events.error} onRetry={() => void events.refresh()} />;
  }

  return (
    <>
      <ProfileSection title="Upcoming">
        {upcoming.length ? (
          <ProfileCard>
            {upcoming.map((item) => (
              <EventRow key={item.event.id} item={item} onPress={() => nav.openEvent(item, canManage)} />
            ))}
          </ProfileCard>
        ) : (
          <SectionState
            kind="empty"
            icon="calendar-outline"
            title="No upcoming events"
            message={canManage ? "Events you publish appear here and in discovery." : "You haven't published any events yet."}
            actionLabel={canManage ? "Create event" : undefined}
            onAction={canManage ? nav.createEvent : undefined}
          />
        )}
      </ProfileSection>
      {past.length ? (
        <ProfileSection title="Past">
          <ProfileCard>
            {past.map((item) => (
              <EventRow key={item.event.id} item={item} onPress={() => nav.openEvent(item, canManage)} />
            ))}
          </ProfileCard>
        </ProfileSection>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Event Management
// ---------------------------------------------------------------------------

type ManageFilter = "live" | "paused" | "ended";

export function EventManagementTab({
  events,
  isBusiness,
  paidEventsBlockedReason,
}: {
  events: PublisherEventsState;
  isBusiness: boolean;
  paidEventsBlockedReason?: string;
}) {
  const colors = useColors();
  const nav = usePublisherNav();
  const [filter, setFilter] = useState<ManageFilter>("live");
  const [deleting, setDeleting] = useState<ManagedEvent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const own = events.items;
    return {
      live: own.filter((m) => m.status !== "paused" && !isPast(m)),
      paused: own.filter((m) => m.status === "paused"),
      ended: own.filter((m) => m.status !== "paused" && isPast(m)),
    };
  }, [events.items]);
  const shown = groups[filter];

  const toggle = async (item: ManagedEvent) => {
    setActionError(await events.setStatus(item.event.id, item.status === "paused" ? "published" : "paused"));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setActionError(await events.remove(target.event.id));
  };

  return (
    <>
      <ProfileSection title="Manage">
        <ProfileCard>
          <ProfileNavRow
            icon="add-circle-outline"
            label="Create event"
            sublabel={paidEventsBlockedReason ? "Free events · " + paidEventsBlockedReason : "Free or paid events"}
            onPress={nav.createEvent}
          />
          <ProfileNavRow icon="briefcase-outline" label="Organiser portal" sublabel="Posts, stories and the dashboard" onPress={nav.portal} />
          {isBusiness ? (
            <ProfileNavRow
              icon="business-outline"
              label="Edit organisation"
              sublabel="Name, logo, description and website"
              onPress={nav.editOrganisation}
            />
          ) : null}
        </ProfileCard>
      </ProfileSection>

      <ProfileSection title="Your events">
        <FilterChips
          options={[
            { key: "live" as const, label: "Live", count: groups.live.length },
            { key: "paused" as const, label: "Paused", count: groups.paused.length },
            { key: "ended" as const, label: "Ended", count: groups.ended.length },
          ]}
          active={filter}
          onChange={setFilter}
        />
        {actionError ? <InlineError message={actionError} /> : null}
        {events.isLoading ? (
          <SectionState kind="loading" message="Loading your events…" />
        ) : events.error && !events.items.length ? (
          <SectionState kind="error" message={events.error} onRetry={() => void events.refresh()} />
        ) : shown.length ? (
          <ProfileCard>
            {shown.map((item) => (
              <EventRow
                key={item.event.id}
                item={item}
                onPress={() => nav.openEvent(item, true)}
                trailing={
                  item.manageable ? (
                    <View style={styles.rowActions}>
                      {events.isPending(item.event.id) ? (
                        <ActivityIndicator size="small" color={colors.primary} style={styles.iconBtn} />
                      ) : (
                        <>
                          {!isPast(item) ? (
                            <IconButton
                              icon={item.status === "paused" ? "play-outline" : "pause-outline"}
                              label={item.status === "paused" ? `Resume ${item.event.title}` : `Pause ${item.event.title}`}
                              onPress={() => void toggle(item)}
                            />
                          ) : null}
                          <IconButton
                            icon="trash-outline"
                            label={`Delete ${item.event.title}`}
                            destructive
                            onPress={() => setDeleting(item)}
                          />
                        </>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.viewOnly, { color: colors.mutedForeground }]}>View only</Text>
                  )
                }
              />
            ))}
          </ProfileCard>
        ) : (
          <SectionState
            kind="empty"
            icon={filter === "paused" ? "pause-circle-outline" : "calendar-outline"}
            title={filter === "live" ? "No live events" : filter === "paused" ? "Nothing paused" : "No past events"}
            message={
              filter === "live"
                ? "Create an event to start taking bookings."
                : filter === "paused"
                  ? "Paused events are hidden from discovery until you resume them."
                  : "Events move here after they've happened."
            }
            actionLabel={filter === "live" ? "Create event" : undefined}
            onAction={filter === "live" ? nav.createEvent : undefined}
          />
        )}
        {events.items.some((m) => !m.manageable) ? (
          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            “View only” events were matched to you by organiser name. Contact support to manage them.
          </Text>
        ) : null}
      </ProfileSection>

      <ChatConfirmDialog
        visible={!!deleting}
        title="Delete this event?"
        description={
          deleting
            ? `"${deleting.event.title}" will be removed from your profile and from discovery. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete event"
        destructive
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function IconButton({ icon, label, onPress, destructive }: { icon: IconName; label: string; onPress: () => void; destructive?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={4} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={19} color={destructive ? colors.destructive : colors.foreground} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Analytics & promotions (businesses only)
// ---------------------------------------------------------------------------

const PROMOTION_STATUS: Record<PromotionStatus, { label: string; colorKey: "warning" | "success" | "mutedForeground" | "destructive" }> = {
  in_review: { label: "In review", colorKey: "warning" },
  active: { label: "Active", colorKey: "success" },
  ended: { label: "Ended", colorKey: "mutedForeground" },
  rejected: { label: "Declined", colorKey: "destructive" },
};

const percent = (value: number) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
const compact = (value: number) => (value >= 10000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString());

export function AnalyticsTab({ insights, events }: { insights: InsightsState; events: PublisherEventsState }) {
  const colors = useColors();
  const [promoting, setPromoting] = useState(false);
  const promotable = events.items.filter((m) => m.manageable && m.status === "published" && !isPast(m)).map((m) => m.event);
  const { analytics } = insights;

  if (insights.isLoading && !analytics) return <SectionState kind="loading" message="Loading analytics…" />;
  if (insights.error && !analytics) {
    return <SectionState kind="error" message={insights.error} onRetry={() => void insights.refresh()} />;
  }

  const totals = analytics?.totals;
  const placementTitle = (key: string) => PROMOTION_PLACEMENTS.find((p) => p.key === key)?.title ?? key;

  return (
    <>
      {analytics?.isSample ? (
        <View style={[styles.sampleNote, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}55` }]}>
          <Ionicons name="flask-outline" size={16} color={colors.warning} />
          <Text style={[styles.sampleText, { color: colors.foreground }]}>
            Sample numbers. Live tracking starts when the analytics service is connected.
          </Text>
        </View>
      ) : null}

      <ProfileSection title="Performance">
        {totals && analytics?.events.length ? (
          <View style={styles.metricGrid}>
            <Metric icon="eye-outline" label="Event views" value={compact(totals.views)} />
            <Metric icon="open-outline" label="Website clicks" value={compact(totals.websiteClicks)} />
            <Metric icon="trending-up-outline" label="Click-through" value={percent(totals.clickThroughRate)} />
            <Metric
              icon="people-outline"
              label="Attendance"
              value={percent(totals.fillRate)}
              detail={`${totals.attendees.toLocaleString()} of ${totals.capacity.toLocaleString()}`}
            />
          </View>
        ) : (
          <SectionState
            kind="empty"
            icon="bar-chart-outline"
            title="No data yet"
            message="Views, clicks and attendance appear once you've published an event."
          />
        )}
      </ProfileSection>

      {analytics?.events.length ? (
        <ProfileSection title="By event">
          <ProfileCard>
            {analytics.events.map((e) => (
              <View key={e.eventId} style={styles.perfRow}>
                <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                  {compact(e.views)} views · {compact(e.websiteClicks)} clicks · {e.attendees}/{e.capacity} attending
                </Text>
                <View style={[styles.bar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      { backgroundColor: colors.primary, width: `${e.capacity ? Math.min(100, (e.attendees / e.capacity) * 100) : 0}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </ProfileCard>
        </ProfileSection>
      ) : null}

      <ProfileSection title="Promotions & banners" actionLabel="Promote" onAction={() => setPromoting(true)}>
        {totals && (totals.bannerImpressions > 0 || insights.promotions.some((p) => p.status === "active")) ? (
          <View style={styles.metricGrid}>
            <Metric icon="images-outline" label="Banner impressions" value={compact(totals.bannerImpressions)} />
            <Metric icon="hand-left-outline" label="Banner clicks" value={compact(totals.bannerClicks)} />
          </View>
        ) : null}
        {insights.promotions.length ? (
          <ProfileCard>
            {insights.promotions.map((p) => {
              const status = PROMOTION_STATUS[p.status];
              return (
                <View key={p.id} style={styles.promoRow}>
                  <View style={styles.detailCopy}>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {p.eventTitle}
                    </Text>
                    <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                      {placementTitle(p.placement)} · {p.durationDays} days
                      {p.status === "active" ? ` · ${compact(p.impressions)} seen · ${compact(p.clicks)} clicks` : ""}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: `${colors[status.colorKey]}22` }]}>
                    <Text style={[styles.pillText, { color: colors[status.colorKey] }]}>{status.label}</Text>
                  </View>
                </View>
              );
            })}
          </ProfileCard>
        ) : (
          <SectionState
            kind="empty"
            icon="megaphone-outline"
            title="Reach more people"
            message="Put an event in a home page banner, the Featured section or a category highlight. Placements are paid and reviewed by Eventis."
            actionLabel="Promote an event"
            onAction={() => setPromoting(true)}
          />
        )}
      </ProfileSection>

      <PromotionSheet
        visible={promoting}
        events={promotable}
        onSubmit={insights.request}
        onClose={() => setPromoting(false)}
      />
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: string }) {
  const colors = useColors();
  return (
    <GlassSurface style={styles.metric}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
      {detail ? <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{detail}</Text> : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  eventRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  eventImage: { width: 52, height: 52, borderRadius: 10 },
  eventCopy: { flex: 1, minWidth: 0, gap: 3 },
  eventTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  eventMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rowActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  viewOnly: { fontSize: 11, fontFamily: "Inter_500Medium" },
  footnote: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  description: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", paddingVertical: 12 },
  categoryBlock: { paddingVertical: 12, gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  categoryText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 12 },
  socialBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  verifyCard: { padding: 14, gap: 12 },
  verifyHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  verifyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  verifyText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  requirements: { gap: 8 },
  requirement: { flexDirection: "row", alignItems: "center", gap: 8 },
  requirementText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  verifyBtn: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  verifyBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  paidRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  sampleNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, borderWidth: 1 },
  sampleText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flexBasis: "47%", flexGrow: 1, padding: 14, gap: 4 },
  metricValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  perfRow: { paddingVertical: 12, gap: 4 },
  bar: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  barFill: { height: 6, borderRadius: 3 },
  promoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
});
