"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 pl-14 lg:pl-0 ${collapsed ? "lg:ml-[68px]" : "lg:ml-64"}`}>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-surface-200 bg-white">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Medaitutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
