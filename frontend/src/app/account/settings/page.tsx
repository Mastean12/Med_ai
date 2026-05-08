"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { User, Mail, Shield, Bell, Moon, Sun, Sparkles, ChevronRight, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try { await signOut(); } finally { setLoggingOut(false); }
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-surface-500">Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link> to access settings.</p>
      </div>
    );
  }

  const sections = [
    { icon: User, label: "Username", value: user.email?.split("@")[0] || "Student", action: "Edit" },
    { icon: Mail, label: "Email", value: user.email || "", action: null },
    { icon: Shield, label: "Plan", value: "Free", action: "Upgrade" },
    { icon: Bell, label: "Notifications", value: "Enabled", action: "Configure" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Settings</h1>
        <p className="mt-1 text-sm text-surface-500">Manage your account and preferences.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl border border-surface-200 bg-white shadow-sm"
      >
        <div className="border-b border-surface-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-surface-700">Profile</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {sections.map((section) => (
            <div key={section.label} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-50">
              <section.icon className="h-5 w-5 shrink-0 text-surface-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800">{section.value}</p>
                <p className="text-xs text-surface-400">{section.label}</p>
              </div>
              {section.action && (
                <span className="text-xs font-medium text-brand-600 cursor-pointer hover:text-brand-700">{section.action}</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-surface-200 bg-white shadow-sm"
      >
        <div className="border-b border-surface-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-surface-700">Preferences</h2>
        </div>
        <div className="divide-y divide-surface-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-5 w-5 text-surface-400" /> : <Sun className="h-5 w-5 text-surface-400" />}
              <span className="text-sm text-surface-700">Dark Mode</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? "bg-brand-600" : "bg-surface-200"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl border border-surface-200 bg-white shadow-sm"
      >
        <div className="border-b border-surface-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-surface-700">Account</h2>
        </div>
        <div className="divide-y divide-surface-100">
          <Link href="/account/billing" className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-50">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <span className="text-sm text-surface-700">Manage Subscription</span>
            </div>
            <ChevronRight className="h-4 w-4 text-surface-300" />
          </Link>
          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-6 py-4 text-left text-sm text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
