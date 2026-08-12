import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CalendarEvent } from '@/lib/database.types';

export function useCalendarEvents() {
  const { user } = useAuth();
  const [data, setData]       = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get<CalendarEvent[]>('/api/calendar')
      .then((rows) => { setData(rows ?? []); setLoading(false); })
      .catch((e) => { console.error('[useCalendarEvents]', e.message); setLoading(false); });
  }, [user]);

  useFocusEffect(fetchEvents);

  return { data, loading, refetch: fetchEvents };
}
