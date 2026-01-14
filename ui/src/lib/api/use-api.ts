"use client";

import { useMemo } from "react";
import { createApiClient } from "./client";
import { useAuth } from "../auth/context";

export function useApi() {
  const { baseUrl, token } = useAuth();
  return useMemo(() => createApiClient({ baseUrl, token }), [baseUrl, token]);
}
