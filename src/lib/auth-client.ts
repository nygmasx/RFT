import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
export const TOKEN_KEY = 'ba_token';

export function authRedirect(path: 'verify' | 'reset-password') {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/${path}`;
  return `rft://${path}`;
}

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

async function parseAuthResponse<T>(res: Response, fallback: string): Promise<AuthResult<T>> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: { message: data.message ?? data.error ?? fallback } };
  }
  return { data, error: null };
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
      callbackURL?: string;
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    try {
      if (token) await authFetch('/api/auth/revoke-session', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }): Promise<AuthResult<{ status: boolean }>> {
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const result = await parseAuthResponse<{ status: boolean }>(res, 'Changement de mot de passe impossible');
      if (!result.error) await storeToken(result.data);
      return result;
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async requestPasswordReset(email: string): Promise<AuthResult<{ status: boolean }>> {
    try {
      const res = await authFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email, redirectTo: authRedirect('reset-password') }),
      });
      return parseAuthResponse<{ status: boolean }>(res, 'Demande impossible');
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async resetPassword(newPassword: string, token: string): Promise<AuthResult<{ status: boolean }>> {
    try {
      const res = await authFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword, token }),
      });
      return parseAuthResponse<{ status: boolean }>(res, 'Réinitialisation impossible');
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async sendVerificationEmail(email: string): Promise<AuthResult<{ status: boolean }>> {
    try {
      const res = await authFetch('/api/auth/send-verification-email', {
        method: 'POST',
        body: JSON.stringify({ email, callbackURL: authRedirect('verify') }),
      });
      return parseAuthResponse<{ status: boolean }>(res, 'Envoi impossible');
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async deleteUser(password: string): Promise<AuthResult<{ success: boolean; message: string }>> {
    try {
      const res = await authFetch('/api/auth/delete-user', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      const result = await parseAuthResponse<{ success: boolean; message: string }>(res, 'Suppression du compte impossible');
      if (!result.error) await AsyncStorage.removeItem(TOKEN_KEY);
      return result;
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  onSessionChange(_cb: (session: AuthSession | null) => void): { stop: () => void } {
    return { stop: () => {} };
  },
};
