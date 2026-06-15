import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export interface MyCarpoolEntry {
  id: string;
  role: 'driver' | 'passenger';
  event: string;
  departure_at: string;
  departure_city: string;
  seats_taken: number;
  seats_total: number;
}

export function useMyCarpool() {
  const [data, setData]       = useState<MyCarpoolEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    api.get<{ driver: any[]; passenger: any[] }>('/api/carpools/mine')
      .then(({ driver, passenger }) => {
        const entries: MyCarpoolEntry[] = [
          ...driver.map((c) => ({
            id: c.id, role: 'driver' as const,
            event:          c.competition?.name ?? 'Événement inconnu',
            departure_at:   c.departureAt,
            departure_city: c.departureCity,
            seats_taken:    c.seatsTaken,
            seats_total:    c.seatsTotal,
          })),
          ...passenger.map((c) => ({
            id: c.id, role: 'passenger' as const,
            event:          c.competition?.name ?? 'Événement inconnu',
            departure_at:   c.departureAt,
            departure_city: c.departureCity,
            seats_taken:    c.seatsTaken,
            seats_total:    c.seatsTotal,
          })),
        ].sort((a, b) => new Date(b.departure_at).getTime() - new Date(a.departure_at).getTime());

        setData(entries);
        setLoading(false);
      })
      .catch((e) => { console.error('[useMyCarpool]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(fetch);

  return { data, loading };
}
