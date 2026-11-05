# Live testing setup

Use the **Eventis development APK**, not Expo Go. Both testers need internet and the same LiveKit project and Live API. Each developer can run Metro on their own laptop.

## 1. Install the phone app

**With the shared APK (quickest):**

1. Get `eventis-development-arm64.apk` from the teammate preparing the build.
2. Open it on your Android phone. Allow **Install unknown apps** for the app opening the file, then install.
3. Open Eventis after starting Metro in step 4. Connect to `http://YOUR_LAPTOP_IP:8081` in the development launcher.

This APK is for ARM64 Android phones, Android 7 or newer. It needs Metro running; it is not a standalone release. Developer options and ADB are optional when installing the APK directly.

**Build the APK yourself:** install JDK 17 and Android Studio's SDK tools, then run from `Eventis-mobile-app`:

```bash
pnpm install
pnpm exec expo prebuild --platform android
cd android
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Share `android/app/build/outputs/apk/debug/app-debug.apk`, renamed to `eventis-development-arm64.apk`. Use a shared download or GitHub Release asset; keep APK binaries out of Git. Rebuild after changing native dependencies or Expo plugins.

## 2. Connect Android over Wi-Fi (optional)

Phone and laptop must be on the same Wi-Fi. Wireless debugging requires Android 11+.

1. Phone: **Settings → About phone → Software information → Build number**. Tap seven times and enter your PIN. Other phones may show Build number directly under About phone.
2. Open **Settings → Developer options → Wireless debugging** and enable it.
3. Tap **Pair device with pairing code**. Keep that screen open.
4. Install Android SDK Platform Tools on your laptop, then run:

```bash
adb pair PHONE_IP:PAIRING_PORT
# Enter the six-digit code shown on the phone.
```

5. Return to the main **Wireless debugging** screen. Use its **IP address & port**, which differs from the pairing port:

```bash
adb connect PHONE_IP:CONNECTION_PORT
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Run the install command from `Eventis-mobile-app`. If the phone disconnects, repeat `adb connect` with its current connection port. USB debugging is only needed for the USB alternative.

## 3. Start the shared API

One API serves both testers. Use the branches containing the Live changes in **all three repositories**: `Eventis-contracts`, `Eventis-api`, and `Eventis-mobile-app`.

Install Node 22+, Bun 1.4.2+, pnpm, and Docker. Keep the repositories beside each other.

**First setup — shared packages:**

```bash
cd Eventis-contracts
bun install
bun run build
(cd packages/contracts && bun link)
(cd packages/eslint-config && bun link)
(cd packages/tsconfig && bun link)
cd ../Eventis-api
bun install
```

**First setup — API environment:**

```bash
cp .env.example .env
bun run scripts/generate-keys.ts >> .env
```

Do this only when creating a new `.env`; keep existing credentials. Set these values in the API's `.env`:

```dotenv
NODE_ENV=development
LIVE_DEVELOPMENT_ACCESS=true
DATABASE_URL=postgresql://eventis:eventis@localhost:5433/eventis
REDIS_URL=redis://localhost:6379
```

**Start the API:**

```bash
cd Eventis-api
docker compose -f docker/docker-compose.yml up -d db redis
bun run db:migrate
bun run start
```

In another terminal, check:

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
curl http://localhost:3000/api/v1/live/rooms
```

The updated API uses Prisma and database port **5433**. Do not reset or delete an existing database to apply migrations; use a separate development database if it still contains the old Drizzle schema.

## 4. Start the mobile app

From `Eventis-mobile-app`:

```bash
pnpm install
```

Add these public values to its `.env`:

```dotenv
EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID=YOUR_DEVELOPMENT_TOKEN_SERVER_ID
EXPO_PUBLIC_LIVEKIT_URL=wss://YOUR_LIVEKIT_PROJECT_HOST
EXPO_PUBLIC_LIVE_API_URL=http://API_LAPTOP_IP:3000
```

Get the LiveKit values from the team's project settings. Enable its **Development token server**. Never put the API secret in the mobile app.

```bash
pnpm exec expo start --dev-client --lan
```

Open Eventis and select the server or enter `http://YOUR_LAPTOP_IP:8081`. Restart Metro after changing `.env`. Allow ports **8081** (Metro) and **3000** (API) through the laptop firewall on your local network.

If using ADB and both servers run on your connected laptop:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

Then the phone can use `http://127.0.0.1:8081`; the Live API can use `http://127.0.0.1:3000`. If another laptop hosts the API, keep its LAN address instead.

## 5. Test with two phones

1. Phone A: **Live → Go Live**. Allow camera/microphone, enter a title, choose video or voice, then start broadcasting.
2. Phone B: open the same Live from the Live tab. Watching must not activate its camera or microphone.
3. B: request to join. A: approve in Participants. B: choose camera/microphone in the private preview, then confirm joining.
4. Check video/audio on both phones. Test microphone mute, camera off/on, Flip, and leaving the stage.
5. Tap the video or the bottom heart. Confirm the count updates on both phones. Use **… → Share Live** and open the link on the other phone.
6. Send a comment, hide/show comments, and end the Live. Confirm it disappears from discovery.

For quick co-host testing, open the same sample card on both phones. Requests are automatically accepted, then the guest confirms the private preview. Guest cameras and microphones broadcast for real; the sample host is an avatar placeholder.

## Quick fixes

| Problem | Fix |
| --- | --- |
| Camera unavailable in Expo Go | Install the development APK. |
| Phone cannot load the app | Keep Metro running; check the laptop IP, Wi-Fi, and port 8081. |
| Live discovery unavailable | Check API `/readyz`, `LIVE_DEVELOPMENT_ACCESS=true`, and the phone's API address. |
| Backend dependency install fails | Build and `bun link` all three shared packages in step 3 first. |
| Camera/mic remain off after backgrounding | Return to Eventis and explicitly enable them in your controls. |
| Browser has no camera/mic | Use localhost or HTTPS; a plain LAN HTTP URL cannot access browser media. |
| APK update reports a signature conflict | Use an APK signed by the same teammate. Uninstalling clears local app data. |

Development tokens are for trusted testers. Payments and payouts are not connected; keep Live payment/report API flags off until those endpoints ship.

References: [Android wireless debugging](https://developer.android.com/tools/adb#connect-to-a-device-over-wi-fi-android-11+), [Expo development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/), [LiveKit Expo setup](https://docs.livekit.io/transport/sdk-platforms/expo/).
