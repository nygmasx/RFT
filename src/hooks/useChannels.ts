import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { Channel } from '@/lib/database.types';

export function useChannels() {
  const [data, setData]       = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api.get<Channel[]>('/api/channels')
      .then((rows) => { setData(rows ?? []); setLoading(false); })
      .catch((e) => { console.error('[useChannels]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(refetch);

  return { data, loading, refetch };
}
