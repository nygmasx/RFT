import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { Competition, Registration } from '@/lib/database.types';

export type CompetitionWithSource = Competition & { _fromCalendar?: boolean };

export function useCompetitions() {
  const [upcoming, setUpcoming]           = useState<CompetitionWithSource[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]             = useState(true);

  const refetch = useCallback(() => {
    api.get<{ upcoming: CompetitionWithSource[]; registrations: Registration[] }>('/api/competitions')
      .then(({ upcoming, registrations }) => {
        setUpcoming(upcoming ?? []);
        setRegistrations(registrations ?? []);
        setLoading(false);
      })
      .catch((e) => { console.error('[useCompetitions]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(refetch);

  return { upcoming, registrations, loading, refetch };
}
