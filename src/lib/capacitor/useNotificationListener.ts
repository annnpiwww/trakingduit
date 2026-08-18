'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  NotificationListener,
  BankNotificationPayload,
  isMobileNative,
} from './notification-listener';

interface UseNotificationListenerOptions {
  onNotification?: (payload: BankNotificationPayload) => void;
  autoIngest?: boolean;
}

export function useNotificationListener(options: UseNotificationListenerOptions = {}) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSupported] = useState<boolean>(typeof window !== 'undefined' ? isMobileNative() : false);
  const [latestNotification, setLatestNotification] = useState<BankNotificationPayload | null>(null);

  const checkPermission = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const status = await NotificationListener.isPermissionGranted();
      setHasPermission(status.granted);
      return status.granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const status = await NotificationListener.requestPermission();
      setHasPermission(status.granted);
      return status.granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;

    checkPermission();

    let removeListener: (() => void) | null = null;

    NotificationListener.addListener('notificationReceived', (payload) => {
      setLatestNotification(payload);
      if (options.onNotification) {
        options.onNotification(payload);
      }
    }).then((handle) => {
      removeListener = handle.remove;
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isSupported, checkPermission, options.onNotification]);

  return {
    isSupported,
    hasPermission,
    checkPermission,
    requestPermission,
    latestNotification,
  };
}
