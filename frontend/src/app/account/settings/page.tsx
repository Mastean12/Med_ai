"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User, Mail, Shield, Bell, Moon, Sun, LogOut, BookOpen,
  PenTool, Zap, Brain, HelpCircle, Monitor, Save, Check, ChevronRight,
  Trash2, Download, AlertTriangle, Globe, School, GraduationCap,
  ArrowLeft, XCircle, CreditCard,
} from "lucide-react";
import { SettingsCard, FieldInput, ToggleSwitch, SelectField, LoadingSkeleton } from "@/components/SettingsCard";

import { API_BASE_URL } from "@/lib/apiClient";

const TUTOR_MODES = [
  { id: "beginner", label: "Beginner", icon: BookOpen },
  { id: "exam", label: "Exam Prep", icon: PenTool },
  { id: "clinical", label: "Clinical", icon: Shield },
  { id: "rapid_review", label: "Rapid Review", icon: Zap },
  { id: "socratic", label: "Socratic", icon: HelpCircle },
];

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "learning", label: "Learning", icon: Brain },
  { id: "account", label: "Account", icon: Shield },
  { id: "privacy", label: "Privacy", icon: AlertTriangle },
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
  const { theme, setTheme, resolved } = useTheme();

  const activeSection = searchParams.get("tab") || "profile";
  const setActiveSection = (id: string) => router.replace(`/account/settings?tab=${id}`);

  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pageLoaded, setPageLoaded] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [country, setCountry] = useState("");
  const [learningLevel, setLearningLevel] = useState("beginner");

  // Preferences state
  const [preferredMode, setPreferredMode] = useState("beginner");
  const [responseLength, setResponseLength] = useState("normal");
  const [aiTone, setAiTone] = useState("balanced");

  // Notification toggles
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifStreaks, setNotifStreaks] = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [notifBilling, setNotifBilling] = useState(true);

  // Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // Unsaved changes tracking
  const initialRef = useRef<string>("");
  const [dirty, setDirty] = useState(false);

  const serializeState = useCallback(() => {
    return JSON.stringify({
      displayName, bio, institution, country, learningLevel,
      preferredMode, responseLength, aiTone,
      notifReminders, notifStreaks, notifReports, notifBilling,
    });
  }, [displayName, bio, institution, country, learningLevel,
      preferredMode, responseLength, aiTone,
      notifReminders, notifStreaks, notifReports, notifBilling]);

  useEffect(() => {
    if (pageLoaded && initialRef.current) {
      setDirty(serializeState() !== initialRef.current);
    }
  }, [serializeState, pageLoaded]);

  useEffect(() => {
    if (!profile || profileLoading) return;
    setDisplayName(profile.display_name || user?.email?.split("@")[0] || "");
    setBio(profile.bio || "");
    setInstitution(profile.institution || "");
    setCountry(profile.country || "");
    setLearningLevel(profile.learning_level || "beginner");
    const prefs = profile.preferences || {};
    setPreferredMode((prefs.preferred_mode as string) || "beginner");
    setResponseLength((prefs.response_length as string) || "normal");
    setAiTone((prefs.ai_tone as string) || "balanced");
    setNotifReminders(prefs.notif_reminders !== false);
    setNotifStreaks(prefs.notif_streaks !== false);
    setNotifReports(prefs.notif_reports === true);
    setNotifBilling(prefs.notif_billing !== false);
    setPageLoaded(true);
  }, [profile, profileLoading, user]);

  useEffect(() => {
    if (pageLoaded) {
      initialRef.current = serializeState();
      setDirty(false);
    }
  }, [pageLoaded]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const saveAll = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      const token = await getToken();
      const prefsPayload = {
        preferred_mode: preferredMode,
        response_length: responseLength,
        ai_tone: aiTone,
        notif_reminders: notifReminders,
        notif_streaks: notifStreaks,
        notif_reports: notifReports,
        notif_billing: notifBilling,
      };
      const results = await Promise.allSettled([
        fetch(`${API_BASE_URL}/settings/profile`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: displayName, bio, institution,
            country: country, learning_level: learningLevel,
          }),
        }),
        fetch(`${API_BASE_URL}/settings/preferences`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(prefsPayload),
        }),
      ]);
      const failures = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failures.length > 0) {
        setError(`Failed to save ${failures.length} section(s). Check your inputs and try again.`);
      } else {
        setSaved(true);
        await refreshProfile();
        initialRef.current = serializeState();
        setDirty(false);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally { setSaving(false); }
  };

  const handlePasswordReset = async () => {
    setSendingReset(true); setResetSent(false); setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/settings/reset-password`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResetSent(true);
      else { const d = await res.json(); setError(d.detail || "Failed to send reset email"); }
    } catch { setError("Network error"); }
    finally { setSendingReset(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true); setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/settings/account`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { await signOut(); }
      else { const d = await res.json(); setError(d.detail || "Failed to delete account"); }
    } catch { setError("Network error"); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const handleExportData = async () => {
    setExporting(true); setError(""); setExportUrl(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/settings/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        setExportUrl(URL.createObjectURL(blob));
      } else { const d = await res.json(); setError(d.detail || "Failed to export data"); }
    } catch { setError("Network error"); }
    finally { setExporting(false); }
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

  if (profileLoading && !pageLoaded) return <LoadingSkeleton />;

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-surface-200 bg-white p-4 hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Settings</h2>
        </div>
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
        <div className="mt-6 px-2">
          <Link href="/student"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-surface-400 hover:text-surface-600 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
          {/* Mobile section tabs */}
          <div className="flex gap-1 overflow-x-auto -mx-6 px-6 pb-2 lg:hidden scrollbar-none">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id ? "bg-brand-50 text-brand-700" : "text-surface-500 hover:bg-surface-50"
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/student" className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors lg:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
                <p className="mt-1 text-sm text-surface-500">Manage your account and learning preferences.</p>
              </div>
            </div>
            <button onClick={saveAll} disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Save All"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="mt-0.5 text-xs text-red-600">{error}</p>
              </div>
              <button onClick={() => setError("")} className="shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-100">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {resetSent && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Password reset email sent. Check your inbox.
            </div>
          )}

          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-800">Delete your account?</h3>
                  <p className="mt-1 text-sm text-red-600">
                    This will permanently delete your profile, preferences, chat history, and all associated data. This action cannot be undone.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button onClick={handleDeleteAccount} disabled={deleting}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      {deleting ? "Deleting..." : "Yes, delete my account"}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                      className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {exportUrl && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
              <span>Your data is ready for download.</span>
              <a href={exportUrl} download="medaitutor-export.json"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                Download
              </a>
            </div>
          )}

          {activeSection === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SettingsCard title="Profile" desc="Your public information and learning identity." icon={User}>
                <FieldInput label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
                <FieldInput label="Email" value={user?.email || ""} disabled />
                <FieldInput label="Bio" value={bio} onChange={setBio} placeholder="Tell us about yourself (max 500 chars)" />
                <FieldInput label="Institution" value={institution} onChange={setInstitution} placeholder="Your university or school" />
                <FieldInput label="Country" value={country} onChange={setCountry} placeholder="Your country" />
                <SelectField label="Learning Level" value={learningLevel} onChange={setLearningLevel}
                  options={[
                    { value: "beginner", label: "Beginner" },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />
              </SettingsCard>
            </motion.div>
          )}

          {activeSection === "appearance" && (
            <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SettingsCard title="Appearance" desc="Customize how Medaitutor looks to you." icon={Monitor}>
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
            </motion.div>
          )}

          {activeSection === "learning" && (
            <motion.div key="learning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <SettingsCard title="Tutor Preferences" desc="Customize how the AI tutor teaches you." icon={Brain}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-700">Preferred Mode</span>
                  <div className="flex gap-1">
                    {TUTOR_MODES.map((m) => (
                      <button key={m.id} onClick={() => setPreferredMode(m.id)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          preferredMode === m.id ? "bg-brand-100 text-brand-700" : "text-surface-500 hover:bg-surface-100"
                        }`} title={m.label}><m.icon className="h-3.5 w-3.5" /></button>
                    ))}
                  </div>
                </div>
                <SelectField label="Response Length" value={responseLength} onChange={setResponseLength}
                  options={[
                    { value: "concise", label: "Concise" },
                    { value: "normal", label: "Normal" },
                    { value: "detailed", label: "Detailed" },
                  ]}
                />
                <SelectField label="AI Tone" value={aiTone} onChange={setAiTone}
                  options={[
                    { value: "balanced", label: "Balanced" },
                    { value: "motivating", label: "Motivating Coach" },
                    { value: "concise", label: "Concise Teacher" },
                    { value: "exam", label: "Exam-Focused" },
                    { value: "socratic", label: "Socratic" },
                  ]}
                />
              </SettingsCard>

              <SettingsCard title="Notifications" desc="Control what we notify you about." icon={Bell}>
                <ToggleSwitch label="Study reminders" checked={notifReminders} onChange={setNotifReminders} />
                <ToggleSwitch label="Streak alerts" checked={notifStreaks} onChange={setNotifStreaks} />
                <ToggleSwitch label="Weekly reports" checked={notifReports} onChange={setNotifReports} />
                <ToggleSwitch label="Billing alerts" checked={notifBilling} onChange={setNotifBilling} />
              </SettingsCard>
            </motion.div>
          )}

          {activeSection === "account" && (
            <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <SettingsCard title="Account" desc="Manage your subscription and security." icon={Shield}>
                <Link href="/account/billing"
                  className="flex items-center justify-between py-3 hover:bg-surface-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-brand-500" />
                    <span className="text-sm text-surface-700">Manage Subscription</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-300" />
                </Link>
              </SettingsCard>

              <SettingsCard title="Security" desc="Password and session management." icon={Shield}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-700">Change Password</span>
                  <button onClick={handlePasswordReset} disabled={sendingReset}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50">
                    {sendingReset ? "Sending..." : resetSent ? "Email sent ✓" : "Reset via email →"}
                  </button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-surface-400" />
                    <span className="text-sm text-surface-700">Active Sessions</span>
                  </div>
                  <span className="text-xs text-surface-400">Current device</span>
                </div>
              </SettingsCard>

              <button onClick={handleSignOut} disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-6 py-4 text-left text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50">
                <LogOut className="h-5 w-5" />{loggingOut ? "Signing out..." : "Sign out of Medaitutor"}
              </button>
            </motion.div>
          )}

          {activeSection === "privacy" && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <SettingsCard title="Privacy & Data" desc="Control your data and account." icon={AlertTriangle}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-surface-400" />
                    <span className="text-sm text-surface-700">Export My Data</span>
                  </div>
                  <button onClick={handleExportData} disabled={exporting}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50">
                    {exporting ? "Exporting..." : "Export →"}
                  </button>
                </div>
              </SettingsCard>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Delete Account</h3>
                    <p className="mt-1 text-xs text-red-600">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
