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
  const fetchUser = async (): Promise<UserProfile | null> => {
    const { data } = await authClient.getSession();
    return data?.user ? data.user as UserProfile : null;
  };

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const refreshProfileStatus = async () => {
    const u = await fetchUser();
    setUser(u);
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
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
