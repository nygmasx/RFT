import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarEvent } from '@/lib/database.types';

export function useCalendarEvents() {
  const [data, setData] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        setData(data ?? []);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
