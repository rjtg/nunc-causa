"use client";

import {
  readBaseUrl,
  readToken,
  writeBaseUrl,
  writeToken,
} from "./storage";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AuthState = {
  token: string | null;
  baseUrl: string;
  setToken: (token: string | null) => void;
  setBaseUrl: (url: string) => void;
  clear: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const defaultBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => readToken());
  const [baseUrl, setBaseUrlState] = useState<string>(
    () => readBaseUrl() ?? defaultBaseUrl,
  );

  const setToken = useCallback((nextToken: string | null) => {
    setTokenState(nextToken);
    writeToken(nextToken);
  }, []);

  const setBaseUrl = useCallback((url: string) => {
    setBaseUrlState(url);
    writeBaseUrl(url);
  }, []);

  const clear = useCallback(() => {
    setTokenState(null);
    writeToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      baseUrl,
      setToken,
      setBaseUrl,
      clear,
    }),
    [token, baseUrl, setToken, setBaseUrl, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
