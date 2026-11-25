import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FbUser,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { api } from './api';
import type { User } from '@aorta-iq/shared';

interface AuthCtx {
  firebaseUser: FbUser | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    idToken: string,
    inviteToken: string,
    extra?: { fullName?: string; doctorId?: string; pharmacistId?: string },
  ) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFb] = useState<FbUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On every Firebase auth state change (incl. page refresh), re-establish the
  // server session cookie via /api/auth/login. This is what keeps the doctor's /
  // pharmacist's session persistent and uncorrupted across reloads.
  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth, async (fb) => {
      setFb(fb);
      if (fb) {
        const idToken = await fb.getIdToken();
        try {
          const res = await api.post<{ user: User }>('/api/auth/login', { idToken });
          setUser(res.user);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    if (!firebaseAuth) throw new Error('auth_unavailable');
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const idToken = await cred.user.getIdToken();
    const res = await api.post<{ user: User }>('/api/auth/login', { idToken });
    setUser(res.user);
  }

  async function logout() {
    await api.post('/api/auth/logout');
    if (firebaseAuth) await fbSignOut(firebaseAuth);
    setUser(null);
  }

  async function register(
    idToken: string,
    inviteToken: string,
    extra?: { fullName?: string; doctorId?: string; pharmacistId?: string },
  ) {
    const res = await api.post<{ user: User }>('/api/auth/register', { idToken, inviteToken, ...extra });
    setUser(res.user);
  }

  return (
    <Ctx.Provider value={{ firebaseUser, user, loading, login, logout, register }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
