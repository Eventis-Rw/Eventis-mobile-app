const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the real modules against an in-memory storage adapter; no RN runtime required.
process.env.NODE_ENV = "test";
let stored = new Map();
const storage = {
  getItem: async (key) => stored.get(key) ?? null,
  setItem: async (key, value) => {
    stored.set(key, value);
  },
  getAllKeys: async () => [...stored.keys()],
  multiRemove: async (keys) => keys.forEach((k) => stored.delete(k)),
};
class ApiError extends Error {}
const apiStub = { api: {}, ApiError };

function load(relPath, resolve) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exportsObject = {};
  new Function("require", "exports", "process", compiled)(
    (name) => {
      const mod = resolve(name);
      if (!mod) throw new Error(`Unexpected dependency: ${name}`);
      return mod;
    },
    exportsObject,
    process,
  );
  return exportsObject;
}

const profile = load("services/profileService.ts", (name) => {
  if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
  if (name === "@/utils/apiClient") return apiStub;
});
const { getAccountCapabilities } = load("utils/accountCapabilities.ts", (name) => {
  if (name === "@/services/profileService") return profile;
});

const customer = load("utils/customerProfile.ts", (name) => {
  if (name === "@/services/profileService") return profile;
});

const publisher = load("services/publisherService.ts", (name) => {
  if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
  if (name === "@/utils/apiClient") return apiStub;
  if (name === "@/services/profileService") return profile;
});

const validation = load("utils/profileValidation.ts", () => undefined);

beforeEach(() => {
  stored = new Map();
});

test("notification preferences default sensibly and persist per user", async () => {
  const defaults = await profile.fetchNotificationPreferences("u1");
  assert.deepEqual(defaults, profile.DEFAULT_NOTIFICATION_PREFERENCES);
  assert.equal(defaults.promotional, false);

  await profile.updateNotificationPreferences("u1", { promotional: true, categoryUpdates: false });
  const reloaded = await profile.fetchNotificationPreferences("u1");
  assert.equal(reloaded.promotional, true);
  assert.equal(reloaded.categoryUpdates, false);
  assert.equal(reloaded.bookingUpdates, true);

  assert.equal((await profile.fetchNotificationPreferences("u2")).promotional, false);
});

test("discovery preferences drop 'All', duplicates and blank locations", async () => {
  const saved = await profile.updateDiscoveryPreferences("u1", {
    categories: ["All", "Music", "Music", "Tech"],
    location: "   ",
  });
  assert.deepEqual(saved, { categories: ["Music", "Tech"], location: undefined });
  assert.deepEqual((await profile.fetchDiscoveryPreferences("u1")).categories, ["Music", "Tech"]);
});

test("saved organisers are a private bookmark list without duplicates", async () => {
  const id = profile.organiserIdFromName("  Kigali Jazz Junction ");
  assert.equal(id, "org_kigali-jazz-junction");

  await profile.saveOrganiser("u1", { id, name: "Kigali Jazz Junction" });
  await profile.saveOrganiser("u1", { id, name: "Kigali Jazz Junction" });
  let list = await profile.fetchSavedOrganisers("u1");
  assert.equal(list.length, 1);
  assert.ok(list[0].savedAt);
  assert.equal("followersCount" in list[0], false);

  await profile.removeSavedOrganiser("u1", id);
  list = await profile.fetchSavedOrganisers("u1");
  assert.equal(list.length, 0);
});

test("reviews are validated and one per event", async () => {
  await assert.rejects(profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 0 }), /1 to 5/);
  await assert.rejects(
    profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 4, comment: "x".repeat(501) }),
    /500/,
  );

  const first = await profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 3, comment: "  ok  " });
  assert.equal(first.comment, "ok");
  const edited = await profile.submitReview("u1", { eventId: "e1", eventTitle: "A", rating: 5 });
  assert.equal(edited.id, first.id);
  const reviews = await profile.fetchMyReviews("u1");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].rating, 5);

  await profile.deleteReview("u1", first.id);
  assert.equal((await profile.fetchMyReviews("u1")).length, 0);
});

