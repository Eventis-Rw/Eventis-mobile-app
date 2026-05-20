# Eventis

A full-featured event discovery and booking mobile app built with Expo/React Native.

## Run & Operate

- Mobile app runs via the `artifacts/mobile: expo` workflow
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, React Native, Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app (main product)
  - `app/` — Expo Router screens
    - `(tabs)/` — Home, Search, Tickets, Chat, Profile tabs
    - `auth/` — Welcome, Register, OTP screens
    - `event/[id].tsx` — Event detail
    - `booking/[id].tsx` — Booking confirmation modal
    - `business/` — Register, Dashboard, Create Event
  - `components/` — EventCard, BannerCarousel, CategoryPill, TicketCard, OTPInput, SkeletonLoader
  - `constants/colors.ts` — Design tokens (dark midnight + electric violet)
  - `constants/mockData.ts` — Mock events, categories, conversations
  - `context/` — AuthContext, BookingsContext, EventsContext
  - `hooks/useColors.ts` — Theme hook (dark/light aware)
  - `assets/images/` — App icon + banner images (concert, tech, food)

## Architecture decisions

- Auth redirect handled exclusively in `app/_layout.tsx` via `useSegments` + `useRouter` — screens do not self-redirect
- No direct payment processing — paid events redirect to organizer's external website via `Linking.openURL`
- OTP verification is demo-only (any 6-digit code accepted) — hook is `useAuth().requestOTP` / `verifyOTP`
- `EventsContext` provides filtered events app-wide; local state used on Home for category filter
- iOS 26+: NativeTabs with liquid glass; older iOS / Android / Web: classic Tabs with BlurView / solid bg

## Product

- **Customer flow**: Welcome → Register/Sign In → OTP → Browse events → View details → Book → Pay via redirect → Chat with organizer → Leave review
- **Business flow**: Register as poster → Create events → View analytics dashboard
- **Design**: Dark midnight background (#0c0c1a), electric violet primary (#7c3aed), liquid glass tab bar on iOS 26+

## User preferences

- Dark midnight + electric violet design throughout
- No emojis in UI
- `useColors()` for all colors — no hardcoded hex values in screens
- `useSafeAreaInsets()` for safe area handling

## Gotchas

- `SymbolView` (SF Symbols) renders only on iOS — use `Platform.OS === "ios"` ternary with `Feather` for web/Android
- NativeTabs do NOT use `useBottomTabBarHeight()` — use `contentInsetAdjustmentBehavior="automatic"` instead
- Badge in NativeTabs requires a string child, not a number

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile-specific patterns
- See the `mobile-ui` skill for tabs configuration (tabs.md)
