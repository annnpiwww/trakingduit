import { registerPlugin, Capacitor } from '@capacitor/core';

export interface BankNotificationPayload {
  bankName: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  description: string;
  rawText: string;
  timestamp: number;
  notificationId: string;
}

export interface PermissionStatus {
  granted: boolean;
}

export interface NotificationListenerPlugin {
  isPermissionGranted(): Promise<PermissionStatus>;
  requestPermission(): Promise<PermissionStatus>;
  getLogs(): Promise<{ logs: string[] }>;
  addListener(
    eventName: 'notificationReceived',
    listenerFunc: (payload: BankNotificationPayload) => void
  ): Promise<{ remove: () => void }>;
}

export const NotificationListener = registerPlugin<NotificationListenerPlugin>(
  'NotificationListener',
  {
    web: () => ({
      isPermissionGranted: async () => ({ granted: false }),
      requestPermission: async () => ({ granted: false }),
      getLogs: async () => ({ logs: ['Web fallback active'] }),
      addListener: async () => ({ remove: () => {} }),
    }),
  }
);

export function isMobileNative(): boolean {
  return Capacitor.isNativePlatform();
}
