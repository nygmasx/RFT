import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Announcement } from '@/lib/database.types';

export function useAnnouncements() {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setData((data as Announcement[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
