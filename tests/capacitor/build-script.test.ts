import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Android Manifest & Build Script configuration', () => {
  it('should have AndroidManifest.xml with notification listener permissions', () => {
    const manifestPath = path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content).toContain('android.permission.BIND_NOTIFICATION_LISTENER_SERVICE');
    expect(content).toContain('android.permission.INTERNET');
    expect(content).toContain('BankNotificationService');
  });

  it('should have executable build-android.sh script', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/build-android.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('cap add android');
    expect(content).toContain('cap sync');
  });
});
