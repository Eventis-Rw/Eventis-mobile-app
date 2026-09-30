# Eventis mobile app

[![CI](https://github.com/Eventis-Rw/Eventis-mobile-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Eventis-Rw/Eventis-mobile-app/actions/workflows/ci.yml)

The Eventis app for Android and iOS. Expo SDK 54, React Native, Expo Router.

> This repository stays on **pnpm** rather than Bun — intentional; see [Status](#status).

## Quick start

```bash
pnpm install                                    # pnpm only — the preinstall hook enforces it
pnpm --filter @workspace/mobile run dev
```

Everything at once (app plus the legacy local API):

```bash
pnpm expo start
```

Typecheck:

```bash
pnpm run typecheck
```

## Layout

```
artifacts/
├── mobile/                 the app — this is the product
│   ├── app/                Expo Router routes only (thin re-exports)
│   │   ├── (tabs)/         home, search, tickets, chat, profile
│   │   ├── auth/           welcome, register, OTP
│   │   ├── event/          event detail
│   │   ├
│   │   └── business/       organizer register, dashboard, create event
│   ├── features/           screen UI + feature-owned components
│   │   ├── auth/           WelcomeScreen, OtpScreen, RegisterScreen, OTPInput
│   │   ├── events/         HomeScreen, SearchScreen, EventDetailScreen
│   │   ├
│   │   ├── business/       BusinessRegister, Dashboard, CreateEvent
│   │   ├── chat/           ChatScreen
│   │   └── profile/        ProfileScreen, EditProfileScreen
│   ├── components/         shared UI (EventCard, BannerCarousel, …)
│   ├── context/            Auth, Bookings, Events providers
│   ├── services/           apiClient — single API access layer
│   ├── hooks/              shared hooks (useColors)
│   ├── constants/          colors.ts, mockData.ts
│   ├── global.css          Tailwind entry (NativeWind)
│   ├── tailwind.config.js  design tokens + content paths
│   ├── assets/
│   ├── scripts/build.js    Replit/web static build
│   └── server/             static serve for production artifact
├── api-server/             LEGACY — see below
lib/                        api-spec, api-zod, api-client-react, db
```

## Project structure & developer guide

Where to put new work in `artifacts/mobile`:

| What | Where | Reference |
|------|--------|-----------|
| New screen / route | Add a thin file under `app/` (Expo Router path), implement the screen under `features/<domain>/` | Route: [`app/auth/otp.tsx`](artifacts/mobile/app/auth/otp.tsx) → screen: [`features/auth/OtpScreen.tsx`](artifacts/mobile/features/auth/OtpScreen.tsx) |
| New feature area | `features/<name>/` with `*Screen.tsx` and optional `components/` when UI is feature-only | [`features/bookings/`](artifacts/mobile/features/bookings) |
| Reusable UI (2+ features) | `components/` | [`components/EventCard.tsx`](artifacts/mobile/components/EventCard.tsx) |
| Feature-only UI | `features/<name>/components/` | [`features/auth/components/OTPInput.tsx`](artifacts/mobile/features/auth/components/OTPInput.tsx) |
| API call | `services/apiClient.ts` (`api.get/post/…`), usually from a context | [`services/apiClient.ts`](artifacts/mobile/services/apiClient.ts), [`context/AuthContext.tsx`](artifacts/mobile/context/AuthContext.tsx) |
| Custom shared hook | `hooks/` | [`hooks/useColors.ts`](artifacts/mobile/hooks/useColors.ts) |
| Type / interface | Colocate next to its owner (context or `constants/mockData.ts`) until a shared `types/` folder is justified | [`context/AuthContext.tsx`](artifacts/mobile/context/AuthContext.tsx) (`User`), [`constants/mockData.ts`](artifacts/mobile/constants/mockData.ts) (`Event`) |
| Pure helper | `utils/` (create when needed) | — |
| Asset | `assets/images/` and update `app.json` if it is icon/splash/favicon | [`assets/images/icon.png`](artifacts/mobile/assets/images/icon.png) |
| Navigation | Expo Router file under `app/`; stack/tabs options in layout files | [`app/_layout.tsx`](artifacts/mobile/app/_layout.tsx), [`app/(tabs)/_layout.tsx`](artifacts/mobile/app/(tabs)/_layout.tsx) |
| Global state | `context/` for session and app-wide stores | [`context/AuthContext.tsx`](artifacts/mobile/context/AuthContext.tsx) |

Route files must stay thin: compose or re-export a feature screen; keep route URLs and Expo Router conventions (`_layout.tsx`, `(tabs)`, `[id].tsx`) unchanged. Do not edit Orval `generated/` folders under `lib/`.

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

Styling is **NativeWind v4** (Tailwind CSS for React Native). Tokens live in
[`artifacts/mobile/tailwind.config.js`](artifacts/mobile/tailwind.config.js) and
[`artifacts/mobile/constants/colors.ts`](artifacts/mobile/constants/colors.ts).

- Prefer `className` with theme tokens (`bg-background dark:bg-background-dark`, `text-primary`, …).
- Keep `useColors()` for icon tints, `ActivityIndicator`, gradients, and other JS color props.
- `useSafeAreaInsets()` for safe areas.
- No emojis in UI.
- `SymbolView` (SF Symbols) renders on iOS only — use a `Platform.OS === 'ios'` ternary
  with `Feather` elsewhere.

## Status

Known gaps, tracked rather than hidden:

| Area | State |
|---|---|
| Architecture | Feature folders + thin Expo Router routes. Server state still in Context (not react-query); `@workspace/api-client-react` is unused scaffold. |
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
