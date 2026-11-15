#!/usr/bin/env bash
# Pairs this laptop with the watch over Wi-Fi. Finds the watch's "Pair new device" port by itself,
# then asks for the 6-digit code shown on the watch.
# Usage: people/zt/watch-hr/pair.sh <WATCH_IP>
ADB="${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb"
WATCH="${1:?Give the watch IP, for example 192.168.50.221}"
echo "On the watch: Wireless debugging -> Pair new device. Keep tapping the screen so it stays on."
echo "Looking for the watch's pairing screen..."
while true; do
  for port in $(timeout 3 avahi-browse -rpt _adb-tls-pairing._tcp 2>/dev/null \
      | awk -F';' -v w="$WATCH" '$1 == "=" && $8 == w { print $9 }' | sort -u); do
    if timeout 1 bash -c "echo > /dev/tcp/$WATCH/$port" 2>/dev/null; then
      echo
      echo "Found it (port $port). Type the 6-digit code shown on the watch, then press Enter."
      "$ADB" pair "$WATCH:$port" && exit 0
      echo "That didn't work. Open Pair new device again for a fresh code."
    fi
  done
  sleep 1
done
