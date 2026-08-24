import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

export type FamilyProfile = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  category: string | null;
};

export type ClassBooking = {
  id: string;
  familyProfileId: string | null;
  userId: string | null;
  status: 'booked' | 'waitlist' | 'cancelled' | 'attended' | 'absent';
};

export type ClassSession = {
  id: string;
  title: string;
  discipline: string;
  category: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string | null;
  place: string | null;
  capacity: number;
  status: string;
  coachFirstName: string | null;
  coachLastName: string | null;
  bookedCount: number;
  bookings: ClassBooking[];
};

export type Membership = {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  nextPaymentDate: string | null;
  balanceCents: number;
  planName: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  checkoutUrl: string | null;
};

export type Payment = {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type ClubDocument = {
  id: string;
  title: string;
  category: string;
  fileName: string;
  mimeType: string;
  url: string;
  expiresOn: string | null;
  createdAt: string;
};

export type ClubOverview = {
  sessions: ClassSession[];
  familyProfiles: FamilyProfile[];
  memberships: Membership[];
  payments: Payment[];
  documents: ClubDocument[];
  attendance: { attended: number; absent: number; total: number };
};

const EMPTY: ClubOverview = {
  sessions: [], familyProfiles: [], memberships: [], payments: [], documents: [],
  attendance: { attended: 0, absent: 0, total: 0 },
};

export function useClubOverview() {
  const [data, setData] = useState<ClubOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refetch = useCallback(async () => {
    try {
      setError('');
      setData(await api.get<ClubOverview>('/api/club/overview'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger le club');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);
  return { data, loading, error, refetch };
}

export type AdminClubData = {
  sessions: Omit<ClassSession, 'bookings' | 'coachFirstName' | 'coachLastName'>[];
  seasons: { id: string; name: string; startDate: string; endDate: string; status: string }[];
  plans: { id: string; name: string; priceCents: number; currency: string; billingInterval: string; checkoutUrl: string | null; active: boolean; features: string[] }[];
  memberships: { id: string; userId: string; planId: string; planName: string; firstName: string; lastName: string; status: string; balanceCents: number; startDate: string; endDate: string | null }[];
  payments: (Payment & { userId: string; firstName: string; lastName: string })[];
  submissions: { id: string; firstName: string; lastName: string; email: string; phone: string | null; status: string; createdAt: string }[];
  campaigns: { id: string; subject: string; audience: string; status: string; sentCount: number; createdAt: string }[];
  profile: { name: string; description: string | null; address: string | null; phone: string | null; email: string | null; website: string | null; disciplines: string[]; scheduleSummary: string | null; joinButtonLabel: string; joinFormId: string | null } | null;
  forms: { id: string; title: string; description: string | null; active: boolean; fields: unknown[] }[];
};

export function useAdminClub() {
  const [data, setData] = useState<AdminClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refetch = useCallback(async () => {
    try {
      setError('');
      setData(await api.get<AdminClubData>('/api/club/admin'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger la gestion du club');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);
  return { data, loading, error, refetch };
}
