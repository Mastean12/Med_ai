"use client";

import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ${collapsed ? "lg:ml-[68px]" : "lg:ml-64"}`}>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-surface-200 bg-white">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Noctual AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
