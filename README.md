# Eventis mobile app

[![CI](https://github.com/Eventis-Rw/Eventis-mobile-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Eventis-Rw/Eventis-mobile-app/actions/workflows/ci.yml)

The Eventis app for Android and iOS. Expo SDK 54, React Native, Expo Router.

> **Imported as-is.** This repository was carried over from the original Replit
> workspace without restructuring, deliberately, so that no working screen was lost in
> a migration. It does not yet follow the layered architecture the other Eventis
> repositories use, and it stays on **pnpm** rather than Bun. Both are known and
> intentional — see [Status](#status).

## Quick start

```bash
pnpm install                                    # pnpm only — the preinstall hook enforces it
pnpm --filter @workspace/mobile run dev
```

Everything at once (app plus the legacy local API):

```bash
pnpm start
```

Typecheck:

```bash
pnpm run typecheck
```

## Layout

```
artifacts/
├── mobile/              the app — this is the product
│   ├── app/             Expo Router screens
│   │   ├── (tabs)/      home, search, tickets, chat, profile
│   │   ├── auth/        welcome, register, OTP
│   │   ├── event/       event detail
│   │   ├── booking/     booking confirmation
│   │   └── business/    organizer register, dashboard, create event
│   ├── components/      EventCard, BannerCarousel, TicketCard, OTPInput, …
│   ├── constants/       colors.ts (design tokens), mockData.ts
│   ├── context/         Auth, Bookings, Events
│   └── assets/
├── api-server/          LEGACY — see below
└── mockup-sandbox/      scratch
lib/                     api-spec, api-zod, api-client-react, db
```

## `artifacts/api-server/` is superseded — do not build on it

The real API is **[Eventis-api](https://github.com/Eventis-Rw/Eventis-api)**: NestJS on
Fastify, layered controller → service → repository → domain, with a double-entry ledger
and enforced module boundaries.

The Express server in this repository was a prototype. It has no service or repository
layer, no ledger, no idempotency and no payment state machine. It ships with the import
so nothing is lost, and it is kept only for running the existing screens locally.

Any new backend work goes in `Eventis-api`. Any new endpoint this app needs is defined
first in **[Eventis-contracts](https://github.com/Eventis-Rw/Eventis-contracts)**.

## Design

Dark midnight ground (`#0c0c1a`) with electric violet accent (`#7c3aed`). These same
values are the basis of `@eventis/tokens`, shared with the web app and the website, so
the products look like one company.

- Colours come from `useColors()`. **No hardcoded hex values in screens.**
- `useSafeAreaInsets()` for safe areas.
- No emojis in UI.
- `SymbolView` (SF Symbols) renders on iOS only — use a `Platform.OS === 'ios'` ternary
  with `Feather` elsewhere.

## Status

Known gaps, tracked rather than hidden:

| Area | State |
|---|---|
| Architecture | Flat. Not yet aligned with the layered structure used elsewhere. |
| Package manager | pnpm. Stays pnpm — the preinstall hook hard-fails on anything else and the workspace carries a catalog plus ~80 platform overrides. |
| Contracts | Hand-written types. Should import `@eventis/contracts` instead — that is the whole reason the stack is TypeScript end to end. |
| OTP | Demo only: any six-digit code is accepted. **Must not reach production.** |
| Payments | Redirects to an external organizer site. The real flow is checkout against `Eventis-api` with server-verified confirmation. |
| Tickets / QR | Not implemented. Needs the Ed25519 signed payload and offline scanner (Eventis-api ADR 0008). |

## Documentation

- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
- Architecture decisions: [Eventis-api/docs/adr](https://github.com/Eventis-Rw/Eventis-api/tree/main/docs/adr)

## Licence

MIT — see [LICENSE](LICENSE).
