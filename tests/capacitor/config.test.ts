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
    expect(configContent).toContain('appName: "trakingduit"');
    expect(configContent).toContain('webDir: "out"');
  });
});
