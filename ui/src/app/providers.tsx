"use client";

import { AuthProvider } from "@/lib/auth/context";
import AuthGate from "@/components/auth-gate";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
