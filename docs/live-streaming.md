# Real audio/video testing with LiveKit

Eventis Live uses a shared API directory for discovery and LiveKit for real media. Open the **Live** tab and tap an active broadcast to watch, or open a shared `/live/:id` link. Viewers never enter room codes. The same room UI handles chat, reactions, guest requests/invitations and moderation over LiveKit data packets.

Hosts check their access status, open a private camera/voice preview, add a title, optionally link a published event, and explicitly start. Host-approved guests get their own private preview and choose camera/microphone settings before confirming **Join broadcast**. They can return to watching without leaving the room. There is no creator co-host matching or battle feature.

## Connect your project

1. Create a LiveKit Cloud project and enable **Development token server** under project settings.
2. Add its public ID to the mobile app's `.env`:

   ```dotenv
   EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID=your-development-token-server-id
   EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

   The URL is optional; when supplied it is checked against the project that issued the token. Never put a LiveKit API secret in an `EXPO_PUBLIC_` variable or in the app.
3. Restart Expo after changing environment variables. Both phones need the same project configuration.

## Run the shared directory

The API lives in the adjacent `Eventis-api` repository, and its schemas are in `Eventis-contracts/packages/contracts/src/live.ts`. Build the local contracts before building the linked API package:

```sh
# Eventis-contracts
bun run --cwd packages/contracts build

# Eventis-api
# Set LIVE_DEVELOPMENT_ACCESS=true in the local, ignored .env.
docker compose -f docker/docker-compose.yml up -d db redis
bun run build
bun run start
```

The API serves `/api/v1/live/rooms` on port 3000. The client uses `EXPO_PUBLIC_LIVE_API_URL`, then `EXPO_PUBLIC_API_URL`, or derives the API hostname from Metro/the browser. For a phone using localhost through ADB, forward both ports:

```sh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

For phones connecting directly over Wi-Fi, use the laptop's LAN address for Metro and the API (for example `EXPO_PUBLIC_LIVE_API_URL=http://LAPTOP_IP:3000`) and allow that port on the development network. Both phones must reach the same API and LiveKit project. Do not use an emulator's `10.0.2.2` address on a physical phone.

The directory uses a separate Redis key and atomic compare-and-set updates. It reserves at most five app-managed sessions, holds a FIFO waiting queue, and limits a session to 30 minutes. A reservation is listed only after its host connects. Host heartbeats renew a 60-second lease; abandoned queue tickets expire after 90 seconds. Starting from the queue always requires another explicit confirmation. End/close unregisters the room; crashed clients disappear when their lease expires. Viewer counts come from the host's SDK roster rather than a seeded number.

This directory is **development-only**. `LIVE_DEVELOPMENT_ACCESS` defaults to false, and the module refuses access in staging/production. The API's identity, organiser verification and genuine-view sources are still placeholders, so development access does not enforce production eligibility or the one-session-per-day rule. The access screen explains this. Do not expose the development API/token server to untrusted users.

## Native development build required

LiveKit uses native WebRTC modules and cannot run in Expo Go. Go Live opens an Expo Camera preview in Expo Go, with a visible explanation that broadcasting and viewing remote streams require the Eventis development app. It never silently substitutes a sample picture or a local demo room. In a development build or supported web browser, Start broadcasting releases the preview camera and publishes real camera/microphone tracks through LiveKit.

Installed: `livekit-client`, `@livekit/react-native`, `@livekit/react-native-webrtc`, both recommended Expo plugins, and SDK-compatible `expo-dev-client`. Config includes camera/microphone permission descriptions.

With the Android SDK/JDK installed and a phone connected through ADB (USB or Wi-Fi):

```sh
pnpm exec expo run:android
pnpm exec expo start --dev-client
```

The first native build may ask for the project's application identifier. Use the team's agreed identifier. iOS native builds require macOS/Xcode or your team's EAS build setup. The setup also uses `expo-camera` for local preview. Rebuild the development client after adding these native modules; restarting Metro alone cannot add them to an old installed binary.

On Android 11 or newer, a USB cable is optional. Connect the computer and phone to the same Wi-Fi, enable **Developer options → Wireless debugging**, and choose **Pair device with pairing code**. Run `adb pair PHONE_IP:PAIRING_PORT`, enter the code, then use the address on the main Wireless debugging page with `adb connect PHONE_IP:CONNECTION_PORT`. The pairing and connection ports are usually different. Once `adb devices` shows `device`, the same build/install commands work over Wi-Fi.

