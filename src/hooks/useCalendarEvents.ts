import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CalendarEvent } from '@/lib/database.types';

export function useCalendarEvents() {
  const { user } = useAuth();
  const [data, setData]       = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try { setData(await api.get<CalendarEvent[]>('/api/calendar') ?? []); }
    catch (e: any) { console.error('[useCalendarEvents]', e.message); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void fetchEvents(); }, [fetchEvents]));

  return { data, loading, refetch: fetchEvents };
}
