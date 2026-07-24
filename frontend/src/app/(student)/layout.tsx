"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={`min-h-screen transition-all duration-200 ${collapsed ? "lg:ml-[68px]" : "lg:ml-64"}`}>
      <main>{children}</main>
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
      <Sidebar />
      <MainContent>{children}</MainContent>
    </SidebarProvider>
  );
}
