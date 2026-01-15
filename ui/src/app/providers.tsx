"use client";

import { AuthProvider } from "@/lib/auth/context";
import AuthGate from "@/components/auth-gate";
import { HealthProvider } from "@/lib/health/context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HealthProvider>
        <AuthGate>{children}</AuthGate>
      </HealthProvider>
    </AuthProvider>
  );
}
