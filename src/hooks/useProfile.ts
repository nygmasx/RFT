import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Profile, BeltRecord, PalmaresEntry } from '@/lib/database.types';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [belt, setBelt] = useState<BeltRecord | null>(null);
  const [palmares, setPalmares] = useState<PalmaresEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('belt_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('palmares')
        .select('*')
        .eq('user_id', user.id)
        .order('comp_date', { ascending: false }),
    ]).then(([p, b, pal]) => {
      setProfile(p.data);
      setBelt(b.data);
      setPalmares(pal.data ?? []);
      setLoading(false);
    });
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
  };

  return { profile, belt, palmares, loading, updateProfile };
}
