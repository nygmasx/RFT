import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
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
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;

    // Register device token
    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      await api.post('/api/push-tokens', { token }).catch(() => {});
    });

    // Handle tap on notification → navigate to chat
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        channelId?: string;
        channelName?: string;
        announcementId?: string;
      };
      if (data?.channelId) {
        router.push({
          pathname: '/chat',
          params: { channel: data.channelId, name: data.channelName ?? 'Salon' },
        });
      } else if (data?.announcementId) {
        router.push({ pathname: '/announcement', params: { id: data.announcementId } });
      }
    });

    return () => sub.remove();
  }, [userId]);
}
