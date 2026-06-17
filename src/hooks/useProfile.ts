import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BeltRecord, PalmaresEntry } from '@/lib/database.types';

// Profile fields come from Better Auth user
export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  memberId?: string | null;
  category?: string | null;
  weightClass?: string | null;
  stance?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [belt, setBelt]         = useState<BeltRecord | null>(null);
  const [palmares, setPalmares] = useState<PalmaresEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, b, pal] = await Promise.all([
        api.get<Profile>('/api/profile'),
        api.get<BeltRecord | null>(`/api/belt/${user.id}`),
        api.get<PalmaresEntry[]>(`/api/palmares/${user.id}`),
      ]);
      setProfile(p);
      setBelt(b);
      setPalmares(pal ?? []);
    } catch (e: any) {
      console.error('[useProfile]', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refetch(); }, [refetch]);

  const updateProfile = async (updates: Partial<Profile>) => {
    const updated = await api.put<Profile>('/api/profile', updates);
    setProfile(updated);
  };

  return { profile, belt, palmares, loading, updateProfile, refetch };
}
