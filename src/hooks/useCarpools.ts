import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Carpool } from '@/lib/database.types';

type CarpoolApiRow = Partial<Carpool> & {
  driverId?: string;
  competitionId?: string | null;
  departureCity?: string;
  departureAt?: string;
  seatsTotal?: number;
  seatsTaken?: number;
  costPerSeat?: number | string;
  createdAt?: string;
};

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCarpool(row: CarpoolApiRow): Carpool | null {
  if (!row.id) return null;
  return {
    id: row.id,
    driver_id: row.driver_id ?? row.driverId ?? '',
    competition_id: row.competition_id ?? row.competitionId ?? null,
    departure_city: row.departure_city ?? row.departureCity ?? '',
    departure_at: row.departure_at ?? row.departureAt ?? '',
    seats_total: numberOrZero(row.seats_total ?? row.seatsTotal),
    seats_taken: numberOrZero(row.seats_taken ?? row.seatsTaken),
    cost_per_seat: numberOrZero(row.cost_per_seat ?? row.costPerSeat),
    notes: row.notes ?? null,
    created_at: row.created_at ?? row.createdAt ?? '',
    profiles: row.profiles,
    competitions: row.competitions,
  };
}

export function useCarpools() {
  const { user } = useAuth();
  const [data, setData]                               = useState<Carpool[]>([]);
  const [myPassengerCarpoolIds, setMyPassengerIds]    = useState<Set<string>>(new Set());
  const [loading, setLoading]                         = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api.get<{ carpools: CarpoolApiRow[]; myPassengerCarpoolIds: string[]; currentUserId: string }>('/api/carpools')
      .then(({ carpools, myPassengerCarpoolIds }) => {
        setData((carpools ?? []).map(normalizeCarpool).filter((row): row is Carpool => row !== null));
        setMyPassengerIds(new Set(myPassengerCarpoolIds));
        setLoading(false);
      })
      .catch((e) => { console.error('[useCarpools]', e.message); setLoading(false); });
  }, []);

  useFocusEffect(refetch);

  const joinCarpool = async (carpoolId: string) => {
    try {
      await api.post(`/api/carpools/${carpoolId}/join`, {});
      refetch();
    } catch (e: any) {
      console.error('[joinCarpool]', e.message);
      throw e;
    }
  };

  const leaveCarpool = async (carpoolId: string) => {
    try {
      await api.delete(`/api/carpools/${carpoolId}/join`);
      refetch();
    } catch (e: any) {
      console.error('[leaveCarpool]', e.message);
      throw e;
    }
  };

  return { data, loading, myPassengerCarpoolIds, currentUserId: user?.id, joinCarpool, leaveCarpool, refetch };
}
