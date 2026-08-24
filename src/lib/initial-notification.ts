import * as Notifications from 'expo-notifications';

import { notificationHref } from '@/lib/notification-navigation';

export async function takeInitialNotificationHref(currentUserId?: string) {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const data = response.notification.request.content.data as Record<string, unknown>;
  await Notifications.clearLastNotificationResponseAsync();
  if (typeof data.senderId === 'string' && data.senderId === currentUserId) return null;
  return notificationHref(data);
}
