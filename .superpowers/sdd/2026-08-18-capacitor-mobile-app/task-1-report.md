# Task 1 Report: Install & Konfigurasi Capacitor Core & Android Platform

## Status
DONE

## Detail Perubahan
1. **Unit Test**: Dibuat `tests/capacitor/config.test.ts` untuk memverifikasi keberadaan dependency `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` di `package.json` serta konfigurasi `capacitor.config.ts`.
2. **Dependencies**:
   - Installed `@capacitor/core` ^6.0.0 (`dependencies`)
   - Installed `@capacitor/cli` ^6.0.0 (`devDependencies`)
   - Installed `@capacitor/android` ^6.0.0 (`devDependencies`)
3. **Configuration**:
   - Dibuat `capacitor.config.ts` dengan configuration:
     - `appId`: "com.trakingduit.app"
     - `appName`: "TrackingDuit"
     - `webDir`: "out"
     - `server.androidScheme`: "https"
     - `plugins.SplashScreen`: duration 1500ms, background `#0F172A`, spinner false.

## Hasil Verification Test
`pnpm vitest run tests/capacitor/config.test.ts` -> **PASS** (2/2 tests passed).
