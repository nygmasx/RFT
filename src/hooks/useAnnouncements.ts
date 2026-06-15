import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { Announcement } from '@/lib/database.types';

export function useAnnouncements() {
  const [data, setData]       = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.get<Announcement[]>('/api/announcements')
      .then((rows) => { setData(rows ?? []); setLoading(false); })
      .catch((e) => { console.error('[useAnnouncements]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(refetch);

  return { data, loading, refetch };
}
