import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Phase 1 auth is a frontend-only mock. No tokens, no localStorage — the
 * session lives in memory and resets on reload, matching the MVP security
 * rules (Phase 2 replaces this with an HTTP-only cookie session).
 */

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "change-me";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15_000;

interface AuthValue {
  user: string | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const attempts = useRef(0);
  const lockedUntil = useRef(0);

  const login = useCallback((username: string, password: string) => {
    const now = Date.now();
    if (now < lockedUntil.current) {
      const secs = Math.ceil((lockedUntil.current - now) / 1000);
      return { ok: false, error: `RATE LIMITED · RETRY IN ${secs}S` };
    }

    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      attempts.current = 0;
      setUser(username);
      return { ok: true };
    }

    attempts.current += 1;
    if (attempts.current >= MAX_ATTEMPTS) {
      lockedUntil.current = now + LOCK_MS;
      attempts.current = 0;
      return { ok: false, error: "TOO MANY ATTEMPTS · LOCKED 15S" };
    }
    return {
      ok: false,
      error: `INVALID CREDENTIALS · ${MAX_ATTEMPTS - attempts.current} LEFT`,
    };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo<AuthValue>(
    () => ({ user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const DEMO_CREDENTIALS = {
  username: DEMO_USERNAME,
  password: DEMO_PASSWORD,
};
