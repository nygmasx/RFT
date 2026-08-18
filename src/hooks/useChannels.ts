import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Channel } from '@/lib/database.types';

export function useChannels() {
  const { user } = useAuth();
  const [data, setData]       = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try { setData(await api.get<Channel[]>('/api/channels') ?? []); }
    catch (e: any) { console.error('[useChannels]', e.message); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  return { data, loading, refetch };
}
