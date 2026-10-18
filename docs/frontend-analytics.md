# Frontend activity collection

Analytics currently records device-local activity. There are no analytics network requests, global audience totals, paid conversions, or invented sample results on the organiser dashboard.

The organiser portal presents reporting in the **Insights** tab (`/business/insights`). Event management lives in **My events** (`/business/events`); Overview contains the workspace summary and quick creation actions. All portal tabs share the profile story ring and viewer.

## Measurement

- Impressions (Home/category and search): a loaded event image and at least 50% of the card visible continuously for one second. List viewability starts a cancellable dwell timer; mounting a card alone is not an impression. Existing journal records named `feed_view` remain compatible and represent impressions, never public views.
- Blur, app background, hidden browser tab, Stories and card menus pause/cancel pending feed timers. Re-entering requires another uninterrupted second.
- Public event views: the event details screen remains focused, foreground and unobscured by its menus for one continuous second; origin is propagated by feed/search/Story links. Other links use `direct`. A quick open and exit does not count.
- Deduplication: one impression, event view, story view or story completion per content item and viewer in a rolling 30-minute window, across surfaces/reloads. Replay remains available and watched rings are independent of analytics.
- Own content previews are excluded by explicit `ownerId`; event organiser-name matching is a legacy fallback until every event response contains ownership metadata.
- Saves/unsaves follow successful state changes. Demo saves persist locally. Link copies follow successful clipboard writes. In-app shares follow successful sends; dismissed/failed native shares do not count where the OS reports their outcome. Android can report a share-sheet hand-off, not confirmed recipient delivery.
- Website/maps activity follows successful URL hand-off and does not imply attendance or purchase.
- Stories record loaded playback, natural completion, explicit early close (including Android back) and event-link taps. Skips do not count as completion. Own previews and failed media are excluded.

## Local persistence and reporting

`services/analyticsService.ts` serializes storage writes, assigns stable event IDs and a launch session ID, and retains at most 10,000 records for 90 days. Guest identity is installation/browser-local; authenticated identity is the account ID. Neither represents a guaranteed unique human across accounts/devices.

Dashboard results are filtered to the authenticated publisher's event IDs and story owner ID, across all their organisations. Time ranges are 7/30 local calendar days; the previous comparison uses the preceding period. Empty denominators display `—`. Engagement rate is distinct reached viewers who saved/shared/copied divided by distinct feed viewers. Story completion is distinct completed viewer–story pairs divided by viewed pairs. Save/unsave figures are actions, not the current global number of bookmarks.

Public cards count recorded `detail_view` activity only, including acknowledged history. Legacy mock `viewCount` totals and feed impressions are excluded because they do not represent qualified detail opens. Insights trends, period comparisons and rankings use the same event-view definition; impressions and unique feed reach remain separate. Device records cannot be authoritative across installations.

## Backend hand-off (not implemented)

Use `getPendingAnalytics(viewerId, limit)` to obtain the current identity's records and `acknowledgeAnalytics(viewerId, acceptedIds)` only after a successful server response. Acknowledgement keeps historical records for local reporting. No endpoint, upload loop or auth policy is assumed. Guests require a separately agreed anonymous upload policy.

The backend must derive authenticated identity, validate content ownership/availability, deduplicate immutable record IDs and view windows, exclude creators/bots, rate-limit ingestion, and aggregate unique reach and daily metrics. It must define anonymous identity, retention and reporting time zones. Supply `ownerId` and (where applicable) `organisationId` on events. Do not trust client counters or use this journal as a payment ledger.

Once server aggregates are available, switch cards/dashboard to server values and reconcile acknowledgements with a server watermark so pending local counts are not double-counted. Reservation, sales, revenue, attendance and fill-rate cards remain unavailable until booking/payment reporting exists.