test("business verification requires a verified phone and valid details", async () => {
  const initial = await profile.fetchBusinessVerification("u1", "org1", false);
  assert.equal(initial.status, "unverified");
  assert.equal(initial.requirements.find((r) => r.id === "phone").completed, false);

  const input = {
    legalName: "Kigali Jazz Ltd",
    registrationNumber: "RDB-123",
    taxId: "123 456 789",
    representativeName: "Aline",
    paymentWebsite: "https://tickets.kigalijazz.rw",
    registrationDocumentUri: "file:///cert.jpg",
  };
  await assert.rejects(profile.submitBusinessVerification("u1", "org1", false, input), /phone/);
  await assert.rejects(
    profile.submitBusinessVerification("u1", "org1", true, { ...input, taxId: "12" }),
    /9-digit TIN/,
  );
  await assert.rejects(
    profile.submitBusinessVerification("u1", "org1", true, { ...input, paymentWebsite: "tickets" }),
    /payment|website/i,
  );
  await assert.rejects(
    profile.submitBusinessVerification("u1", "org1", true, { ...input, registrationDocumentUri: "" }),
    /certificate/,
  );

  const submitted = await profile.submitBusinessVerification("u1", "org1", true, input);
  assert.equal(submitted.status, "pending");
  assert.ok(submitted.requirements.every((r) => r.completed));
  assert.equal((await profile.fetchBusinessVerification("u1", "org1", true)).status, "pending");

  const declined = await profile.demoReviewBusinessVerification("u1", "org1", "rejected");
  assert.equal(declined.status, "rejected");
  assert.ok(declined.rejectionReason);
  const approved = await profile.demoReviewBusinessVerification("u1", "org1", "verified");
  assert.equal(approved.status, "verified");
  assert.equal(approved.rejectionReason, undefined);
});

