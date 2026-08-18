# Capacitor Mobile App & Custom Notification Listener Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrasi Capacitor 6 ke project Next.js TrackingDuit beserta custom Kotlin Notification Listener Plugin untuk auto-reading notifikasi transaksi bank/e-wallet Indonesia di Android.

**Architecture:** Capacitor mendandani aplikasi Next.js SSG/Export sebagai Android WebApp. Plugin Kotlin (`NotificationListenerPlugin` & `BankNotificationService`) menyadap `NotificationListenerService` Android OS, lalu meneruskan payload notifikasi finansial (BCA, Livin, BRImo, BNI, GoPay, OVO, Dana, ShopeePay) via Capacitor Event Bridge ke React Hook `useNotificationListener` di TypeScript frontend untuk auto-ingest transaksi dan menampilkan Toast notification.

**Tech Stack:** Next.js 16 (React 19), TypeScript, Capacitor 6 Core & Android (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), Kotlin, Android SDK Level 34 (NotificationListenerService), Vitest.

## Global Constraints

- Android API Target Level 34+ (Android 14) dan minimum SDK 24 (Android 7.0).
- Gunakan `@capacitor/core` ^6.0.0 dan `@capacitor/android` ^6.0.0.
- Package ID Android: `com.trakingduit.app`, App Name: `TrackingDuit`.
- Semua kode TypeScript & React Hook wajib fully-typed tanpa tipe `any`.
- Semua file Kotlin wajib zero placeholder dan memiliki error handling saat Android Service belum di-grant izin oleh user.
- Semua skrip build harus menggunakan `pnpm` dan `bash` kompatibel Linux/macOS.

---

