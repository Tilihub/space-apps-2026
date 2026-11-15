#!/usr/bin/env bash
# Builds the watch app without Android Studio or Gradle.
# Needs a JDK (17) and the Android SDK at ~/Android/Sdk with build-tools 34.0.0 and platforms;android-34.
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"

rm -rf build && mkdir -p build/classes build/dex
"$BT/aapt2" link -o build/unsigned.apk -I "$JAR" --manifest AndroidManifest.xml \
  --min-sdk-version 30 --target-sdk-version 34 --version-code 1 --version-name 1.0
javac -source 8 -target 8 -bootclasspath "$JAR" -Xlint:-options -d build/classes $(find src -name '*.java')
"$BT/d8" --min-api 30 --lib "$JAR" --output build/dex $(find build/classes -name '*.class')
python3 -I -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1], 'a').write(sys.argv[2], 'classes.dex')" \
  build/unsigned.apk build/dex/classes.dex
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
# A throwaway debug signing key, like Android Studio's own; never committed.
[ -f debug.keystore ] || keytool -genkeypair -keystore debug.keystore -storepass android -keypass android \
  -alias debug -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Debug" > /dev/null 2>&1
"$BT/apksigner" sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android \
  --out build/watch-hr.apk build/aligned.apk
echo "Built $(pwd)/build/watch-hr.apk"
