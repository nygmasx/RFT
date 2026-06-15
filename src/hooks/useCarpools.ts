import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Carpool } from '@/lib/database.types';

export function useCarpools() {
  const { user } = useAuth();
  const [data, setData]                               = useState<Carpool[]>([]);
  const [myPassengerCarpoolIds, setMyPassengerIds]    = useState<Set<string>>(new Set());
  const [loading, setLoading]                         = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api.get<{ carpools: Carpool[]; myPassengerCarpoolIds: string[]; currentUserId: string }>('/api/carpools')
      .then(({ carpools, myPassengerCarpoolIds }) => {
        setData(carpools ?? []);
        setMyPassengerIds(new Set(myPassengerCarpoolIds));
        setLoading(false);
      })
      .catch((e) => { console.error('[useCarpools]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(refetch);

  const joinCarpool = async (carpoolId: string) => {
    try {
      await api.post(`/api/carpools/${carpoolId}/join`, {});
      refetch();
    } catch (e: any) {
      console.error('[joinCarpool]', e.message);
      throw e;
    }
  };

  return { data, loading, myPassengerCarpoolIds, currentUserId: user?.id, joinCarpool, refetch };
}
