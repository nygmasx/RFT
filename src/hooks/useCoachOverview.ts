import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api';

export type CoachMember = {
  id: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'member' | 'coach' | 'admin';
  avatarUrl: string | null;
};

export type CoachCompetitionOverview = {
  id: string;
  name: string;
  location: string | null;
  comp_date: string;
  comp_type: string | null;
  status: string;
  registered_count: number;
  result_count: number;
  pending_result_count: number;
};

export type CoachPendingResult = {
  id: string;
  competitionId: string | null;
  competitionName: string;
  firstName: string;
  lastName: string;
  resultStage: string;
};

export function useCoachOverview() {
  const [members, setMembers] = useState<CoachMember[]>([]);
  const [competitions, setCompetitions] = useState<CoachCompetitionOverview[]>([]);
  const [pendingResults, setPendingResults] = useState<CoachPendingResult[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const [memberRows, competitionRows, resultRows] = await Promise.all([
        api.get<CoachMember[]>('/api/profile/all'),
        api.get<CoachCompetitionOverview[]>('/api/competitions/admin/overview'),
        api.get<CoachPendingResult[]>('/api/palmares/admin/pending'),
      ]);
      setMembers(memberRows ?? []);
      setCompetitions(competitionRows ?? []);
      setPendingResults(resultRows ?? []);
    } catch (error: any) {
      console.error('[coach-overview]', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  return { members, competitions, pendingResults, loading, refetch };
}
