import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

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

  useEffect(() => {
    // Initial session check
    authClient.getSession().then(({ data }) => {
      setUser((data?.user as UserProfile) ?? null);
      setLoading(false);
    });

    // Listen to auth state changes
    const { stop } = authClient.onSessionChange((session) => {
      setUser((session?.user as UserProfile) ?? null);
    });

    return () => stop?.();
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
    const { data } = await authClient.getSession();
    setUser((data?.user as UserProfile) ?? null);
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
