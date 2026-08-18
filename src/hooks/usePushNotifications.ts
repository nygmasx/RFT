import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

export type ForegroundNotification = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function openNotification(data: Record<string, unknown>) {
  const channelId = stringValue(data.channelId);
  const channelName = stringValue(data.channelName);
  const announcementId = stringValue(data.announcementId);
  const competitionId = stringValue(data.competitionId);
  const screen = stringValue(data.screen);

  if (screen === 'add_result') {
    router.push({ pathname: '/add-result', params: competitionId ? { competitionId } : {} });
  } else if (screen === 'admin_results') {
    router.push({ pathname: '/admin-results', params: competitionId ? { competitionId } : {} });
  } else if (channelId) {
    router.push({
      pathname: '/chat',
      params: { channel: channelId, name: channelName ?? 'Salon' },
    });
  } else if (announcementId) {
    router.push({ pathname: '/announcement', params: { id: announcementId } });
  } else if (competitionId) {
    router.push({ pathname: '/competition-detail', params: { id: competitionId } });
  } else if (stringValue(data.calendarEventId)) {
    router.push('/calendar');
  } else if (stringValue(data.carpoolId)) {
    router.push('/(tabs)/covoiturage');
  } else {
    router.push('/notifications');
  }
}

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null; // Simulateur : pas de push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Ronin Fight Team',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync({
    projectId: 'a2ffb9b1-9747-47e5-ace9-dcc8d62c6f32',
  });

  return data;
}

export function usePushNotifications(userId: string | undefined) {
  const [foregroundNotification, setForegroundNotification] = useState<ForegroundNotification | null>(null);
  const dismissForegroundNotification = useCallback(() => setForegroundNotification(null), []);

  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    let active = true;

    // Register device token
    registerForPushNotifications().then(async (token) => {
      if (!active || !token) return;
      await api.post('/api/push-tokens', { token }).catch(() => {});
    });

    // The native foreground presentation is disabled above. Render our own
    // in-app banner instead, and ignore a stale self-notification defensively.
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = content.data as Record<string, unknown>;
      if (stringValue(data.senderId) === userId) return;

      setForegroundNotification({
        id: notification.request.identifier,
        title: content.title?.trim() || 'Ronin Fight Team',
        body: content.body?.trim() || '',
        data,
      });
    });

    // Handle tap on notification → navigate to chat
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification.request.content.data as Record<string, unknown>);
    });

    return () => {
      active = false;
      receivedSub.remove();
      responseSub.remove();
      setForegroundNotification(null);
    };
  }, [userId]);

  const openForegroundNotification = useCallback(() => {
    if (!foregroundNotification) return;
    const { data } = foregroundNotification;
    setForegroundNotification(null);
    openNotification(data);
  }, [foregroundNotification]);

  return {
    foregroundNotification,
    dismissForegroundNotification,
    openForegroundNotification,
  };
}
