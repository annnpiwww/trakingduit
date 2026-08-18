import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Native Kotlin Notification Listener Plugin Files (Plan Spec)", () => {
  const androidBase = path.join(
    process.cwd(),
    "android/app/src/main/java/com/trakingduit/app"
  );

  it("should have BankNotificationService.kt created", () => {
    const servicePath = path.join(androidBase, "service/BankNotificationService.kt");
    const pluginsPath = path.join(androidBase, "plugins/BankNotificationService.kt");
    
    const exists = fs.existsSync(servicePath) || fs.existsSync(pluginsPath);
    expect(exists).toBe(true);

    const actualPath = fs.existsSync(servicePath) ? servicePath : pluginsPath;
    const content = fs.readFileSync(actualPath, "utf-8");
    expect(content).toContain("class BankNotificationService : NotificationListenerService()");
    expect(content).toContain("fun onNotificationPosted");
  });

  it("should have NotificationListenerPlugin.kt created", () => {
    const filePath = path.join(androidBase, "plugins/NotificationListenerPlugin.kt");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('@CapacitorPlugin(name = "NotificationListener")');
    expect(content).toContain("fun requestPermission");
  });

  it("should register NotificationListenerPlugin in MainActivity.kt", () => {
    const filePath = path.join(androidBase, "MainActivity.kt");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("registerPlugin(NotificationListenerPlugin::class.java)");
  });
});
