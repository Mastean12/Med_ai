"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User, Sun, Moon, Brain, LogOut, Save, Check,
  Shield, CreditCard, Monitor,
} from "lucide-react";
import { SettingsCard, FieldInput, ToggleSwitch, SelectField, LoadingSkeleton } from "@/components/SettingsCard";
import { API_BASE_URL } from "@/lib/apiClient";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "account", label: "Account", icon: Shield },
] as const;

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}

function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { theme, setTheme } = useTheme();

  const activeSection = searchParams.get("tab") || "profile";
  const setActiveSection = (id: string) => router.replace(`/account/settings?tab=${id}`);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [preferredMode, setPreferredMode] = useState("beginner");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!profile || profileLoading) return;
    setDisplayName(profile.display_name || user?.email?.split("@")[0] || "");
    const prefs = profile.preferences || {};
    setPreferredMode((prefs.preferred_mode as string) || "beginner");
  }, [profile, profileLoading, user]);

  const saveAll = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      const token = await getToken();
      const results = await Promise.allSettled([
        fetch(`${API_BASE_URL}/settings/profile`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: displayName }),
        }),
        fetch(`${API_BASE_URL}/settings/preferences`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ preferred_mode: preferredMode }),
        }),
      ]);
      const failures = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failures.length > 0) {
        setError("Failed to save. Try again.");
      } else {
        setSaved(true);
        await refreshProfile();
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally { setSaving(false); }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try { await signOut(); router.push("/"); router.refresh(); } finally { setLoggingOut(false); }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-surface-500">
          Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link>.
        </p>
      </div>
    );
  }

  if (profileLoading) return <LoadingSkeleton />;

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-surface-200 bg-white p-4 hidden lg:block">
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeSection === s.id ? "bg-brand-50 text-brand-700" : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
              }`}>
              <s.icon className="h-4 w-4" />{s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
          <div className="flex gap-1 overflow-x-auto pb-2 lg:hidden">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id ? "bg-brand-50 text-brand-700" : "text-surface-500 hover:bg-surface-50"
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
              <p className="mt-1 text-sm text-surface-500">Manage your account.</p>
            </div>
            <button onClick={saveAll} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-40">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Save"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {activeSection === "profile" && (
            <SettingsCard title="Profile" desc="Your name and learning preferences." icon={User}>
              <FieldInput label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
              <FieldInput label="Email" value={user?.email || ""} disabled />
              <SelectField label="Tutor Mode" value={preferredMode} onChange={setPreferredMode}
                options={[
                  { value: "beginner", label: "Beginner" },
                  { value: "exam", label: "Exam Prep" },
                  { value: "clinical", label: "Clinical Reasoning" },
                  { value: "rapid_review", label: "Rapid Review" },
                  { value: "socratic", label: "Socratic" },
                ]}
              />
            </SettingsCard>
          )}

          {activeSection === "appearance" && (
            <SettingsCard title="Appearance" desc="Theme preference." icon={Monitor}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-surface-400" />
                  <span className="text-sm text-surface-700">Dark Mode</span>
                </div>
                <div className="flex gap-1 rounded-lg bg-surface-100 p-0.5">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        theme === t ? "bg-white text-surface-800 shadow-sm" : "text-surface-500"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
            </SettingsCard>
          )}

          {activeSection === "account" && (
            <div className="space-y-6">
              <SettingsCard title="Account" desc="Manage your subscription." icon={Shield}>
                <Link href="/account/billing"
                  className="flex items-center justify-between py-3 hover:bg-surface-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-brand-500" />
                    <span className="text-sm text-surface-700">Manage Subscription</span>
                  </div>
                  <span className="text-xs text-brand-600">View →</span>
                </Link>
              </SettingsCard>

              <button onClick={handleSignOut} disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-6 py-4 text-left text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50">
                <LogOut className="h-5 w-5" />{loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
