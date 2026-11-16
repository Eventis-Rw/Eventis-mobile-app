# Run Eventis on your phone: team setup guide

This guide takes you from nothing to the Eventis app running on your Android phone, connected to your computer. Follow the parts in order. Each step says what you should see, so you know it worked before you move on.

> **Short on time?** If a teammate can send you the APK file and you only want to *try* the app, do [Part 2](#part-2-turn-on-developer-options-on-your-phone), [Part 4 → Option B](#option-b-install-an-apk-a-teammate-sent-you) and [Part 5](#part-5-start-the-app-and-connect). You still need a computer running the project for the app to load.

## How it fits together

The app has two halves:

| Piece | Where it runs | What it is |
|---|---|---|
| **Eventis dev app (APK)** | Your phone | The native shell: camera, microphone, LiveKit video. Install it once and rebuild it only when native packages change. |
| **Metro bundler** | Your computer | Serves the JavaScript (screens, logic). Every code change shows up on the phone instantly. |

The phone must be able to reach the computer, over a **USB cable** or the **same Wi-Fi network**.

> ⚠️ **Expo Go will not work.** Live streaming uses native modules that Expo Go doesn't include. Always open the **Eventis** app you installed, not Expo Go.

---

## Part 1: Prepare your computer (one time)

### 1.1 Install the tools

| Tool | Version | Get it |
|---|---|---|
| Git | any recent | <https://git-scm.com/downloads> |
| Node.js | 22 LTS | <https://nodejs.org> (choose the LTS installer) |
| pnpm | latest | After Node is installed, run `npm install -g pnpm` |

Check that they work. Open a **new** terminal (PowerShell on Windows, Terminal on macOS/Linux):

```bash
git --version
node --version     # should print v22.x
pnpm --version
```

Each command should print a version number. If you see "command not found", close the terminal, open a new one and try again. Installers only update new terminals.

### 1.2 Install Android tools (only if you will *build* the APK)

Skip this if a teammate will send you the APK file. You still need `adb` (step 1.3).

1. Install **Android Studio**: <https://developer.android.com/studio>.
2. Open it → **More Actions → SDK Manager**:
   - **SDK Platforms** tab: tick **Android 16 (API 36)**.
   - **SDK Tools** tab: tick **Show Package Details**, then select **Android SDK Build-Tools 36.0.0** and **35.0.0**, **NDK (Side by side) 27.1.12297006**, **CMake 3.22.1** and **Android SDK Platform-Tools**.
   - Click **Apply** and wait for the downloads.
3. Android Studio ships a JDK (Java 17+). Gradle finds it automatically on most machines. If a build says *"JAVA_HOME is not set"*, point `JAVA_HOME` at Android Studio's `jbr` folder (see below).

Set the environment variables so the terminal can find the SDK:

**Windows** (Start → *Edit the system environment variables* → Environment Variables → *New* under User variables):

```
ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Android\Android Studio\jbr
```

Then edit **Path** and add `%ANDROID_HOME%\platform-tools`.

**macOS / Linux** (add to `~/.zshrc` or `~/.bashrc`, then open a new terminal):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"   # Linux: $HOME/Android/Sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

### 1.3 Make sure `adb` works

`adb` (Android Debug Bridge) lets your computer talk to your phone. It comes with Platform-Tools.

```bash
adb version
```

If you skipped Android Studio, download **SDK Platform-Tools** alone from <https://developer.android.com/tools/releases/platform-tools>, unzip it, and add that folder to your `PATH`.

### 1.4 Get the project

```bash
git clone https://github.com/Eventis-Rw/Eventis-mobile-app.git
cd Eventis-mobile-app
git checkout dev
pnpm install
```

`pnpm install` takes a few minutes the first time. It should finish without red `ERR!` lines.

### 1.5 Add your local settings

Create a file named `.env.local` in the project folder. It is ignored by git, so it stays on your computer. Start from the example:

```bash
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
```

Ask the team lead for the LiveKit token server ID, then fill in and uncomment what you need:

```dotenv
EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID=ask-the-team-lead
EXPO_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
```

> Never put a password, API secret or private key in `.env.local`. Anything starting with `EXPO_PUBLIC_` is bundled into the app and visible to anyone who has it.

---

## Part 2: Turn on Developer options on your phone

You do this once per phone.

1. Open **Settings → About phone**.
   - **Samsung:** Settings → About phone → **Software information**.
   - **Xiaomi / Redmi:** Settings → About phone (tap **MIUI / HyperOS version**, not Build number).
   - **Tecno / Infinix / itel:** Settings → About phone.
2. Find **Build number** and **tap it 7 times**. Enter your PIN if asked.
3. You'll see *"You are now a developer!"*
4. Go back to **Settings**. A new **Developer options** menu appears, usually under **Settings → System**. On Samsung it sits at the bottom of Settings.
5. Open **Developer options** and turn on:
   - **USB debugging** (for a cable connection)
   - **Wireless debugging** (Android 11+, for a Wi-Fi connection)
   - **Install via USB**, Xiaomi only. This needs a Mi account and a SIM card.

✅ **Check:** you can open Developer options and *USB debugging* is on.

---

## Part 3: Connect your phone to your computer

Pick **one** option. USB is the easiest for a first try.

### Option A: USB cable

1. Plug the phone in with a **data** cable. Some cheap cables only charge.
2. On the phone, pull down the notification bar. If it says *"Charging this device via USB"*, tap it and choose **File transfer**.
3. On the computer, run:

   ```bash
   adb devices
   ```

4. The phone shows **"Allow USB debugging?"**. Tick **Always allow from this computer** and tap **Allow**.
5. Run `adb devices` again.

✅ **Check:** you see a line ending in `device`, for example:

```
List of devices attached
R58M1234ABC     device
```

If it says `unauthorized`, unlock the phone and accept the prompt. If nothing is listed, try another cable or USB port.

### Option B: Wi-Fi (no cable, Android 11+)

The phone and computer must be on the **same Wi-Fi**. Guest networks and some campus or office networks block devices from seeing each other. A phone hotspot shared to the laptop works well.

1. On the phone: **Developer options → Wireless debugging → turn on → tap the words "Wireless debugging"** to open it.
2. Tap **Pair device with pairing code**. The phone shows a 6-digit code and an `IP:port` (e.g. `192.168.1.23:37115`).
3. On the computer:

   ```bash
   adb pair 192.168.1.23:37115
   ```

   Type the 6-digit code when asked. You should see `Successfully paired`.
4. Go back to the main **Wireless debugging** screen. It shows a **different** port under *IP address & Port* (e.g. `192.168.1.23:41893`). Connect to that one:

   ```bash
   adb connect 192.168.1.23:41893
   ```

5. Run `adb devices`.

✅ **Check:** the phone is listed as `device`.

> The connection port changes when the phone restarts or Wi-Fi reconnects. Next time, just repeat step 4 with the new port. You don't need to pair again.

---

## Part 4: Install the Eventis app (APK)

### Option A: Build and install it yourself

You need Part 1.2 done and the phone connected (Part 3).

```bash
pnpm android
```

The first build takes **10–25 minutes**. Later builds are much faster. It builds only for your connected phone's processor type. When it finishes, the app installs and opens on your phone by itself.

To produce an APK **file** you can send to teammates:

```bash
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a    # Windows: .\gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
cd ..
```

The file is at `android/app/build/outputs/apk/debug/app-debug.apk`. Share it on Google Drive or another file-sharing service. WhatsApp may block or compress `.apk` files.

> `arm64-v8a` covers almost every phone made since 2017. For a very old or very cheap phone, build with `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a` instead.

### Option B: Install an APK a teammate sent you

**With adb** (phone connected as in Part 3):

```bash
adb install -r path/to/app-debug.apk
```

You should see `Success`.

**Without a computer:** copy the `.apk` to the phone and tap it in **Files / Downloads**. Android asks you to allow **Install unknown apps** for that app (Files, Chrome, Drive…). Allow it, go back and tap **Install**. If **Play Protect** warns you, tap **More details → Install anyway**. This is our own debug build.

✅ **Check:** an app called **Eventis** is on your phone.

> **"App not installed" / "package conflicts"?** You have an older Eventis build signed by someone else. Uninstall Eventis first, then install again.

---

## Part 5: Start the app and connect

Do this **every time** you work on the app.

1. On the computer, in the project folder:

   ```bash
   pnpm start
   ```

   Wait for a QR code and `Metro waiting on exp+mobile://...`. Keep this terminal open.

2. Connect the phone to Metro. Use the same method as Part 3:

   **USB:** forward the ports once per session, then open the Eventis app:

   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000   # only if you run the local API
   ```

   In the Eventis app, tap the server listed under **Development servers** (e.g. `http://localhost:8081`).

   **Wi-Fi:** open your phone's **camera** and scan the QR code in the terminal, then choose to open it in **Eventis**. If no server appears, tap **Enter URL manually** in the app and type `http://<your-computer-IP>:8081`.

   Find your computer's IP address:

   | System | Command | Look for |
   |---|---|---|
   | Windows | `ipconfig` | *IPv4 Address* under your Wi-Fi adapter |
   | macOS | `ipconfig getifaddr en0` | the printed address |
   | Linux | `hostname -I` | the first address |

3. The app shows a progress bar (*Bundling…*) the first time, then opens.

✅ **Check:** you see the Eventis splash screen, then the home screen. Shake the phone to open the developer menu (reload, debugger).

### Testing Live on two phones

1. Set up both phones with Parts 2–5 and the **same** `.env.local` values.
2. If you run the local API (see [live-streaming.md](live-streaming.md#run-the-shared-directory)), Wi-Fi phones need `EXPO_PUBLIC_LIVE_API_URL=http://<your-computer-IP>:3000` in `.env.local`. USB phones use `adb reverse tcp:3000 tcp:3000` instead.
3. Restart Metro after editing `.env.local`, clearing its cache: `pnpm start -c`.
4. On phone A tap **Live → Go Live**. On phone B pull down to refresh the Live tab and tap the card.

---

## Daily checklist

```bash
git pull                       # get the latest code
pnpm install                   # only if package.json changed
adb devices                    # phone shows "device"? (Wi-Fi: adb connect IP:PORT first)
adb reverse tcp:8081 tcp:8081  # USB only
pnpm start                     # then open Eventis on the phone
```

**Rebuild the APK** (Part 4) only when someone adds or updates a *native* package, such as a new `expo-*` or `@livekit/*` dependency in `package.json`. Screen and logic changes never need a rebuild.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `adb: command not found` | Platform-Tools isn't on your `PATH` (Part 1.2 / 1.3). Open a new terminal after changing it. |
| `adb devices` shows `unauthorized` | Unlock the phone and accept *Allow USB debugging*. Still stuck? Developer options → **Revoke USB debugging authorizations**, unplug and plug back in. |
| `adb devices` shows nothing | Use a data cable, set USB mode to **File transfer**, try another port. On Windows, install your phone maker's USB driver (Samsung: *Samsung USB Driver*). |
| *Could not connect to development server* | Is `pnpm start` running? USB: run `adb reverse tcp:8081 tcp:8081` again (it resets when you unplug). Wi-Fi: check both are on the same network and the IP is right. |
| Wi-Fi works for others but not you | Your computer's firewall is blocking port 8081. On Windows, when asked, allow **Node.js** on **Private networks**. Otherwise allow it in *Windows Defender Firewall → Allow an app*. |
| `adb pair` fails | Codes expire quickly. Tap *Pair device with pairing code* again and type the new code right away. Pair with the **pairing** port, then connect with the **main** port. |
| App opens, then: *"native module … doesn't exist"* | Your APK is older than the code. Rebuild or reinstall the latest APK (Part 4). |
| Changed `.env.local` but nothing changed | Stop Metro (Ctrl+C) and run `pnpm start -c`. |
| Build fails with `SDK location not found` | Set `ANDROID_HOME` (Part 1.2), or create `android/local.properties` containing `sdk.dir=/path/to/Android/Sdk`. |
| Build fails with Java errors | Use the JDK bundled with Android Studio (`JAVA_HOME` → `…/Android Studio/jbr`). |
| *App not installed* | Uninstall the old Eventis app first (different signature). |
| Phone gets very hot / build takes forever | Use `-PreactNativeArchitectures=arm64-v8a` (Part 4) to build only what your phone needs. |

## iPhone users

The APK is Android-only. Running on an iPhone needs a Mac with Xcode (`pnpm ios`) or a team EAS build. Ask the team lead.

## Still stuck?

Post in the team chat with: your OS, phone model, the command you ran and a screenshot of the full error. That's usually enough for someone to spot it quickly.
