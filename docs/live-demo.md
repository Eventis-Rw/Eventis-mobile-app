# Eventis Live demo

Built against `Eventis_Live_Feature_Specification.pdf`. The agreed scope is an interactive, device-local demo; camera/microphone transmission and real payments are not enabled.

## Try it

1. Open **Live** from the main tabs, or **Live** under organiser dashboard quick create.
2. Join a sample video or voice room. Send chat, react, or choose and confirm a gift.
3. Choose **Join stage**, open **Participants → Simulate host response**, and approve the request. You can also simulate an invitation and accept/decline it yourself.
4. Choose **Go Live → Try a demo Live**, add a title, choose video/voice and optionally link a published event. Start the room.
5. In **Controls → Simulate demo participants**, join as a sample viewer and request a seat. Go to **Manage requests** to accept/reject, invite, remove, mute chat, or block.
6. End the session to see its reaction/gift summary. Open the wallet to inspect spending and gift history.
7. **Demo controls** below discovery can fill the five room slots, free a sample slot, or reset the demo after confirmation. Fill the rooms, request a Live, then free a slot to test the waiting queue. A ready slot requires an explicit start; it never enables a broadcast automatically.

## State and boundaries

- `services/liveState.ts` owns room, guest, chat, queue, moderation and gift transitions. This is a simulator, **not** server authorization.
- `hooks/useLiveDemo.ts` persists account-scoped state under `@eventis_live_demo_v1:<userId>`. Writes are serialized and UI commits happen after successful persistence.
- Each preview starts with 500 demo spending coins. Gifts have unique transaction IDs, duplicate prevention, balance checks, a daily spending limit, and host/guest identities at gift time. Hosts and guests cannot gift their own room. No real cross-account fraud protection is claimed.
- Gifts are recorded gross, without allocating revenue: the document's 70/20/10 is illustrative and the team has not approved a split or a no-guest policy. Demo coins are never represented as withdrawable cash.
- Five simultaneous rooms, four guests, 30 minutes per room, and one host session per UTC day. Expiry uses wall-clock timestamps, including after backgrounding/reload. Resetting the demo explicitly resets these test limits and its wallet/history.
- Eligibility displays a local progress estimate from published events and measured detail views. Local analytics cannot establish genuine platform-wide views or account safety. Organiser subscription is not treated as verification. Real access remains pending server approval.
- Sample participants and host actions are available only through explicitly labeled simulation controls. No automatic fake chat or viewer counts are presented as real traffic.
- No cross-device room synchronization, camera preview/capture, media transport, payment crediting, or withdrawals are implemented in this iteration. Room covers illustrate video mode.

## Production integration decisions still needed

Choose a media/realtime provider and server-issued room tokens; enforce membership, guest capacity, eligibility, moderation, duration, daily quotas and queue leases on the server. Replace local mutations with acknowledged server commands and realtime room snapshots. Stop tracks on leaving, logout and disconnection; handle permissions and reconnection in the transport adapter.

Confirm launch markets, payment/payout providers, coin prices, age/identity requirements, revenue percentages, multiple-guest allocation and no-guest policy. Payments need verified provider callbacks, idempotent ledger entries, separate spending/earnings balances, audit records and fraud controls before any real money is enabled.

Run `pnpm test:live` for domain behavior and `pnpm typecheck` for integration checks. A device run is still needed to validate native keyboard, safe-area and Android back behavior.

## Verification performed

- 13 domain tests passed, including capacity/FIFO queueing, eligibility, guest consent and limits, moderation, duplicate gifts, spending caps, wall-clock expiry and corrupt-cache validation.
- TypeScript and `git diff --check` passed.
- Mobile-sized Chrome flow passed: discovery → viewer chat/gift → request/approval → wallet → voice setup → host guest acceptance → end summary → reload persistence.
- Browser edge-case flow passed: fill capacity → queue → free slot → explicitly start; reject second daily session; decline/accept host invitations; recover damaged demo storage. No uncaught browser runtime exceptions were recorded in either flow.