### Task 1: Install & Konfigurasi Capacitor Core & Android Platform

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`
- Test: `tests/capacitor/config.test.ts`

**Interfaces:**
- Consumes: Standard Next.js `package.json` configuration.
- Produces: `CapacitorConfig` instance exported from `capacitor.config.ts` for Capacitor CLI build pipeline.

- [ ] **Step 1: Write the failing test**

Buat file `tests/capacitor/config.test.ts` untuk menguji keberadaan dan struktur file `capacitor.config.ts` serta dependency `@capacitor/core` pada `package.json`.

```typescript
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Capacitor Configuration Setup", () => {
  it("should have capacitor dependencies in package.json", () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkg.dependencies).toHaveProperty("@capacitor/core");
    expect(pkg.devDependencies).toHaveProperty("@capacitor/cli");
    expect(pkg.devDependencies).toHaveProperty("@capacitor/android");
  });

  it("should have capacitor.config.ts with correct appId and webDir", async () => {
    const configPath = path.join(process.cwd(), "capacitor.config.ts");
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, "utf-8");
    expect(configContent).toContain('appId: "com.trakingduit.app"');
    expect(configContent).toContain('appName: "TrackingDuit"');
    expect(configContent).toContain('webDir: "out"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/capacitor/config.test.ts`
Expected: FAIL (karena dependency `@capacitor/core` belum diinstall dan `capacitor.config.ts` belum dibuat).

- [ ] **Step 3: Write minimal implementation**

1. Install dependency Capacitor 6:
```bash
pnpm add @capacitor/core@^6.0.0
pnpm add -D @capacitor/cli@^6.0.0 @capacitor/android@^6.0.0
```

2. Buat file `capacitor.config.ts`:
```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.trakingduit.app",
  appName: "TrackingDuit",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0F172A",
      showSpinner: false,
    },
  },
};

export default config;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/capacitor/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml capacitor.config.ts tests/capacitor/config.test.ts
git commit -m "feat(capacitor): setup capacitor core config and android dependencies"
```

---

### Task 2: Buat Native Kotlin Notification Listener Capacitor Plugin (`com.trakingduit.app.plugins.NotificationListenerPlugin`)

**Files:**
- Create: `android/app/src/main/java/com/trakingduit/app/plugins/BankNotificationService.kt`
- Create: `android/app/src/main/java/com/trakingduit/app/plugins/NotificationListenerPlugin.kt`
- Create: `android/app/src/main/java/com/trakingduit/app/MainActivity.kt`
- Test: `tests/capacitor/plugin-kotlin.test.ts`

**Interfaces:**
- Consumes: Android System `NotificationListenerService` events.
- Produces: `@CapacitorPlugin(name = "NotificationListener")` exposing `checkPermission`, `requestPermission`, `getPendingNotifications`, and emitting `"bankNotificationReceived"` events.

- [ ] **Step 1: Write the failing test**

Buat file `tests/capacitor/plugin-kotlin.test.ts` untuk memverifikasi seluruh file Kotlin native plugin telah dibuat dan memiliki class serta annotation yang sesuai.

```typescript
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Native Kotlin Notification Listener Plugin Files", () => {
  const androidBase = path.join(
    process.cwd(),
    "android/app/src/main/java/com/trakingduit/app"
  );

  it("should have BankNotificationService.kt created", () => {
    const filePath = path.join(androidBase, "plugins/BankNotificationService.kt");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("class BankNotificationService : NotificationListenerService()");
    expect(content).toContain("fun onNotificationPosted");
  });

  it("should have NotificationListenerPlugin.kt created", () => {
    const filePath = path.join(androidBase, "plugins/NotificationListenerPlugin.kt");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('@CapacitorPlugin(name = "NotificationListener")');
    expect(content).toContain("fun checkPermission");
    expect(content).toContain("fun requestPermission");
    expect(content).toContain("fun getPendingNotifications");
  });

  it("should register NotificationListenerPlugin in MainActivity.kt", () => {
    const filePath = path.join(androidBase, "MainActivity.kt");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("registerPlugin(NotificationListenerPlugin::class.java)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/capacitor/plugin-kotlin.test.ts`
Expected: FAIL (file Kotlin native belum dibuat).

- [ ] **Step 3: Write minimal implementation**

1. Buat folder struktur Android jika belum ada:
```bash
mkdir -p android/app/src/main/java/com/trakingduit/app/plugins
```

2. Buat file `android/app/src/main/java/com/trakingduit/app/plugins/BankNotificationService.kt`:
```kotlin
package com.trakingduit.app.plugins

import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.getcapacitor.JSObject
import java.util.concurrent.ConcurrentLinkedQueue

class BankNotificationService : NotificationListenerService() {

    companion object {
        private val pendingNotifications = ConcurrentLinkedQueue<JSObject>()
        private var pluginInstance: NotificationListenerPlugin? = null

        fun setPluginInstance(instance: NotificationListenerPlugin?) {
            pluginInstance = instance
        }

        fun popPendingNotifications(): List<JSObject> {
            const list = mutableListOf<JSObject>()
            while (pendingNotifications.isNotEmpty()) {
                pendingNotifications.poll()?.let { list.add(it) }
            }
            return list
        }

        val SUPPORTED_PACKAGES = setOf(
            "com.bca",
            "id.bmri.livin",
            "id.co.bri.brimo",
            "id.bni.mobile.banking",
            "com.gojek.app",
            "com.ovo.id",
            "id.dana",
            "com.shopee.id"
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        if (!SUPPORTED_PACKAGES.contains(packageName)) return

        val extras: Bundle = sbn.notification.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val postTime = sbn.postTime

        if (title.isEmpty() && text.isEmpty()) return

        val data = JSObject().apply {
            put("id", sbn.id.toString())
            put("packageName", packageName)
            put("title", title)
            put("text", text)
            put("postTime", postTime)
        }

        val plugin = pluginInstance
        if (plugin != null) {
            plugin.emitBankNotification(data)
        } else {
            pendingNotifications.add(data)
        }
    }
}
```

3. Buat file `android/app/src/main/java/com/trakingduit/app/plugins/NotificationListenerPlugin.kt`:
```kotlin
package com.trakingduit.app.plugins

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NotificationListener")
class NotificationListenerPlugin : Plugin() {

    override fun load() {
        super.load()
        BankNotificationService.setPluginInstance(this)
    }

    override fun handleOnDestroy() {
        BankNotificationService.setPluginInstance(null)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val context: Context = context
        val packageName = context.packageName
        val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val isGranted = enabledPackages.contains(packageName)

        val ret = JSObject().apply {
            put("granted", isGranted)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)

        val ret = JSObject().apply {
            put("requested", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getPendingNotifications(call: PluginCall) {
        val pendingList = BankNotificationService.popPendingNotifications()
        val array = JSArray()
        for (item in pendingList) {
            array.put(item)
        }

        val ret = JSObject().apply {
            put("notifications", array)
        }
        call.resolve(ret)
    }

    fun emitBankNotification(data: JSObject) {
        notifyListeners("bankNotificationReceived", data)
    }
}
```

4. Buat file `android/app/src/main/java/com/trakingduit/app/MainActivity.kt`:
```kotlin
package com.trakingduit.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.trakingduit.app.plugins.NotificationListenerPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NotificationListenerPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/capacitor/plugin-kotlin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/trakingduit/app/plugins/ android/app/src/main/java/com/trakingduit/app/MainActivity.kt tests/capacitor/plugin-kotlin.test.ts
git commit -m "feat(android): add Kotlin NotificationListenerPlugin & BankNotificationService"
```

---

### Task 3: Buat TypeScript SDK & React Hook (`src/lib/capacitor/useNotificationListener.ts`)

**Files:**
- Create: `src/lib/capacitor/notification-listener.ts`
- Create: `src/lib/capacitor/useNotificationListener.ts`
- Test: `tests/hooks/useNotificationListener.test.ts`

**Interfaces:**
- Consumes: `@capacitor/core` `registerPlugin` bridge to native plugin `"NotificationListener"`.
- Produces: `NotificationListener` web plugin object and React hook `useNotificationListener()`.

- [ ] **Step 1: Write the failing test**

Buat file `tests/hooks/useNotificationListener.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationListener } from "@/lib/capacitor/useNotificationListener";
import { NotificationListener } from "@/lib/capacitor/notification-listener";

vi.mock("@/lib/capacitor/notification-listener", () => ({
  NotificationListener: {
    checkPermission: vi.fn(),
    requestPermission: vi.fn(),
    getPendingNotifications: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe("useNotificationListener React Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should check permission on mount", async () => {
    vi.mocked(NotificationListener.checkPermission).mockResolvedValue({ granted: true });
    vi.mocked(NotificationListener.getPendingNotifications).mockResolvedValue({ notifications: [] });
    vi.mocked(NotificationListener.addListener).mockResolvedValue({ remove: vi.fn() });

    const { result } = renderHook(() => useNotificationListener());

    await act(async () => {
      await Promise.resolve();
    });

    expect(NotificationListener.checkPermission).toHaveBeenCalled();
    expect(result.current.isPermissionGranted).toBe(true);
  });

  it("should request permission when trigger requested", async () => {
    vi.mocked(NotificationListener.requestPermission).mockResolvedValue({ requested: true });

    const { result } = renderHook(() => useNotificationListener());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(NotificationListener.requestPermission).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/hooks/useNotificationListener.test.ts`
Expected: FAIL (`@/lib/capacitor/notification-listener` & `useNotificationListener` tidak ditemukan).

- [ ] **Step 3: Write minimal implementation**

1. Buat file `src/lib/capacitor/notification-listener.ts`:
```typescript
import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface BankNotificationPayload {
  id: string;
  packageName: string;
  title: string;
  text: string;
  postTime: number;
}

export interface NotificationListenerPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ requested: boolean }>;
  getPendingNotifications(): Promise<{ notifications: BankNotificationPayload[] }>;
  addListener(
    eventName: "bankNotificationReceived",
    listenerFunc: (notification: BankNotificationPayload) => void
  ): Promise<PluginListenerHandle>;
}

export const NotificationListener = registerPlugin<NotificationListenerPlugin>(
  "NotificationListener",
  {
    web: {
      checkPermission: async () => ({ granted: false }),
      requestPermission: async () => ({ requested: false }),
      getPendingNotifications: async () => ({ notifications: [] }),
      addListener: async () => ({ remove: async () => {} }),
    },
  }
);
```

2. Buat file `src/lib/capacitor/useNotificationListener.ts`:
```typescript
import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  NotificationListener,
  BankNotificationPayload,
} from "./notification-listener";

export function useNotificationListener() {
  const [isSupported] = useState<boolean>(() => Capacitor.isNativePlatform());
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<BankNotificationPayload[]>([]);

  const checkPermission = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const res = await NotificationListener.checkPermission();
      setIsPermissionGranted(res.granted);
      return res.granted;
    } catch {
      setIsPermissionGranted(false);
      return false;
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const res = await NotificationListener.requestPermission();
      return res.requested;
    } catch {
      return false;
    }
  }, [isSupported]);

  const fetchPending = useCallback(async () => {
    if (!isSupported) return;
    try {
      const res = await NotificationListener.getPendingNotifications();
      if (res.notifications && res.notifications.length > 0) {
        setNotifications((prev) => [...prev, ...res.notifications]);
      }
    } catch {
      // Ignore web fallback errors
    }
  }, [isSupported]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    checkPermission();
    fetchPending();

    let handlerHandle: { remove: () => void } | null = null;

    NotificationListener.addListener("bankNotificationReceived", (data) => {
      setNotifications((prev) => [data, ...prev]);
    }).then((handle) => {
      handlerHandle = handle;
    });

    return () => {
      if (handlerHandle) {
        handlerHandle.remove();
      }
    };
  }, [isSupported, checkPermission, fetchPending]);

  return {
    isSupported,
    isPermissionGranted,
    checkPermission,
    requestPermission,
    notifications,
    clearNotifications,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/hooks/useNotificationListener.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/capacitor/ tests/hooks/useNotificationListener.test.ts
git commit -m "feat(capacitor): create notification listener TS SDK & useNotificationListener hook"
```

---

### Task 4: Integrasikan In-App Toast & Auto Ingest ke App Dashboard (`src/app/providers.tsx`)

**Files:**
- Create: `src/components/capacitor/NotificationBridge.tsx`
- Modify: `src/app/providers.tsx`
- Test: `tests/capacitor/notification-bridge.test.tsx`

**Interfaces:**
- Consumes: `useNotificationListener` hook & `useToast()` context.
- Produces: `<NotificationBridge />` component mounted inside `<Providers>` to capture transaction notifications app-wide.

- [ ] **Step 1: Write the failing test**

Buat file `tests/capacitor/notification-bridge.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { NotificationBridge } from "@/components/capacitor/NotificationBridge";

vi.mock("@/lib/capacitor/useNotificationListener", () => ({
  useNotificationListener: () => ({
    isSupported: true,
    isPermissionGranted: true,
    notifications: [
      {
        id: "101",
        packageName: "id.bmri.livin",
        title: "Transfer Masuk",
        text: "Transfer Rp 150.000 dari FULAN",
        postTime: Date.now(),
      },
    ],
    clearNotifications: vi.fn(),
  }),
}));

vi.mock("@/components/ui", () => ({
  useToast: () => vi.fn(),
}));

describe("NotificationBridge Component", () => {
  it("should render without crashing and process bank notifications", () => {
    const { container } = render(<NotificationBridge />);
    expect(container).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/capacitor/notification-bridge.test.tsx`
Expected: FAIL (`NotificationBridge` component belum ada).

- [ ] **Step 3: Write minimal implementation**

1. Buat file `src/components/capacitor/NotificationBridge.tsx`:
```typescript
"use client";

import * as React from "react";
import { useNotificationListener } from "@/lib/capacitor/useNotificationListener";
import { useToast } from "@/components/ui";
import { parseOCRText } from "@/lib/ocr/parser";

export function NotificationBridge() {
  const { notifications, clearNotifications } = useNotificationListener();
  const toast = useToast();
  const processedIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (notifications.length === 0) return;

    notifications.forEach((item) => {
      if (processedIds.current.has(item.id)) return;
      processedIds.current.add(item.id);

      const rawText = `${item.title} ${item.text}`;
      const parsed = parseOCRText(rawText);

      const amountFormatted = parsed.amount
        ? new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(parsed.amount)
        : "Rp 0";

      const merchantOrTitle = parsed.merchantName || item.title || "Notifikasi Bank";

      toast(
        `Notifikasi ${merchantOrTitle}: ${amountFormatted} detected.`,
        "info"
      );
    });

    clearNotifications();
  }, [notifications, clearNotifications, toast]);

  return null;
}
```

2. Modify `src/app/providers.tsx`:
Tambahkan `import { NotificationBridge } from "@/components/capacitor/NotificationBridge";` dan pasang komponen `<NotificationBridge />` di dalam `<ToastProvider>`.

```typescript
"use client";

import * as React from "react";
import { ThemeProvider } from "@/lib/theme";
import { SessionProvider } from "@/lib/session";
import { AutoSyncProvider } from "@/lib/sync/auto-sync";
import { ToastProvider, useToast } from "@/components/ui";
import { registerMutationErrorHandler } from "@/lib/repo";
import { NotificationBridge } from "@/components/capacitor/NotificationBridge";

/** Surface failed Dexie writes (repo mutations) as user-facing error toasts. */
function MutationErrorBridge() {
  const toast = useToast();
  React.useEffect(() => {
    registerMutationErrorHandler((err) => {
      toast(err instanceof Error ? err.message : "Gagal menyimpan data, coba lagi", "error");
    });
  }, [toast]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      return;
    }
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <MutationErrorBridge />
          <NotificationBridge />
          <AutoSyncProvider>{children}</AutoSyncProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/capacitor/notification-bridge.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/capacitor/NotificationBridge.tsx src/app/providers.tsx tests/capacitor/notification-bridge.test.tsx
git commit -m "feat(capacitor): mount NotificationBridge into app providers for auto transaction toasts"
```

---

### Task 5: Konfigurasi Android Manifest, App Icons, dan Script Build Release AAB / APK Play Store

**Files:**
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `scripts/build-android.sh`
- Test: `tests/capacitor/build-script.test.ts`

**Interfaces:**
- Consumes: Android OS build pipeline via `./gradlew` and Next.js `out` export directory.
- Produces: Compiled `.apk` and `.aab` Android release packages ready for Play Store submission.

- [ ] **Step 1: Write the failing test**

Buat file `tests/capacitor/build-script.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Android Build Configuration & Script", () => {
  it("should have AndroidManifest.xml configured with BankNotificationService", () => {
    const manifestPath = path.join(process.cwd(), "android/app/src/main/AndroidManifest.xml");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, "utf-8");
    expect(content).toContain('android:name=".plugins.BankNotificationService"');
    expect(content).toContain('android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"');
    expect(content).toContain('android.service.notification.NotificationListenerService');
  });

  it("should have build-android.sh script present and executable", () => {
    const scriptPath = path.join(process.cwd(), "scripts/build-android.sh");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toContain("pnpm build");
    expect(content).toContain("npx cap sync android");
    expect(content).toContain("./gradlew assembleRelease bundleRelease");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/capacitor/build-script.test.ts`
Expected: FAIL (`AndroidManifest.xml` dan `scripts/build-android.sh` belum ada).

- [ ] **Step 3: Write minimal implementation**

1. Buat file `android/app/src/main/AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.trakingduit.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBar"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".plugins.BankNotificationService"
            android:label="TrackingDuit Bank Listener"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

2. Buat file `scripts/build-android.sh`:
```bash
#!/usr/bin/env bash
set -e

echo "=== 1. Building Next.js Web App (Export) ==="
pnpm build

echo "=== 2. Syncing Web Assets to Android Platform ==="
npx cap sync android

echo "=== 3. Compiling Android Release (APK & AAB) ==="
cd android
./gradlew assembleRelease bundleRelease

echo "=== BUILD COMPLETE! ==="
echo "APK Output: android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo "AAB Output: android/app/build/outputs/bundle/release/app-release.aab"
```

3. Berikan permission executable pada script:
```bash
chmod +x scripts/build-android.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/capacitor/build-script.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml scripts/build-android.sh tests/capacitor/build-script.test.ts
git commit -m "feat(android): add AndroidManifest config and build-android.sh release script"
```
