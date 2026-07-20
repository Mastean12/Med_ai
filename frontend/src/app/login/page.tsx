"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace("/student");
  }, [user, authLoading, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.push("/student");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg.includes("Invalid login credentials") ? "Invalid email or password." : msg.includes("Email not confirmed") ? "Please confirm your email first." : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-surface-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50"><LogIn className="h-6 w-6 text-brand-600" /></div>
            <h1 className="text-xl font-bold text-surface-900">Welcome back</h1>
            <p className="mt-1 text-sm text-surface-500">Sign in to your account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required
                className="mt-2 block w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder-surface-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-surface-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">Forgot?</Link>
              </div>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" required
                className="mt-2 block w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder-surface-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Signing in...</span> : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-surface-500">Don&apos;t have an account? <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