test("phone codes are 4 digits and the demo wrong code is rejected", async () => {
  assert.match(profile.validatePhoneCode("12a4"), /4-digit/);
  const request = await profile.requestPhoneVerification("+250 788 123 456");
  assert.equal(request.resendAfterSeconds, profile.PHONE_CODE_RESEND_SECONDS);
  await assert.rejects(profile.confirmPhoneVerification("+250 788 123 456", profile.DEMO_WRONG_CODE), /isn't right/);
  const ok = await profile.confirmPhoneVerification("+250 788 123 456", "4821");
  assert.equal(ok.isPhoneVerified, true);
});

test("paid publishing stays locked until a business is verified", () => {
  for (const businessVerification of ["unverified", "pending", "rejected"]) {
    const caps = getAccountCapabilities({ accountType: "business", hasOrganiserAccess: true, isPhoneVerified: true, businessVerification });
    assert.equal(caps.canPublishPaidEvents, false, businessVerification);
    assert.match(caps.paidEventsBlockedReason, /verification/);
  }
});

test("clearing local data only removes that user's profile slices", async () => {
  await profile.updateNotificationPreferences("u1", { promotional: true });
  await profile.updateNotificationPreferences("u2", { promotional: true });
  stored.set("@eventis_user_cache", "{}");
  await profile.clearLocalProfileData("u1");
  assert.equal((await profile.fetchNotificationPreferences("u1")).promotional, false);
  assert.equal((await profile.fetchNotificationPreferences("u2")).promotional, true);
  assert.ok(stored.has("@eventis_user_cache"));
});

const tabKeys = (caps) => caps.profileTabs.map((t) => t.key);

test("customers see the customer tabs and no publisher tools", () => {
  const caps = getAccountCapabilities({ accountType: "customer", hasOrganiserAccess: false, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "bookings", "tickets", "saved-organisers", "reviews"]);
  assert.equal(caps.canManageEvents, false);
  assert.equal(caps.canViewAnalytics, false);
  assert.equal(caps.settings.businessVerification, false);
  assert.equal(caps.settings.editBusinessProfile, false);
  assert.equal(caps.settings.savedOrganiserNotifications, true);
});

test("saved-organiser alerts are offered only to customers", () => {
  for (const accountType of ["individual", "business"]) {
    const caps = getAccountCapabilities({ accountType, hasOrganiserAccess: true, isPhoneVerified: true });
    assert.equal(caps.settings.savedOrganiserNotifications, false, accountType);
    assert.equal(caps.settings.notifications, true, accountType);
  }
});

test("unsupported features are hidden rather than shown", () => {
  const features = { ...profile.PROFILE_FEATURES, savedOrganisers: false, reviews: false };
  const caps = getAccountCapabilities({
    accountType: "customer",
    hasOrganiserAccess: false,
    isPhoneVerified: true,
    features,
  });
  assert.deepEqual(tabKeys(caps), ["overview", "bookings", "tickets"]);
  assert.equal(caps.settings.savedOrganiserNotifications, false);
  assert.equal(caps.settings.blockedUsers, false);
  assert.equal(caps.settings.accountVisibility, false);
  assert.equal(caps.settings.languagePreference, false);
});

test("individual posters manage events but cannot publish paid events or see analytics", () => {
  const caps = getAccountCapabilities({ accountType: "individual", hasOrganiserAccess: true, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "published", "manage"]);
  assert.equal(caps.canPublishPaidEvents, false);
  assert.match(caps.paidEventsBlockedReason, /business/);
  assert.equal(caps.settings.businessVerification, false);
});

test("publishers without organiser access only see their published events", () => {
  const caps = getAccountCapabilities({ accountType: "business", hasOrganiserAccess: false, isPhoneVerified: true });
  assert.deepEqual(tabKeys(caps), ["overview", "published"]);
  assert.equal(caps.canManageEvents, false);
  assert.equal(caps.canPromote, false);
});

test("paid publishing is unlocked only for verified businesses", () => {
  const base = { accountType: "business", hasOrganiserAccess: true, isPhoneVerified: true };
  for (const status of [undefined, "unverified", "pending", "rejected"]) {
    const caps = getAccountCapabilities({ ...base, businessVerification: status });
    assert.equal(caps.canPublishPaidEvents, false, `status ${status}`);
    assert.match(caps.paidEventsBlockedReason, /verification/);
  }
  const verified = getAccountCapabilities({ ...base, businessVerification: "verified" });
  assert.deepEqual(tabKeys(verified), ["overview", "published", "manage", "analytics"]);
  assert.equal(verified.canPublishPaidEvents, true);
  assert.equal(verified.paidEventsBlockedReason, undefined);
  assert.equal(verified.settings.businessVerification, true);
});

const booking = (over) => ({
  id: over.id,
  eventId: over.eventId ?? `ev_${over.id}`,
  eventTitle: "Event",
  eventDate: "2026-10-01",
  eventTime: "18:00",
  eventLocation: "Kigali",
  eventImage: "concert",
  userId: "u1",
  status: "confirmed",
  ticketCode: `EVT-${over.id}`,
  quantity: 1,
  totalPrice: 0,
  currency: "RWF",
  purchasedAt: "2026-09-01T00:00:00.000Z",
  isPaid: false,
  ...over,
});

test("bookings split into upcoming, past and cancelled", () => {
  const groups = customer.groupBookings(
    [
      booking({ id: "a", eventDate: "2026-12-01" }),
      booking({ id: "b", eventDate: "2026-11-01" }),
      booking({ id: "c", eventDate: "2026-09-01" }),
      booking({ id: "d", eventDate: "2026-12-05", status: "cancelled" }),
    ],
    "2026-10-11",
  );
  assert.deepEqual(groups.upcoming.map((b) => b.id), ["b", "a"]);
  assert.deepEqual(groups.past.map((b) => b.id), ["c"]);
  assert.deepEqual(groups.cancelled.map((b) => b.id), ["d"]);
});

test("only attended, unreviewed events wait for a review, once per event", () => {
  const pending = customer.reviewableBookings(
    [
      booking({ id: "past1", eventId: "e1", eventDate: "2026-09-01" }),
      booking({ id: "past1b", eventId: "e1", eventDate: "2026-09-01" }),
      booking({ id: "reviewed", eventId: "e2", eventDate: "2026-09-02" }),
      booking({ id: "cancelled", eventId: "e3", eventDate: "2026-09-03", status: "cancelled" }),
      booking({ id: "pending", eventId: "e4", eventDate: "2026-09-04", status: "pending" }),
      booking({ id: "future", eventId: "e5", eventDate: "2026-12-01" }),
    ],
    [{ id: "r1", eventId: "e2", eventTitle: "Event", rating: 4, createdAt: "2026-09-03" }],
    "2026-10-11",
  );
  assert.deepEqual(pending.map((b) => b.eventId), ["e1"]);
});

test("organiser events match by organiser id, ignoring case and spacing", () => {
  const events = [
    { id: "1", organizer: "Kigali Jazz Club" },
    { id: "2", organizer: "  kigali jazz club " },
    { id: "3", organizer: "Other Host" },
  ];
  const id = profile.organiserIdFromName("Kigali Jazz Club");
  assert.deepEqual(customer.eventsByOrganiser(events, id).map((e) => e.id), ["1", "2"]);
});

test("ticket pattern is stable per code and differs between codes", () => {
  const a = customer.ticketPattern("EVT-ABC123", 9);
  assert.deepEqual(a, customer.ticketPattern("EVT-ABC123", 9));
  assert.notDeepEqual(a, customer.ticketPattern("EVT-XYZ789", 9));
  assert.equal(a.length, 9);
  assert.ok(a.every((row) => row.length === 9));
  // Finder corners are always solid.
  assert.ok(a[0][0] && a[0][8] && a[8][0]);
});

const eventInput = (over = {}) => ({
  title: "Rooftop Jazz",
  description: "Live jazz on the roof.",
  category: "Music",
  location: "Kigali Heights, Kigali",
  date: "2099-01-15",
  time: "19:30",
  capacity: 120,
  isPaid: false,
  price: 0,
  ...over,
});

test("event input validation covers dates, times, capacity and paid rules", () => {
  const today = "2026-10-11";
  assert.equal(publisher.validateEventInput(eventInput(), today), null);
  assert.match(publisher.validateEventInput(eventInput({ title: " " }), today), /title/);
  assert.match(publisher.validateEventInput(eventInput({ date: "15/01/2099" }), today), /YYYY-MM-DD/);
  assert.match(publisher.validateEventInput(eventInput({ date: "2026-10-10" }), today), /past/);
  assert.match(publisher.validateEventInput(eventInput({ time: "7pm" }), today), /HH:MM/);
  assert.match(publisher.validateEventInput(eventInput({ capacity: 0 }), today), /Capacity/);
  assert.match(publisher.validateEventInput(eventInput({ isPaid: true, price: 0 }), today), /price/);
  assert.match(
    publisher.validateEventInput(eventInput({ isPaid: true, price: 5000, websiteUrl: "tickets" }), today),
    /website/,
  );
  assert.equal(
    publisher.validateEventInput(eventInput({ isPaid: true, price: 5000, websiteUrl: "https://tix.rw/jazz" }), today),
    null,
  );
});

test("publishers create, edit, pause and delete only their own events", async () => {
  const created = await publisher.createPublisherEvent("u1", "Jazz Co", eventInput());
  assert.equal(created.status, "published");
  assert.equal(created.organizer, "Jazz Co");
  assert.equal(created.city, "Kigali");
  await publisher.createPublisherEvent("u2", "Other", eventInput({ title: "Other event" }));

  assert.deepEqual((await publisher.fetchPublisherEvents("u1")).map((e) => e.id), [created.id]);

  const edited = await publisher.updatePublisherEvent("u1", created.id, eventInput({ title: "Rooftop Jazz II" }));
  assert.equal(edited.title, "Rooftop Jazz II");

  await publisher.setPublisherEventStatus("u1", created.id, "paused");
  assert.deepEqual((await publisher.fetchDemoPublishedEvents()).map((e) => e.title), ["Other event"]);

  await assert.rejects(publisher.deletePublisherEvent("u2", created.id), /no longer exists/);
  await publisher.deletePublisherEvent("u1", created.id);
  assert.equal((await publisher.fetchPublisherEvents("u1")).length, 0);
});

test("free events drop any price or payment site", async () => {
  const created = await publisher.createPublisherEvent(
    "u1",
    "Jazz Co",
    eventInput({ isPaid: false, price: 9000, websiteUrl: "https://tix.rw" }),
  );
  assert.equal(created.isPaid, false);
  assert.equal(created.price, 0);
  assert.equal(created.organizerWebsite, undefined);
});

test("analytics totals derive rates safely", () => {
  const empty = publisher.summariseAnalytics([], { impressions: 0, clicks: 0 }, true);
  assert.equal(empty.totals.clickThroughRate, 0);
  assert.equal(empty.totals.fillRate, 0);

  const summary = publisher.summariseAnalytics(
    [
      { eventId: "a", title: "A", views: 200, websiteClicks: 10, attendees: 50, capacity: 100 },
      { eventId: "b", title: "B", views: 300, websiteClicks: 15, attendees: 150, capacity: 100 },
    ],
    { impressions: 40, clicks: 4 },
    false,
  );
  assert.equal(summary.totals.views, 500);
  assert.equal(summary.totals.clickThroughRate, 0.05);
  assert.equal(summary.totals.fillRate, 1);
  assert.equal(summary.totals.bannerImpressions, 40);
});

test("promotion requests are validated and not duplicated while in review", async () => {
  assert.match(publisher.validatePromotionRequest({}), /event/);
  assert.match(publisher.validatePromotionRequest({ eventId: "e1" }), /where/);
  assert.match(publisher.validatePromotionRequest({ eventId: "e1", placement: "featured", durationDays: 5 }), /how long/);

  const input = { eventId: "e1", eventTitle: "Jazz", placement: "home_banner", durationDays: 7 };
  const promo = await publisher.requestPromotion("u1", input);
  assert.equal(promo.status, "in_review");
  await assert.rejects(publisher.requestPromotion("u1", input), /already/);
  assert.equal((await publisher.fetchPromotions("u1")).length, 1);
  assert.equal((await publisher.fetchPromotions("u2")).length, 0);
});

test("publisher profile keeps social links when other fields change", async () => {
  await profile.updatePublisherProfile("u1", { socialLinks: { instagram: "https://instagram.com/jazz" } });
  const updated = await profile.updatePublisherProfile("u1", { categories: ["Music"] });
  assert.deepEqual(updated.categories, ["Music"]);
  assert.equal(updated.socialLinks.instagram, "https://instagram.com/jazz");
  assert.deepEqual((await profile.fetchPublisherProfile("u2")).socialLinks, {});
});

test("profile names, phones, emails and websites are validated", () => {
  assert.equal(validation.validateUsername("Aline U."), undefined);
  assert.match(validation.validateUsername(" a "), /2 characters/);
  assert.match(validation.validateUsername("bad<name>"), /letters/);

  assert.equal(validation.validatePhone(""), undefined);
  assert.match(validation.validatePhone("", { required: true }), /Enter/);
  assert.equal(validation.validatePhone("+250 788 123 456"), undefined);
  assert.match(validation.validatePhone("12345"), /full phone/);
  assert.match(validation.validatePhone("+250 abc"), /digits/);
  assert.ok(validation.samePhone("+250 788 123 456", "+250788123456"));

  assert.equal(validation.validateEmail("hi@eventis.rw"), undefined);
  assert.match(validation.validateEmail("hi@eventis"), /valid email/);

  assert.equal(validation.validateWebsite("eventis.rw"), undefined);
  assert.equal(validation.normaliseWebsite("eventis.rw"), "https://eventis.rw");
  assert.match(validation.validateWebsite("not a site"), /valid website/);
});

test("social links accept handles or links on the right platform", () => {
  assert.equal(validation.normaliseSocialLink("instagram", "@kigalijazz"), "https://instagram.com/kigalijazz");
  assert.equal(validation.normaliseSocialLink("x", "twitter.com/kigalijazz"), "https://twitter.com/kigalijazz");
  assert.equal(validation.normaliseSocialLink("tiktok", "kigalijazz"), "https://tiktok.com/@kigalijazz");
  assert.equal(validation.normaliseSocialLink("instagram", "  "), undefined);

  assert.equal(validation.validateSocialLink("instagram", "https://www.instagram.com/kigalijazz"), undefined);
  assert.equal(validation.validateSocialLink("youtube", "https://youtu.be/abc"), undefined);
  assert.match(validation.validateSocialLink("instagram", "https://facebook.com/kigalijazz"), /Instagram link/);
  assert.match(validation.validateSocialLink("facebook", "https://facebook.com/"), /link or username/);
});

test("legal identity and categories are validated", () => {
  assert.equal(validation.validateTaxId("123 456 789"), undefined);
  assert.match(validation.validateTaxId("12345"), /9 digits/);
  assert.equal(validation.validateTaxId(""), undefined);
  assert.equal(validation.validateRegistrationNumber("RDB-102938"), undefined);
  assert.match(validation.validateRegistrationNumber("a b"), /letters/);
  assert.equal(validation.validateCategories(["Music", "Food"]), undefined);
  assert.match(validation.validateCategories(["a", "b", "c", "d", "e", "f"]), /up to 5/);
});
