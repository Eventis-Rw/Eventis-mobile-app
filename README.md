# Eventis mobile app

The Eventis app for Android and iOS, built with Expo SDK 57, React Native, and Expo Router. The app now lives at the repository root.

## Get started

Requires Node.js and pnpm.

```bash
pnpm install
pnpm start
```

From the Expo terminal, open the app in Expo Go or an emulator. You can also start a platform directly:

```bash
pnpm android
pnpm ios
pnpm web
```

Check TypeScript with `pnpm typecheck`.

The project currently pins Expo 57.0.25 and matching package patches that pass pnpm's
minimum release age policy. `pnpm-workspace.yaml` contains only two dependency
overrides for that reason; this is still a single-package app. Expo Doctor may report
three newer SDK 57 patch versions until those releases pass the policy window.

## API configuration

The backend is a separate project: [Eventis-api](https://github.com/Eventis-Rw/Eventis-api). For API-backed features, set `EXPO_PUBLIC_API_URL` to an address your device can reach. You can put it in an untracked `.env.local` file:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Use your computer's LAN address for a physical phone. Without this variable, the app uses `localhost:3000` on web and iOS simulators, or `10.0.2.2:3000` on the Android emulator. The home screen includes mock event data, so it can be previewed without the API.

## Project layout

- `app/` — Expo Router screens, including splash and onboarding
- `assets/` — branding and event images
- `components/` — reusable UI
- `constants/`, `context/`, `hooks/`, `utils/` — app state and helpers
- `app.json` — Expo configuration

## License

MIT — see [LICENSE](LICENSE).
