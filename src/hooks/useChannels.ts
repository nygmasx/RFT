import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Channel } from '@/lib/database.types';

export function useChannels() {
  const { user } = useAuth();
  const [data, setData]       = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get<Channel[]>('/api/channels')
      .then((rows) => { setData(rows ?? []); setLoading(false); })
      .catch((e) => { console.error('[useChannels]', e.message); setLoading(false); });
  }, [user]);

  useFocusEffect(refetch);

  return { data, loading, refetch };
}
