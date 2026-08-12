import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Announcement } from '@/lib/database.types';

export function useAnnouncements() {
  const { user } = useAuth();
  const [data, setData]       = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get<Announcement[]>('/api/announcements')
      .then((rows) => { setData(rows ?? []); setLoading(false); })
      .catch((e) => { console.error('[useAnnouncements]', e.message); setLoading(false); });
  }, [user]);

  useFocusEffect(refetch);

  const markAllRead = useCallback(async () => {
    await api.post('/api/announcements/read-all', {});
    setData((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.put(`/api/announcements/${id}/read`, {});
    setData((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
  }, []);

  const unreadCount = data.filter((item) => !item.isRead).length;

  return { data, loading, refetch, markAllRead, markRead, unreadCount };
}
