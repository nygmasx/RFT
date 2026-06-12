import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Carpool } from '@/lib/database.types';

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
  const { user } = useAuth();
  const [data, setData] = useState<MyCarpoolEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      // Carpools where user is the driver
      supabase
        .from('carpools')
        .select('*, competitions(name, comp_date)')
        .eq('driver_id', user.id)
        .order('departure_at', { ascending: false }),
      // Carpools where user is a passenger
      supabase
        .from('carpool_passengers')
        .select('carpool_id, carpools(*, competitions(name, comp_date))')
        .eq('user_id', user.id),
    ]).then(([driverRes, passengerRes]) => {
      const driverEntries: MyCarpoolEntry[] = (driverRes.data ?? []).map((c: any) => ({
        id: c.id,
        role: 'driver' as const,
        event: c.competitions?.name ?? 'Événement inconnu',
        departure_at: c.departure_at,
        departure_city: c.departure_city,
        seats_taken: c.seats_taken,
        seats_total: c.seats_total,
      }));

      const passengerEntries: MyCarpoolEntry[] = (passengerRes.data ?? [])
        .filter((p: any) => p.carpools)
        .map((p: any) => ({
          id: p.carpools.id,
          role: 'passenger' as const,
          event: p.carpools.competitions?.name ?? 'Événement inconnu',
          departure_at: p.carpools.departure_at,
          departure_city: p.carpools.departure_city,
          seats_taken: p.carpools.seats_taken,
          seats_total: p.carpools.seats_total,
        }));

      const all = [...driverEntries, ...passengerEntries].sort(
        (a, b) => new Date(b.departure_at).getTime() - new Date(a.departure_at).getTime()
      );

      setData(all);
      setLoading(false);
    });
  }, [user]);

  return { data, loading };
}
