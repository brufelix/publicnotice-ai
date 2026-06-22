"use client";

import { USE_MOCK_API } from "@/lib/config";
import { type StoredUser, clearStoredUser, getStoredUser, setStoredUser } from "@/lib/user-storage";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface UserContextValue {
  user: StoredUser | null;
  hydrated: boolean;
  enabled: boolean;
  login: (name: string) => void;
  updateName: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (USE_MOCK_API) {
      setUser(getStoredUser());
    }
    setHydrated(true);
  }, []);

  const persistName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = { name: trimmed };
    if (USE_MOCK_API) {
      setStoredUser(next);
    }
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    if (USE_MOCK_API) {
      clearStoredUser();
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      hydrated,
      enabled: USE_MOCK_API,
      login: persistName,
      updateName: persistName,
      logout,
    }),
    [user, hydrated, persistName, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
