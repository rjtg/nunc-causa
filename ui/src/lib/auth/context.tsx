"use client";

import {
  readBaseUrl,
  readPassword,
  readToken,
  readUsername,
  writeBaseUrl,
  writePassword,
  writeToken,
  writeUsername,
} from "./storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthState = {
  token: string | null;
  username: string | null;
  password: string | null;
  baseUrl: string;
  ready: boolean;
  setToken: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  setPassword: (password: string | null) => void;
  setBaseUrl: (url: string) => void;
  clear: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const defaultBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [password, setPasswordState] = useState<string | null>(null);
  const [baseUrl, setBaseUrlState] = useState<string>(defaultBaseUrl);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = readToken();
    const storedBase = readBaseUrl();
    const storedUsername = readUsername();
    const storedPassword = readPassword();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenState(storedToken);
    setUsernameState(storedUsername);
    setPasswordState(storedPassword);
    setBaseUrlState(storedBase ?? defaultBaseUrl);
    setReady(true);
  }, []);

  const setToken = useCallback((nextToken: string | null) => {
    setTokenState(nextToken);
    writeToken(nextToken);
  }, []);

  const setUsername = useCallback((nextUsername: string | null) => {
    setUsernameState(nextUsername);
    writeUsername(nextUsername);
  }, []);

  const setPassword = useCallback((nextPassword: string | null) => {
    setPasswordState(nextPassword);
    writePassword(nextPassword);
  }, []);

  const setBaseUrl = useCallback((url: string) => {
    setBaseUrlState(url);
    writeBaseUrl(url);
  }, []);

  const clear = useCallback(() => {
    setTokenState(null);
    setUsernameState(null);
    setPasswordState(null);
    writeToken(null);
    writeUsername(null);
    writePassword(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      username,
      password,
      baseUrl,
      ready,
      setToken,
      setUsername,
      setPassword,
      setBaseUrl,
      clear,
    }),
    [
      token,
      username,
      password,
      baseUrl,
      ready,
      setToken,
      setUsername,
      setPassword,
      setBaseUrl,
      clear,
    ],
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
