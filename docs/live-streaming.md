# Real audio/video testing with LiveKit

The existing Live viewer now has a real transport alongside the local demo. Open **Live → Stream between phones**. Hosting starts a LiveKit room; a second device joins using its full room code. The same room UI handles chat, reactions, invitations, requests, and moderation over reliable LiveKit data packets.

## Connect your project

1. Create a LiveKit Cloud project and enable **Development token server** under project settings.
2. Add its public ID to the mobile app's `.env`:

   ```dotenv
   EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID=your-development-token-server-id
   EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

   The URL is optional; when supplied it is checked against the project that issued the token. Never put a LiveKit API secret in an `EXPO_PUBLIC_` variable or in the app.
3. Restart Expo after changing environment variables. Both phones need the same project configuration.

## Native development build required

LiveKit uses native WebRTC modules and cannot run in Expo Go. The app keeps the local demo available there and explains the development-build requirement before opening real media.

Installed: `livekit-client`, `@livekit/react-native`, `@livekit/react-native-webrtc`, both recommended Expo plugins, and SDK-compatible `expo-dev-client`. Config includes camera/microphone permission descriptions.

With the Android SDK/JDK installed and a phone connected by USB:

```sh
pnpm exec expo run:android
pnpm exec expo start --dev-client
```

The first native build may ask for the project's application identifier. Use the team's agreed identifier. iOS native builds require macOS/Xcode or your team's EAS build setup. Rebuild the development client after adding these native modules; restarting Metro alone cannot add them to an old installed binary.

## Test on two devices

1. On phone A, select **Host a Live**, enter a title, select camera/voice mode, and start. Grant the requested permissions.
2. Tap **Copy code** or **Share**. On phone B, select **Join with a code** and paste it. Viewers enter without publishing audio/video.
3. On B, request to join the stage. On A, open Participants and accept. B can then explicitly enable its microphone/camera. Test invitation acceptance/decline, removal, chat mute and block too.
4. Test microphone mute, camera on/off, front/back flip, live chat, reactions, host ending, viewer leaving, and reconnection.
5. Backgrounding disables local capture. Re-enable media explicitly when back in the app. Leaving/unmounting disconnects and stops tracks/audio session.

Web testing uses browser WebRTC, with an **Enable sound** button if autoplay is blocked. Camera/microphone access requires HTTPS or localhost. Native video uses LiveKit's renderer and audio session.

## Testing-only authority and limits

The development token server permits broad access. Host authority is coordinated in the frontend: the SDK sender identity must match the host encoded in the room code; guest actions are allowlisted; the existing room reducer enforces four seats and host moderation. Viewers subscribe only to approved stage participants. This protects ordinary app interactions, but is **not server-enforced authorization**: someone using the open development token service can impersonate identities or bypass the client. Use it only with trusted testers.

Host snapshots include bounded chat history and are resent on join/reconnect. Request acknowledgements, deduplication, connection timeouts, host-loss handling and wall-clock expiry prevent most stale UI states. There is no global room directory, durable chat history, server-enforced five-room quota, or verified daily/eligibility limit for this testing transport. Room codes provide discovery for now; host departure ends the session after a short reconnect window.

Gifts and the coin wallet remain in the local demo; the real transport does not claim to synchronize or settle money. Production requires authenticated token issuance, server-side host/guest permissions, moderation, room discovery, eligibility/capacity checks and a verified wallet ledger.

## Verification

Verified on 27 October 2026:

- `pnpm test:live`: shared reducer and protocol checks pass, including room codes, allowed guest actions, host snapshot validation, and bounded wire payloads.
- TypeScript validation and Expo exports for web, Android and iOS pass.
- Two isolated browser clients connected to the configured LiveKit Cloud project using synthetic camera/microphone sources. RTP statistics confirmed received audio bytes and decoded video frames in both directions after guest approval. Shared chat, stage requests/approval, microphone mute, camera off, host ending and peer-connection cleanup passed without JavaScript exceptions.
- An intentionally stalled signalling connection timed out, exposed Retry, and successfully connected/published after restoring the connection. Initial room connections are bounded to 25 seconds, separately from the token request timeout.
- Expo native configuration introspection confirms Android camera/microphone permissions and iOS permission descriptions. The image-picker configuration no longer removes Android's `RECORD_AUDIO` permission.

These checks do not replace a physical-device test. Native APK/IPA compilation, phone camera switching, OS permission dialogs, audio routing and mobile network reconnection still need the team's development builds and devices.

References: [Expo setup](https://docs.livekit.io/transport/sdk-platforms/expo/), [development token server](https://docs.livekit.io/frontends/build/authentication/development-token-server/).
