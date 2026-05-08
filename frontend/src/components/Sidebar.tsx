"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Upload, MessageSquare, Brain,
  StickyNote, PenTool, BarChart3, CreditCard,
  Settings, LogOut, Menu, X, ChevronLeft,
  Sparkles, User,
} from "lucide-react";

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/upload", label: "Upload Notes", icon: Upload },
  { href: "/student/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/student/tutor", label: "AI Tutor", icon: Brain },
  { href: "/student/flashcards", label: "Flashcards", icon: StickyNote },
  { href: "/student/exam", label: "Exam Mode", icon: PenTool },
  { href: "/student/progress", label: "Progress", icon: BarChart3 },
];

const bottomItems = [
  { href: "/account/billing", label: "Billing", icon: CreditCard },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try { await signOut(); router.push("/"); router.refresh(); }
    finally { setLoggingOut(false); }
  };

  const isActive = (href: string) => {
    if (href === "/student") return pathname === "/student";
    return pathname.startsWith(href);
  };

  const displayName = user?.email?.split("@")[0] || "Student";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-200">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && <span className="text-base font-bold tracking-tight text-surface-900">Noctual</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 lg:flex"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
              isActive(item.href)
                ? "bg-brand-50 text-brand-700 shadow-sm"
                : "text-surface-500 hover:bg-surface-100 hover:text-surface-700"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={`h-5 w-5 shrink-0 ${isActive(item.href) ? "text-brand-600" : "text-surface-400 group-hover:text-surface-500"}`} />
            {!collapsed && <span>{item.label}</span>}
            {isActive(item.href) && !collapsed && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-surface-200 px-3 py-3 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
              pathname.startsWith(item.href)
                ? "bg-surface-100 text-surface-700"
                : "text-surface-500 hover:bg-surface-100 hover:text-surface-700"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0 text-surface-400 group-hover:text-surface-500" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {!collapsed && (
          <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-surface-700">{displayName}</p>
                <p className="truncate text-[10px] text-surface-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-red-500 disabled:opacity-50"
            >
              <LogOut className="h-3 w-3" />
              {loggingOut ? "..." : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-50 rounded-lg border border-surface-200 bg-white p-2 text-surface-500 shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-surface-900/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden"
            >
              <div className="absolute right-3 top-3">
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-white border-r border-surface-200 transition-all duration-200 lg:block ${collapsed ? "w-[68px]" : "w-64"}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
