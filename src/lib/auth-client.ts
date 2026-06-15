import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
export const TOKEN_KEY = 'ba_token';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  status: string;
  role: string;
  avatarUrl?: string | null;
  category?: string | null;
  weightClass?: string | null;
  phone?: string | null;
};

type AuthSession = {
  user: AuthUser;
  session: { id: string; token: string; expiresAt: string };
};

type AuthResult<T> = { data: T | null; error: { message: string } | null };

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Origin': BASE_URL,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

async function storeToken(data: any) {
  const token = data?.token ?? data?.session?.token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
}

export const authClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }): Promise<AuthResult<AuthSession>> {
      try {
        const res = await authFetch('/api/auth/sign-in/email', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { data: null, error: { message: data.message ?? data.error ?? 'Connexion échouée' } };
        await storeToken(data);
        return { data, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
  },

  signUp: {
    async email(payload: {
      email: string; password: string; name: string;
      firstName: string; lastName: string; phone?: string;
      category?: string; status?: string; role?: string;
    }): Promise<AuthResult<AuthSession>> {
      try {
        const res = await authFetch('/api/auth/sign-up/email', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { data: null, error: { message: data.message ?? data.error ?? 'Inscription échouée' } };
        await storeToken(data);
        return { data, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
  },

  async getSession(): Promise<{ data: AuthSession | null }> {
    try {
      const res = await authFetch('/api/auth/get-session');
      if (!res.ok) return { data: null };
      const data = await res.json();
      return { data: data?.user ? data : null };
    } catch {
      return { data: null };
    }
  },

  async signOut(): Promise<void> {
    try { await authFetch('/api/auth/sign-out', { method: 'POST' }); } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  onSessionChange(_cb: (session: AuthSession | null) => void): { stop: () => void } {
    return { stop: () => {} };
  },
};
