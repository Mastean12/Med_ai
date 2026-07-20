"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, LogOut } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  // Student area has its own sidebar — don't render top nav
  if (pathname.startsWith("/student") || pathname.startsWith("/account")) return null;

  const handleSignOut = async () => {
    setLoggingOut(true);
    try { await signOut(); router.push("/"); router.refresh(); }
    finally { setLoggingOut(false); setMobileOpen(false); }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">N</div>
          <span className="text-base font-bold tracking-tight text-surface-900">Noctual</span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <Link href="/student" className="text-sm font-medium text-surface-500 transition-colors hover:text-brand-600">Dashboard</Link>
          <Link href="/pricing" className="text-sm font-medium text-surface-500 transition-colors hover:text-brand-600">Pricing</Link>
          <Link href="/public" className="text-sm font-medium text-surface-500 transition-colors hover:text-brand-600">Public Health</Link>

          {loading ? (
            <div className="h-9 w-20 animate-shimmer rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href="/student" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700">
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-50"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100">Sign in</Link>
              <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700">Get Started</Link>
            </div>
          )}
        </nav>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-surface-200 bg-white px-5 py-4 md:hidden space-y-1">
          <Link href="/student" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <Link href="/pricing" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/public" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Public Health</Link>
          <hr className="border-surface-200" />
          {user ? (
            <button onClick={handleSignOut} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-surface-600 hover:bg-surface-50">{loggingOut ? "..." : "Sign out"}</button>
          ) : (
            <>
              <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link href="/register" className="block rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-medium text-white" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
