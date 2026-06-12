import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Channel } from '@/lib/database.types';

export function useChannels() {
  const [data, setData] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setData(data ?? []);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
