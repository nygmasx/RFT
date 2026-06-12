import { Session, User } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type ProfileStatus = 'pending' | 'approved' | 'rejected' | null;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profileStatus: ProfileStatus;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfileStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profileStatus: null,
  loading: true,
  signOut: async () => {},
  refreshProfileStatus: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const fetchProfileStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();
    return (data?.status as ProfileStatus) ?? null;
  };

  const refreshProfileStatus = useCallback(async () => {
    if (!session?.user) return;
    const status = await fetchProfileStatus(session.user.id);
    setProfileStatus(status);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const status = await fetchProfileStatus(session.user.id);
        setProfileStatus(status);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          const status = await fetchProfileStatus(session.user.id);
          setProfileStatus(status);
        } else {
          setProfileStatus(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Redirection selon l'état
  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const currentScreen = segments[1];

    if (!session) {
      if (!inAuth || currentScreen === 'pending') {
        router.replace('/(auth)/login');
      }
      return;
    }

    const isCoach = session.user.app_metadata?.role === 'coach';

    if (!isCoach && (profileStatus === 'pending' || profileStatus === null)) {
      if (currentScreen !== 'pending') {
        router.replace('/(auth)/pending');
      }
      return;
    }

    if (profileStatus === 'approved' && inAuth) {
      router.replace('/(tabs)/accueil');
    }
  }, [session, profileStatus, loading, segments]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfileStatus(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profileStatus,
      loading,
      signOut,
      refreshProfileStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
