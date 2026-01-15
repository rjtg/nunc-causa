import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import TopBar from "@/components/top-bar";
import HealthBanner from "@/components/health-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Causa",
  description: "Issue resolution tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
            <TopBar />
            <HealthBanner />
            <div className="mx-auto flex max-w-6xl gap-5 px-5 py-5">
              <aside className="w-48 shrink-0">
                <nav className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <Link className="rounded-lg bg-white/80 px-4 py-2" href="/work">
                    My Work
                  </Link>
                  <Link className="rounded-lg px-4 py-2 hover:bg-white/70" href="/issues">
                    Issues
                  </Link>
                  <Link className="rounded-lg px-4 py-2 hover:bg-white/70" href="/projects">
                    Projects
                  </Link>
                  <Link className="rounded-lg px-4 py-2 hover:bg-white/70" href="/admin">
                    Admin
                  </Link>
                </nav>
              </aside>
              <main className="min-h-[70vh] flex-1 space-y-6 rounded-2xl border border-white/40 bg-white/80 p-6 shadow-sm">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
