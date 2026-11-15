# Pulse HR: live heart rate from a Wear OS watch

A one-screen Wear OS app. It reads the watch's heart-rate sensor and sends the latest reading to the
onboard server once a second (`POST /live/heart-rate`). The Exercise page shows it in the
"Live · wrist sensor" card. Tested target: OnePlus Watch 2R. The readings are real, recorded on Earth.

## Build (Linux, no Android Studio)

Needs a JDK (17) and the Android SDK at `~/Android/Sdk` with `platform-tools`, `build-tools;34.0.0`
and `platforms;android-34` (install with Google's command-line tools and `sdkmanager`).

```bash
people/zt/watch-hr/build.sh
```

The app is `people/zt/watch-hr/build/watch-hr.apk`.

## Install on the watch

1. Watch: Settings → System → About → tap **Build number** 7 times. Then Settings → Developer
   options → turn on **ADB debugging** and **Wireless debugging**. Put the watch on the same Wi-Fi as
   the laptop.
2. Watch: Wireless debugging → **Pair new device**. Laptop:

```bash
~/Android/Sdk/platform-tools/adb pair <WATCH_IP>:<PAIRING_PORT> <CODE>
```

3. Connect with the port on the main Wireless debugging screen (not the pairing one), then install:

```bash
~/Android/Sdk/platform-tools/adb connect <WATCH_IP>:<PORT>
```

```bash
~/Android/Sdk/platform-tools/adb install -r people/zt/watch-hr/build/watch-hr.apk
```

4. Start it, pointing at the server: the live site (`https://pulse-crew-health.onrender.com`, after
   a deploy that includes this route), or a laptop on the same Wi-Fi running
   `node integration/onboard-app/start.js` (it prints the address under "Other devices on this
   network"; that laptop's firewall must allow incoming connections):

```bash
~/Android/Sdk/platform-tools/adb shell am start -n app.pulse.watchhr/.MainActivity --es server http://<LAPTOP_IP>:8000
```

5. On the watch, tap **Allow** for the sensor permission. The address is remembered, so later the app
   can be opened from the watch's app list.

## What the watch screen says

- `Live → http://… via Wi-Fi`: readings are arriving at the server.
- `Waiting for a reading…`: the sensor hasn't measured yet. Wear the watch snug.
- `Can't reach server`: wrong address, server not running, or the watch isn't on the laptop's Wi-Fi.
- `No heart-rate sensor available to apps`: this watch doesn't share its sensor with apps.

## Limits

- No login: anyone on the same network could send a reading. Fine for a demo, not for a real mission.
- The server keeps only the latest reading, in memory. It isn't saved and isn't part of the contract.
- The app keeps the screen on while open, and stops measuring when it's closed.