This branch currently uses Android SDK 36, Build Tools 36.0.0 (plus 35.0.0 for Expo library modules), NDK 27.1.12297006 and CMake 3.22.1. The SDK can live at the standard `~/Android/Sdk` location; Gradle can also read its location from the ignored `android/local.properties` file (`sdk.dir=...`).

## Test on two devices

1. On phone A, select **Go Live** and grant camera permission. Verify that the preview shows the rear camera, then test Flip. Enter a title, choose camera/voice mode and tap **Start broadcasting**. Grant microphone permission. The selected camera direction carries over to the broadcast.
2. On phone B, open **Live** and tap A’s broadcast. Alternatively, open its shared Live link. Viewers enter without publishing audio/video. Confirm the linked event details are available through **View event**.
3. On B, request to join the stage. On A, open Participants and accept. B sees a private guest preview, chooses microphone/camera settings, then confirms **Join broadcast**. Verify **Stay watching** releases the guest spot without publishing. Test invitation acceptance/decline, removal, chat mute and block too.
4. Test microphone mute, camera on/off, front/back flip, live chat, reactions, host ending, viewer leaving, and reconnection.
5. Backgrounding disables local capture. Re-enable media explicitly when back in the app. Leaving the stage, removal and backgrounding unpublish and stop capture tracks. Leaving/unmounting disconnects and stops tracks/audio session.

Web testing uses browser WebRTC, with an **Enable sound** button if autoplay is blocked. Camera/microphone access requires HTTPS or localhost. Native video uses LiveKit's renderer and audio session.

## Broadcast screen

The camera preview and solo broadcast fill the screen. Video uses cover scaling to fill the available canvas; landscape sources are cropped at the sides in portrait. Approved guests share a split-screen stage, with a grid for additional guests. Voice rooms use profile avatars when no camera is enabled.

Host details and the viewer count sit over the video at the top. Microphone, camera, flip and reaction controls float on the right. Comments overlay the lower part of the broadcast; the composer stays above the system safe area and adjusts for the keyboard. Comments can be hidden through the bottom **…** menu. That menu also contains comment visibility and host settings; sharing remains available beside the composer.

Media controls reflect the SDK's current microphone/camera state. Re-enabling media clears a previous media error, and notices can be dismissed. Participant and media snapshots update on SDK events so newly approved guests render correctly with React Compiler enabled.

## Testing-only authority and limits

The development token server still permits broad access. Directory owner tokens protect listing updates and queue claims, but are not authenticated user identity or LiveKit media authorization. Host authority is coordinated in the frontend: the SDK sender identity must match the host encoded in the room code; guest actions are allowlisted; the existing room reducer enforces four seats and host moderation. Viewers subscribe only to approved stage participants. This protects ordinary app interactions, but is **not server-enforced authorization**: someone using the open development token service can impersonate identities or bypass the client. Use it only with trusted testers.

Host snapshots include bounded chat history and are resent on join/reconnect. Request acknowledgements, deduplication, connection timeouts, host-loss handling and wall-clock expiry prevent most stale UI states. The shared directory enforces capacity for API-managed sessions and provides tap-to-watch discovery. It cannot prevent someone using the open LiveKit development token server from creating rooms outside the API. Chat history remains bounded in host memory; verified daily/eligibility checks and server-enforced guest permissions are not connected. Host departure ends the viewing session after a short reconnect window.

Gifts and the coin wallet remain in the local demo; the real transport does not claim to synchronize or settle money. Production requires authenticated token issuance, server-side host/guest permissions, moderation, room discovery, eligibility/capacity checks and a verified wallet ledger.

## Verification

Verified on 27 October 2026:

- `pnpm test:live`: shared reducer and protocol checks pass, including room codes, allowed guest actions, host snapshot validation, and bounded wire payloads.
- TypeScript validation and Expo exports for web, Android and iOS pass.
- Two isolated browser clients connected to the configured LiveKit Cloud project using synthetic camera/microphone sources. RTP statistics confirmed received audio bytes and decoded video frames in both directions after guest approval. Shared chat, stage requests/approval, microphone mute, camera off, host ending and peer-connection cleanup passed without JavaScript exceptions.
- An intentionally stalled signalling connection timed out, exposed Retry, and successfully connected/published after restoring the connection. Initial room connections are bounded to 25 seconds, separately from the token request timeout.
- Expo native configuration introspection confirms Android camera/microphone permissions and iOS permission descriptions. The image-picker configuration no longer removes Android's `RECORD_AUDIO` permission.

