"use client";

import { useMemo } from "react";
import { createApiClient } from "./client";
import { useAuth } from "../auth/context";

export function useApi() {
  const { baseUrl, token, username, password } = useAuth();
  return useMemo(
    () => createApiClient({ baseUrl, token, username, password }),
    [baseUrl, token, username, password],
  );
}
