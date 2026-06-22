"use client";

import { USE_MOCK_API } from "@/lib/config";
import { type StoredUser, clearStoredUser, getStoredUser, setStoredUser } from "@/lib/user-storage";
import { useCallback, useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (USE_MOCK_API) {
      setUser(getStoredUser());
    }
    setHydrated(true);
  }, []);

  const login = useCallback((name: string) => {
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

  return {
    user,
    hydrated,
    login,
    logout,
    enabled: USE_MOCK_API,
  };
}
