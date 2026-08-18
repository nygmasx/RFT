import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api';

export type RankingPreviewRow = {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  p4pPoints: number;
  resultCount: number;
  wins: number;
};

type RankingResponse = {
  p4p: RankingPreviewRow[];
};

export function useRankingsPreview() {
  const [data, setData] = useState<RankingPreviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const response = await api.get<RankingResponse>('/api/rankings');
      setData((response.p4p ?? []).slice(0, 3));
    } catch (error: any) {
      console.error('[rankings-preview]', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  return { data, loading, refetch };
}
