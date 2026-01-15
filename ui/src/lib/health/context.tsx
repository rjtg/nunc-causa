"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/context";

type HealthState = {
  online: boolean;
  lastCheckedAt: string | null;
  recoveries: number;
  checkNow: () => void;
};

const HealthContext = createContext<HealthState | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const { baseUrl } = useAuth();
  const [online, setOnline] = useState(true);
  const [recoveries, setRecoveries] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNow = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/actuator/health`, {
        cache: "no-store",
      });
      const nextOnline = response.ok;
      setLastCheckedAt(new Date().toISOString());
      setOnline((prevOnline) => {
        if (!prevOnline && nextOnline) {
          setRecoveries((prev) => prev + 1);
        }
        return nextOnline;
      });
    } catch {
      setLastCheckedAt(new Date().toISOString());
      setOnline(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const immediate = setTimeout(checkNow, 0);
    timerRef.current = setInterval(checkNow, 5000);
    return () => {
      clearTimeout(immediate);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [checkNow]);

  const value = useMemo(
    () => ({
      online,
      lastCheckedAt,
      recoveries,
      checkNow,
    }),
    [checkNow, lastCheckedAt, online, recoveries],
  );

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error("useHealth must be used within HealthProvider");
  }
  return ctx;
}
