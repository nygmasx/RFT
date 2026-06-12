import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
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
    if (!userId) return;

    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      await supabase.from('push_tokens').upsert(
        { user_id: userId, token },
        { onConflict: 'user_id,token' }
      );
    });
  }, [userId]);
}
