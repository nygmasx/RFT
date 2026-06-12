import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Competition, Registration } from '@/lib/database.types';
import { useAuth } from '@/context/AuthContext';

export function useCompetitions() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .gte('comp_date', today)
        .order('comp_date', { ascending: true }),
      user
        ? supabase
            .from('registrations')
            .select('*, competitions(*)')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]).then(([comps, regs]) => {
      setUpcoming(comps.data ?? []);
      setRegistrations((regs.data as Registration[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  return { upcoming, registrations, loading };
}
