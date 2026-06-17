import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api';

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'member' | 'coach' | 'admin';
  avatarUrl?: string | null;
  category?: string | null;
  weightClass?: string | null;
  phone?: string | null;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  profileStatus: 'pending' | 'approved' | 'rejected' | null;
  signOut: () => Promise<void>;
  refreshProfileStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profileStatus: null,
  signOut: async () => {},
  refreshProfileStatus: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const segments = useSegments();

  const fetchUser = async (): Promise<UserProfile | null> => {
    const { data } = await authClient.getSession();
    console.log('[Auth] session user:', JSON.stringify(data?.user));
    if (!data?.user) return null;
    const profile = await api.get<UserProfile>('/api/profile').catch((e) => {
      console.log('[Auth] profile fetch error:', e.message);
      return data.user as UserProfile;
    });
    console.log('[Auth] profile from DB:', JSON.stringify(profile));
    return profile;
  };

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Redirect logic
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const current = segments[1];

    if (!user) {
      if (!inAuth || current === 'pending') router.replace('/(auth)/login');
      return;
    }

    const isCoach = user.role === 'coach' || user.role === 'admin';

    if (!isCoach && (user.status === 'pending')) {
      if (current !== 'pending') router.replace('/(auth)/pending');
      return;
    }

    if ((isCoach || user.status === 'approved') && inAuth) {
      router.replace('/(tabs)/accueil');
    }
  }, [user, loading, segments]);

  const refreshProfileStatus = async () => {
    const u = await fetchUser();
    setUser(u);
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
    router.replace('/(auth)/login');
  };

  const profileStatus = user?.status ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, profileStatus, signOut, refreshProfileStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
