import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Capacitor Core
vi.mock('@capacitor/core', () => {
  const registerPlugin = vi.fn().mockReturnValue({
    isPermissionGranted: vi.fn().mockResolvedValue({ granted: true }),
    requestPermission: vi.fn().mockResolvedValue({ granted: true }),
    getLogs: vi.fn().mockResolvedValue({ logs: [] }),
    addListener: vi.fn().mockImplementation((eventName, callback) => {
      return Promise.resolve({
        remove: vi.fn(),
      });
    }),
  });
  return {
    registerPlugin,
    Capacitor: {
      isNativePlatform: vi.fn().mockReturnValue(true),
    },
  };
});

import { NotificationListener, isMobileNative } from '@/lib/capacitor/notification-listener';
import { useNotificationListener } from '@/lib/capacitor/useNotificationListener';

describe('Capacitor Notification Listener TS SDK & Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export NotificationListener plugin wrapper', () => {
    expect(NotificationListener).toBeDefined();
    expect(typeof NotificationListener.isPermissionGranted).toBe('function');
    expect(typeof NotificationListener.requestPermission).toBe('function');
  });

  it('should detect if app is running natively or web fallback', () => {
    expect(typeof isMobileNative).toBe('function');
    expect(isMobileNative()).toBe(true);
  });

  it('should define useNotificationListener hook function', () => {
    expect(typeof useNotificationListener).toBe('function');
  });
});
