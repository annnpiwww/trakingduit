#!/usr/bin/env bash
set -e

echo "=== BUILDING TRACKINGDUIT ANDROID APP FOR PLAY STORE & DIRECT APK DOWNLOAD ==="

# Ensure web assets directory & fallback index.html exist for Capacitor sync
mkdir -p out
if [ ! -f "out/index.html" ]; then
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>trakingduit</title></head><body><script>window.location.href="/";</script></body></html>' > out/index.html
fi

# 1. Check if Android platform needs initialization
if [ ! -f "android/build.gradle" ]; then
    echo "Initializing Android Capacitor project..."
    if [ -d "android" ]; then
        echo "Backing up custom Kotlin source files..."
        mkdir -p .temp_android_backup
        cp -r android/app/src/main/* .temp_android_backup/
        rm -rf android
    fi

    npx cap add android

    if [ -d ".temp_android_backup" ]; then
        echo "Restoring custom Kotlin source files and AndroidManifest..."
        cp -r .temp_android_backup/* android/app/src/main/
        rm -rf .temp_android_backup
    fi
fi

# 2. Sync web assets & plugins to Android project
echo "Syncing Capacitor plugins and web assets..."
npx cap sync android

# 3. Check gradlew executable and build signed debug APK & release bundle
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
    echo "Building Android Signed APK & Release AAB..."
    cd android
    ./gradlew assembleDebug assembleRelease bundleRelease
    cd ..
    echo ""
    echo "=== BUILD COMPLETE! ==="
    echo "Signed Installable APK Output: android/app/build/outputs/apk/debug/app-debug.apk"
    echo "Unsigned Release APK Output: android/app/build/outputs/apk/release/app-release-unsigned.apk"
    echo "Play Store AAB Output: android/app/build/outputs/bundle/release/app-release.aab"
else
    echo "Capacitor sync complete. Open Android Studio with: npx cap open android"
fi
