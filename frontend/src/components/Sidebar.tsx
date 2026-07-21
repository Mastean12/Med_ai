"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutDashboard, Upload, MessageSquare, Brain,
  StickyNote, PenTool, BarChart3, CreditCard,
  Settings, LogOut, Menu, X, ChevronLeft,
  User, GraduationCap, HelpCircle, MessageCircle,
} from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

const navGroups = [
  {
    label: "Learning",
    items: [
      { href: "/student", label: "Dashboard", icon: LayoutDashboard },
      { href: "/student/tutor", label: "AI Tutor", icon: Brain },
      { href: "/student/chat", label: "AI Chat", icon: MessageSquare },
      { href: "/student/upload", label: "Upload Notes", icon: Upload },
      { href: "/student/flashcards", label: "Flashcards", icon: StickyNote },
      { href: "/student/exam", label: "Exam Mode", icon: PenTool },
      { href: "/student/progress", label: "Progress", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/account/billing", label: "Billing", icon: CreditCard },
      { href: "/account/settings", label: "Settings", icon: Settings },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/student": "Dashboard",
  "/student/tutor": "AI Tutor",
  "/student/chat": "AI Chat",
  "/student/upload": "Upload Notes",
  "/student/flashcards": "Flashcards",
  "/student/exam": "Exam Mode",
  "/student/progress": "Progress",
  "/account/billing": "Billing",
  "/account/settings": "Settings",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { displayName } = useProfile();
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = useMemo(() => {
    const match = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path));
    return match?.[1] || "Medaitutor";
  }, [pathname]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try { await signOut(); router.push("/"); router.refresh(); }
    finally { setLoggingOut(false); }
  };

  const isActive = (href: string) => {
    if (href === "/student") return pathname === "/student";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-200">
        <Link href="/" className="flex shrink-0 items-center">
          <BrandLogo size="md" showImage />
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 lg:flex"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-surface-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
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
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-surface-200 px-3 py-3 space-y-1">
        {!collapsed && (
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
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
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-surface-200 bg-white/95 backdrop-blur px-4 py-3 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 transition-colors -ml-1.5">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 text-base font-semibold text-surface-800 truncate">{pageTitle}</div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-surface-900/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden"
            >
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
