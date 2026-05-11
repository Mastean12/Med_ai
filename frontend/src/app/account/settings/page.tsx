"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User, Mail, Shield, Bell, Moon, Sun, Sparkles, LogOut, BookOpen,
  PenTool, Zap, Brain, HelpCircle, Monitor, Save, Check, ChevronRight,
  Trash2, Download, AlertTriangle, Globe, School, GraduationCap,
} from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const TUTOR_MODES = [
  { id: "beginner", label: "Beginner", icon: BookOpen },
  { id: "exam_prep", label: "Exam Prep", icon: PenTool },
  { id: "clinical", label: "Clinical", icon: Shield },
  { id: "rapid_review", label: "Rapid Review", icon: Zap },
  { id: "socratic", label: "Socratic", icon: HelpCircle },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { refreshProfile } = useProfile();
  const { theme, setTheme, resolved } = useTheme();
  const [activeSection, setActiveSection] = useState("profile");
  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/settings/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile || {};
        setDisplayName(p.display_name || user?.email?.split("@")[0] || "");
        setBio(p.bio || "");
        setInstitution(p.institution || "");
        setCountry(p.country || "");
        setLearningLevel(p.learning_level || "beginner");
        const prefs = p.preferences || {};
        setPreferredMode(prefs.preferred_mode || "beginner");
        setResponseLength(prefs.response_length || "normal");
        setAiTone(prefs.ai_tone || "balanced");
        setNotifReminders(prefs.notif_reminders !== false);
        setNotifStreaks(prefs.notif_streaks !== false);
        setNotifReports(prefs.notif_reports === true);
        setNotifBilling(prefs.notif_billing !== false);
      }
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveAll = async () => {
    setSaving(true); setSaved(false);
    try {
      const token = await getToken();
      const prefs = {
        preferred_mode: preferredMode,
        response_length: responseLength,
        ai_tone: aiTone,
        notif_reminders: notifReminders,
        notif_streaks: notifStreaks,
        notif_reports: notifReports,
        notif_billing: notifBilling,
      };
      await Promise.all([
        fetch(`${BACKEND}/settings/profile`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: displayName, bio, institution, country, learning_level: learningLevel }),
        }),
        fetch(`${BACKEND}/settings/preferences`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        }),
      ]);
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setSaving(false); }
  };

  const handleSignOut = async () => { setLoggingOut(true); try { await signOut(); } finally { setLoggingOut(false); } };

  if (!user) return <div className="p-8 text-center"><p className="text-surface-500">Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link>.</p></div>;

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "learning", label: "Learning", icon: Brain },
    { id: "account", label: "Account", icon: Shield },
    { id: "privacy", label: "Privacy", icon: AlertTriangle },
  ] as const;

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-surface-200 bg-white p-4 hidden lg:block">
        <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Settings</h2>
        <nav className="space-y-1">
          {sections.map((s) => (
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
              <p className="mt-1 text-sm text-surface-500">Manage your account and learning preferences.</p>
            </div>
            <button onClick={saveAll} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Save All"}
            </button>
          </div>

          {activeSection === "profile" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card title="Profile" desc="Your public information and learning identity." icon={User}>
                <Field label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
                <Field label="Email" value={user.email || ""} disabled />
                <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell us about yourself" />
                <Field label="Institution" value={institution} onChange={setInstitution} placeholder="Your university or school" icon={School} />
                <Field label="Country" value={country} onChange={setCountry} placeholder="Your country" icon={Globe} />
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-surface-400" /><span className="text-sm text-surface-700">Learning Level</span></div>
                  <select value={learningLevel} onChange={(e) => setLearningLevel(e.target.value)}
                    className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-700">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === "appearance" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card title="Appearance" desc="Customize how Noctual looks to you." icon={Monitor}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3"><Moon className="h-5 w-5 text-surface-400" /><span className="text-sm text-surface-700">Dark Mode</span></div>
                  <div className="flex gap-1 rounded-lg bg-surface-100 p-0.5">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button key={t} onClick={() => setTheme(t)}
                        className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          theme === t ? "bg-white text-surface-800 shadow-sm" : "text-surface-500"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === "learning" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card title="Tutor Preferences" desc="Customize how the AI tutor teaches you." icon={Brain}>
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
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-700">Response Length</span>
                  <div className="flex gap-1 rounded-lg bg-surface-100 p-0.5">
                    {(["concise", "normal", "detailed"] as const).map((l) => (
                      <button key={l} onClick={() => setResponseLength(l)}
                        className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          responseLength === l ? "bg-white text-surface-800 shadow-sm" : "text-surface-500"
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-700">AI Tone</span>
                  <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                    className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-700">
                    <option value="balanced">Balanced</option>
                    <option value="motivating">Motivating Coach</option>
                    <option value="concise">Concise Teacher</option>
                    <option value="exam">Exam-Focused</option>
                    <option value="socratic">Socratic</option>
                  </select>
                </div>
              </Card>

              <Card title="Notifications" desc="Control what we notify you about." icon={Bell}>
                <ToggleRow label="Study reminders" checked={notifReminders} onChange={setNotifReminders} />
                <ToggleRow label="Streak alerts" checked={notifStreaks} onChange={setNotifStreaks} />
                <ToggleRow label="Weekly reports" checked={notifReports} onChange={setNotifReports} />
                <ToggleRow label="Billing alerts" checked={notifBilling} onChange={setNotifBilling} />
              </Card>
            </motion.div>
          )}

          {activeSection === "account" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card title="Account" desc="Manage your subscription and security." icon={Shield}>
                <Link href="/account/billing" className="flex items-center justify-between py-3 hover:bg-surface-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-brand-500" /><span className="text-sm text-surface-700">Manage Subscription</span></div>
                  <ChevronRight className="h-4 w-4 text-surface-300" />
                </Link>
              </Card>

              <Card title="Security" desc="Password and session management." icon={Shield}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-700">Change Password</span>
                  <span className="text-xs text-brand-600 cursor-pointer hover:text-brand-700">Reset via email →</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3"><Monitor className="h-5 w-5 text-surface-400" /><span className="text-sm text-surface-700">Active Sessions</span></div>
                  <span className="text-xs text-surface-400">Current device</span>
                </div>
              </Card>

              <button onClick={handleSignOut} disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-6 py-4 text-left text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50">
                <LogOut className="h-5 w-5" />{loggingOut ? "Signing out..." : "Sign out of Noctual"}
              </button>
            </motion.div>
          )}

          {activeSection === "privacy" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card title="Privacy & Data" desc="Control your data and account." icon={AlertTriangle}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3"><Download className="h-5 w-5 text-surface-400" /><span className="text-sm text-surface-700">Export My Data</span></div>
                  <span className="text-xs text-brand-600 cursor-pointer hover:text-brand-700">Request →</span>
                </div>
              </Card>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Delete Account</h3>
                    <p className="mt-1 text-xs text-red-600">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
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

function Card({ title, desc, icon: Icon, children }: { title: string; desc: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white shadow-sm">
      <div className="border-b border-surface-100 px-6 py-4">
        <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-surface-400" /><h2 className="text-sm font-semibold text-surface-700">{title}</h2></div>
        <p className="mt-0.5 text-xs text-surface-400">{desc}</p>
      </div>
      <div className="divide-y divide-surface-100 px-6">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; icon?: typeof User }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="w-28 shrink-0 text-sm text-surface-500">{label}</span>
      <input value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} placeholder={placeholder} disabled={disabled}
        className={`flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-800 placeholder-surface-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 ${disabled ? "opacity-60 cursor-not-allowed" : ""}`} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-surface-700">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand-600" : "bg-surface-200"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
