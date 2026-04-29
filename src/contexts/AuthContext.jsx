import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearStoredSession,
  getStoredSession,
  login,
  me,
  registerClient,
  setStoredSession,
} from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const session = getStoredSession();

    if (!session?.token) {
      setUser(null);
      return;
    }

    try {
      const current = await me();
      setUser(current.user);
      setStoredSession({ token: session.token, user: current.user });
    } catch {
      clearStoredSession();
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      await refreshSession();
      if (mounted) {
        setLoading(false);
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async ({ email, password }) => {
    const session = await login({ email, password });
    setStoredSession(session);
    setUser(session.user);
    return session;
  };

  const signUp = async (payload) => {
    const session = await registerClient(payload);
    setStoredSession(session);
    setUser(session.user);
    return session;
  };

  const signOut = () => {
    clearStoredSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isPersonal: user?.role === "PERSONAL",
      isClient: user?.role === "ALUNO",
      personalId: user?.personalId || null,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
