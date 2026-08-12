import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export type AppNotification = {
  id: string;
  type: 'announcement' | 'message' | 'competition' | 'calendar' | 'carpool' | 'registration' | 'info';
  title: string;
  body: string;
  data: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(() => {
    setLoading(true);
    api.get<AppNotification[]>('/api/notifications')
      .then((rows) => setData(rows ?? []))
      .catch((error) => console.error('[useNotifications]', error.message))
      .finally(() => setLoading(false));
  }, []);
  useFocusEffect(refetch);
  const markRead = useCallback(async (id: string) => {
    await api.put(`/api/notifications/${id}/read`, {});
    setData((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
  }, []);
  const markAllRead = useCallback(async () => {
    await api.post('/api/notifications/read-all', {});
    setData((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);
  return { data, loading, refetch, markRead, markAllRead, unreadCount: data.filter((item) => !item.isRead).length };
}
