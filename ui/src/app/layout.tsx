import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import TopBar from "@/components/top-bar";
import HealthBanner from "@/components/health-banner";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";

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
            <div className="mx-auto flex w-full gap-5 px-5 py-5">
              <aside className="shrink-0">
                <nav className="flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/70 p-2 text-slate-700 shadow-sm">
                  {[
                    { href: "/work", label: "My Work", icon: "comment" as const },
                    { href: "/issues", label: "Issues", icon: "filter" as const },
                    { href: "/projects", label: "Projects", icon: "link" as const },
                    { href: "/admin", label: "Admin", icon: "reset" as const },
                  ].map((item) => (
                    <Tooltip key={item.href} content={item.label}>
                      <Link
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-white/80 text-slate-700 shadow-sm transition hover:border-slate-200 hover:bg-white"
                        href={item.href}
                        aria-label={item.label}
                      >
                        <Icon name={item.icon} size={16} />
                      </Link>
                    </Tooltip>
                  ))}
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
