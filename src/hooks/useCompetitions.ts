import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { Competition, Registration } from '@/lib/database.types';

export type CompetitionWithSource = Competition & { _fromCalendar?: boolean };

export function useCompetitions() {
  const [upcoming, setUpcoming]           = useState<CompetitionWithSource[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]             = useState(true);

  const refetch = useCallback(async () => {
    try {
      const response = await api.get<{ upcoming: CompetitionWithSource[]; registrations: Registration[] }>('/api/competitions');
      setUpcoming(response.upcoming ?? []); setRegistrations(response.registrations ?? []);
    } catch (e: any) { console.error('[useCompetitions]', e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  return { upcoming, registrations, loading, refetch };
}
