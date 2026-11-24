# Authentication setup

Eventis supports phone + five digit PIN, email + a six digit verification code, Google on Android/iOS, and Apple on supported iOS devices. Both authentication screens offer the available methods. Email registration asks for a username; social sign-in creates an account on first use. Phone sign-in and SMS registration keep their existing flow.

The mobile client exchanges verified provider credentials or email codes for the Eventis API's access/refresh tokens. Google/Apple do not create local demo sessions. Email and social accounts start without a verified phone number. Email codes expire after five minutes, allow five attempts, and can be requested once per minute, at most ten times per email per day. Requesting a fresh code invalidates the previous one.

## Google

Create OAuth clients in one Google Cloud project:

1. A **Web application** OAuth client. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in this app's `.env.local` to its client ID.
2. An **Android** client for `com.nzizaprince5.mobile`, with the signing certificate SHA-1 for each build you test or release. Include the Play App Signing certificate for Play Store builds.
3. An **iOS** client matching your registered iOS bundle identifier. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env.local`. `app.config.js` derives and registers its reversed URL scheme. Set `expo.ios.bundleIdentifier` in `app.json` to that registered identifier before building for iOS.

On the API, set `GOOGLE_AUTH_CLIENT_IDS` to the Web client ID used by the app (comma-separated if you deliberately accept several clients). These are audience allowlists; do not use a wildcard. No Google client secret is required for this native ID token exchange.

See the [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo) and [configuration guide](https://react-native-google-signin.github.io/docs/setting-up/get-config-file).

## Apple

Use your app's registered iOS bundle identifier with Sign in with Apple enabled in your Apple Developer account. Set `APPLE_AUTH_CLIENT_IDS` on the API to that exact bundle identifier. The app config enables the entitlement and Apple config plugin. No Apple private key is required for native identity token verification.

Apple uses its native button and a SHA-256 nonce. The API verifies the signed token, issuer, audience, expiry, and nonce. Name information is normally provided only on the first consent and is optional. The stable Apple subject identifies returning users, including users who hide their email.

Apple sign-in is offered only when the device reports it is available. Android and browser Apple sign-in are not implemented. Google sign-in is offered in native builds; the web preview supports email and phone. See [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

## Email delivery

Configure these **server-only** variables in `Eventis-api/.env` or its deployment environment:

```dotenv
BREVO_API_KEY=your-brevo-api-key
AUTH_EMAIL_FROM=Eventis <auth@your-verified-domain.example>
GOOGLE_AUTH_CLIENT_IDS=your-web-client-id.apps.googleusercontent.com
APPLE_AUTH_CLIENT_IDS=your.registered.ios.bundle.identifier
```

In Brevo, verify your sender email and authenticate your sending domain, then create an API key for transactional email (not an SMTP password). Set `AUTH_EMAIL_FROM` to that sender, for example `Eventis <auth@your-domain.com>`. The API sends OTP messages through [Brevo’s transactional email endpoint](https://developers.brevo.com/reference/send-transac-email). Secrets must never be prefixed with `EXPO_PUBLIC_`. Email sign-in returns a configuration error until delivery is configured. It does not display or log verification codes.

For privacy, requesting an email code returns the same response for existing and unknown accounts. Only eligible addresses receive a code: register for a new address, sign in for an existing verified address. An email merely typed into an existing phone profile is not a verified sign-in identity.

## Database and builds

The companion `Eventis-api` changes add nullable user phone numbers, provider identities, and email challenges. Review and apply migration `20261120000000_alternative_auth` against the intended database, then regenerate Prisma and restart the API:

```sh
cd ../Eventis-api
bun run db:migrate
bun run prisma:generate
```

The migration is additive except that `users.phone` becomes nullable. It does not remove existing phone identities. Legacy shared contracts still represent a missing phone as an empty string in API responses; the mobile mapper treats it as absent and respects `isPhoneVerified`.

Rebuild the app after installing native modules and configuring OAuth clients. Google sign-in requires a development or production build and cannot run in Expo Go. For the existing generated Android project, run `pnpm exec expo prebuild --platform android` before `pnpm android`; review native project changes if you maintain them manually. Use an iOS development/EAS build after setting the bundle identifier. Restart Metro when changing public environment variables.

Existing accounts are never silently merged based on provider email. If a provider's email is already used by another account, sign in using that account's existing method. Linking additional providers to an existing account needs a separate authenticated linking flow and is not included here.

## Organiser approval

Preview and production EAS builds enable the live organiser API. Customers submit organisation details before paying. An administrator verifies the receipt and records its provider transaction ID; this moves the application to `IN_REVIEW` but does not grant organiser permissions. A separate application approval creates the organiser profile and activates the purchased plan. Rejected applicants see the reason and may submit a new application with a new verified payment. Existing organisers retain access and can renew their plans.

The app checks account, application and subscription state when it opens, returns to the foreground, and every 30 seconds while active. When server roles change it rotates the session tokens. Payment history also supports refresh and retry.

Deploy the API and database migration together with the updated admin dashboard, then distribute a new APK; an installed older APK cannot display the new application form or status. Existing pending receipts require the applicant to complete the new form before verification. In a staging environment, verify an unconfirmed receipt, successful verification, rejection and reapplication, and approval; confirm event creation is denied before approval and allowed afterwards. Repeat after backgrounding, restarting and signing in again.

## Verification

Run `pnpm test:auth` in the mobile app and the identity tests in the API. With real credentials and delivery configured, verify email registration → code → home → restart → sign out → email sign-in; then test Google and Apple cancellation, first registration, returning sign-in, restart, and sign-out on supported devices. Also verify phone registration/sign-in and phone-gated features for accounts without a phone.

Provider consent and actual email delivery require the external credentials above and real device testing; unit tests do not prove those integrations are configured.

## LiveKit configuration

The API owns LiveKit room creation and participant tokens. Configure `LIVEKIT_URL`
(with `wss://`), `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` only on the backend.
The mobile app can set `EXPO_PUBLIC_LIVEKIT_URL` to validate the expected project;
it obtains participant tokens from the authenticated `/api/v1/live/token` endpoint.
The production flow does not use `EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID`.

Live discovery displays API rooms and actual participant counts. Hosting eligibility
and stage permissions are checked by the backend. Coin purchases remain unavailable
unless the payments API is explicitly enabled and implemented.
