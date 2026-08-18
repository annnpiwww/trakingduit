#!/usr/bin/env bash
set -e

echo "=== BUILDING TRACKINGDUIT ANDROID APP FOR PLAY STORE ==="

# 1. Add Android platform if not initialized
if [ ! -d "android" ] || [ ! -f "android/build.gradle" ]; then
    echo "Adding Android platform..."
    npx cap add android
fi

# 2. Sync web assets & plugins to Android project
echo "Syncing Capacitor plugins and assets..."
npx cap sync android

# 3. Chmod gradlew if exists
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
    echo "Building Android Release APK / AAB Bundle..."
    cd android
    ./gradlew assembleRelease bundleRelease
    cd ..
    echo "=== BUILD COMPLETE! ==="
    echo "APK Output: android/app/build/outputs/apk/release/app-release-unsigned.apk"
    echo "AAB Output: android/app/build/outputs/bundle/release/app-release.aab"
else
    echo "Capacitor sync complete. Open Android Studio with: npx cap open android"
fi