Camera-flow follow-up:

- The main Go Live action opens the actual camera preview; demo hosting is under Demo controls.
- Browser checks cover preview frames, camera flipping, keeping the selected camera mode usable, releasing tracks on voice-mode switching/closing setup, and permission-denied feedback with broadcasting disabled.
- The two-client streaming flow passed again through the new preview setup, including real received audio/video, shared chat, guest approval and shutdown.
- The Event Streams header, glass cards with 16:9 covers, red broadcast actions, blue join buttons and compact navy chat panel follow the earlier Live design. Sample rooms remain explicitly labelled as demos.

Android development build follow-up, 28 October 2026:

- Installed the Android SDK and required build tools, NDK and CMake locally. The ARM64 debug APK compiled successfully (`:app:assembleDebug`).
- Installed the development client on a Samsung SM-A202F running Android 11 through wireless ADB. Forwarded port 8081 with `adb reverse` and opened the client using the `exp+mobile` development-client URL.
- Metro successfully bundled the Android app, and Eventis was confirmed running in the foreground without a JavaScript exception or fatal crash in the checked startup logs.
- Full-screen UI follow-up: two browser clients exchanged real audio/video and chat; solo video filled a 390 × 844 viewport with cover scaling, the composer remained within a 360 × 740 viewport, and comment hiding/restoring worked. Guest approval rendered two 390 × 422 stage tiles. Guest publishing, mute/camera toggles, session ending and connection cleanup passed. TypeScript and the Live state/protocol checks passed as well.

These checks do not replace a complete physical-device streaming test. Phone camera switching, OS permission dialogs, audio routing, two-phone streaming and mobile network reconnection still need verification. An iOS native build has not been compiled in this Linux environment.

References: [Expo setup](https://docs.livekit.io/transport/sdk-platforms/expo/), [development token server](https://docs.livekit.io/frontends/build/authentication/development-token-server/), [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/).

## Event-focused flow verification — 28 October 2026

- API domain tests cover capacity, FIFO/manual queue promotion, duplicate starts, owner controls and expiration. Real HTTP/Redis checks additionally cover concurrent reservation attempts, private-token redaction, request validation and idempotent starts/claims.
- Independent browser clients discovered a real broadcast and received audio/video by tapping it. The viewer did not request local media while watching.
- Approval opened a private guest preview without publishing. Cancelling released the preview; explicit guest confirmation published audio/video into the split screen. Leaving the stage stopped capture and returned to watching. Ending removed the session from discovery.
- A shared `/live/:id` route opened the correct broadcast, and the linked event details were available without the viewer having that event in its local publisher store.

The original room-code parser remains as an internal compatibility helper and test fixture. It is not a user-facing joining flow.

Final flow checks also verified that queued hosts release their preview tracks, a free slot does not auto-start a broadcast, and **Start my Live** begins a session only after explicit confirmation. The API verification command passed lint, TypeScript, boundary checks, money guards, 23 tests and compilation. Mobile TypeScript/Live tests and an Android JavaScript export passed. Browser CORS explicitly allows the methods used for queue cancellation and ending sessions.

## Speaking indicators

The shared broadcast stage uses LiveKit's active-speaker events to show a blue pulsing avatar halo when a host or guest speaks without video. Video tiles show animated activity bars and a blue outline. Muted microphones and disconnected sessions cannot show speaking activity. Participant media and speech values are snapshotted on SDK revisions so React sees updates to LiveKit's mutable participant objects. Guest avatars reuse the room's profile data.

Animations stop on silence, muting and unmount, use the native animation driver on phones, and become static indicators when reduced motion is enabled. These effects do not open another microphone or transmit audio samples.

Two independent browser clients with synthetic speech verified detection, silence with an enabled microphone, mute/unmute, the camera-off avatar halo, reduced-motion styling, leaving the stage and session cleanup without runtime exceptions. Mobile TypeScript and Live tests passed. Physical-device animation performance remains a manual check.
