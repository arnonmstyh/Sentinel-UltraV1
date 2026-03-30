import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = { username: string } | null;

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser;
  login: (
    username: string,
    password: string,
    options?: { rememberMe?: boolean }
  ) => Promise<{ ok: boolean; message?: string; lockedUntil?: number }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_STORAGE_KEY = "sentinel_auth";
const CONCURRENT_SESSIONS_KEY = "sentinel_concurrent_sessions";

type StoredAuth = {
  username: string;
  expiresAt: number; // epoch ms
  sessionId: string; // unique session identifier
};

type ConcurrentSession = {
  sessionId: string;
  username: string;
  expiresAt: number;
  lastActivity: number;
};

type RateRecord = {
  failedAttempts: number;
  lockedUntil?: number; // epoch ms
};

const RATE_KEY = "sentinel_auth_rate";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_SESSIONS = 5; // Allow up to 5 concurrent sessions
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Generate unique session ID using crypto API for security
  const generateSessionId = () => {
    // Use crypto API for cryptographically secure random values
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for environments without crypto API (shouldn't happen in browsers)
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get all concurrent sessions for a user
  const getConcurrentSessions = (username: string): ConcurrentSession[] => {
    try {
      const raw = localStorage.getItem(CONCURRENT_SESSIONS_KEY);
      const allSessions = raw ? (JSON.parse(raw) as ConcurrentSession[]) : [];
      return allSessions.filter(session => 
        session.username === username && 
        session.expiresAt > Date.now() &&
        (Date.now() - session.lastActivity) < SESSION_TIMEOUT_MS
      );
    } catch {
      return [];
    }
  };

  // Add a new concurrent session
  const addConcurrentSession = (username: string, sessionId: string, expiresAt: number) => {
    try {
      const raw = localStorage.getItem(CONCURRENT_SESSIONS_KEY);
      const allSessions = raw ? (JSON.parse(raw) as ConcurrentSession[]) : [];
      
      // Clean up expired sessions
      const activeSessions = allSessions.filter(session => 
        session.expiresAt > Date.now() &&
        (Date.now() - session.lastActivity) < SESSION_TIMEOUT_MS
      );

      // Add new session
      const newSession: ConcurrentSession = {
        sessionId,
        username,
        expiresAt,
        lastActivity: Date.now()
      };
      
      activeSessions.push(newSession);
      localStorage.setItem(CONCURRENT_SESSIONS_KEY, JSON.stringify(activeSessions));
    } catch {
      // ignore
    }
  };

  // Update session activity
  const updateSessionActivity = (sessionId: string) => {
    try {
      const raw = localStorage.getItem(CONCURRENT_SESSIONS_KEY);
      const allSessions = raw ? (JSON.parse(raw) as ConcurrentSession[]) : [];
      
      const updatedSessions = allSessions.map(session => 
        session.sessionId === sessionId 
          ? { ...session, lastActivity: Date.now() }
          : session
      );
      
      localStorage.setItem(CONCURRENT_SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch {
      // ignore
    }
  };

  // Remove a specific session
  const removeConcurrentSession = (sessionId: string) => {
    try {
      const raw = localStorage.getItem(CONCURRENT_SESSIONS_KEY);
      const allSessions = raw ? (JSON.parse(raw) as ConcurrentSession[]) : [];
      
      const filteredSessions = allSessions.filter(session => session.sessionId !== sessionId);
      localStorage.setItem(CONCURRENT_SESSIONS_KEY, JSON.stringify(filteredSessions));
    } catch {
      // ignore
    }
  };

  const getInitialAuth = () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return { isAuthed: false, user: null as AuthUser };
      const parsed = JSON.parse(raw) as StoredAuth;
      if (parsed.expiresAt > Date.now()) {
        // Update session activity
        if (parsed.sessionId) {
          updateSessionActivity(parsed.sessionId);
        }
        return { isAuthed: true, user: { username: parsed.username } as AuthUser };
      }
      // Session expired, clean up
      if (parsed.sessionId) {
        removeConcurrentSession(parsed.sessionId);
      }
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return { isAuthed: false, user: null as AuthUser };
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return { isAuthed: false, user: null as AuthUser };
    }
  };

  const initial = getInitialAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initial.isAuthed);
  const [user, setUser] = useState<AuthUser>(initial.user);

  const getRate = (u: string): RateRecord => {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, RateRecord>) : {};
      return map[u] || { failedAttempts: 0 };
    } catch {
      return { failedAttempts: 0 };
    }
  };

  const setRate = (u: string, rec: RateRecord) => {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, RateRecord>) : {};
      map[u] = rec;
      localStorage.setItem(RATE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };

  const clearRate = (u: string) => {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, RateRecord>) : {};
      delete map[u];
      localStorage.setItem(RATE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };

  const login = async (username: string, password: string, options?: { rememberMe?: boolean }) => {
    const rememberMe = options?.rememberMe ?? true;

    // rate-limit check
    const rr = getRate(username);
    if (rr.lockedUntil && rr.lockedUntil > Date.now()) {
      return { ok: false, message: "Too many failed attempts. Try again later.", lockedUntil: rr.lockedUntil };
    }
    
    const valid = username === "admin" && password === "P@ssw0rd@DDPM69";
    if (valid) {
      // Check concurrent sessions limit
      const currentSessions = getConcurrentSessions(username);
      if (currentSessions.length >= MAX_CONCURRENT_SESSIONS) {
        return { ok: false, message: `Maximum ${MAX_CONCURRENT_SESSIONS} concurrent sessions allowed. Please close another session or wait for it to expire.` };
      }

      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h for persistent mode
      const sessionId = generateSessionId();
      const payload: StoredAuth = { username, expiresAt, sessionId };
      
      // Add to concurrent sessions
      addConcurrentSession(username, sessionId, expiresAt);
      
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
      } else {
        // session-only
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsAuthenticated(true);
      setUser({ username });
      clearRate(username);
      return { ok: true };
    }
    
    // record failure
    const next: RateRecord = { ...rr, failedAttempts: (rr.failedAttempts || 0) + 1 };
    if (next.failedAttempts >= MAX_ATTEMPTS) {
      next.lockedUntil = Date.now() + LOCK_DURATION_MS;
      next.failedAttempts = 0; // reset after lock
    }
    setRate(username, next);
    return { ok: false, message: "Invalid username or password", lockedUntil: next.lockedUntil };
  };

  const logout = () => {
    // Get current session ID before clearing
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        removeConcurrentSession(parsed.sessionId);
      }
    } catch {
      // ignore
    }
    
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setUser(null);
  };

  // Track user activity to update session activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredAuth;
          if (parsed.sessionId) {
            updateSessionActivity(parsed.sessionId);
          }
        }
      } catch {
        // ignore
      }
    };

    // Update activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, user, login, logout }),
    [isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


