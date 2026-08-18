import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/capacitor/useNotificationListener', () => ({
  useNotificationListener: vi.fn().mockReturnValue({
    isSupported: true,
    hasPermission: true,
    latestNotification: null,
  }),
}));

import NotificationBridge from '@/components/mobile/NotificationBridge';

describe('NotificationBridge component', () => {
  it('should be a valid React component function', () => {
    expect(typeof NotificationBridge).toBe('function');
  });
});
