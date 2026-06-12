import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Carpool } from '@/lib/database.types';

export function useCarpools() {
  const [data, setData] = useState<Carpool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('carpools')
      .select('*, profiles(first_name, last_name), competitions(name, comp_date)')
      .gte('departure_at', new Date().toISOString())
      .order('departure_at', { ascending: true })
      .then(({ data }) => {
        setData((data as Carpool[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
