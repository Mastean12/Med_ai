"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

export default function Footer() {
  const pathname = usePathname();

  const isDashboardRoute = pathname.startsWith("/student") || pathname.startsWith("/account");
  if (isDashboardRoute) return null;
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <Link href="/" className="flex items-center">
              <BrandLogo size="lg" showImage />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-surface-500">
              Shaping tomorrow's healthcare professionals.
            </p>
            <p className="mt-2 text-xs text-surface-400">
              Not a substitute for professional medical advice.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">For Students</p>
              <nav className="mt-4 flex flex-col gap-2.5">
                <Link href="/student/upload" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Upload Notes</Link>
                <Link href="/student/chat" className="text-sm text-surface-500 transition-colors hover:text-brand-600">AI Chat</Link>
                <Link href="/student/tutor" className="text-sm text-surface-500 transition-colors hover:text-brand-600">AI Tutor</Link>
                <Link href="/student/flashcards" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Flashcards</Link>
                <Link href="/student/exam" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Exam Mode</Link>
              </nav>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Public Health</p>
              <nav className="mt-4 flex flex-col gap-2.5">
                <Link href="/public/symptom-checker" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Symptom Checker</Link>
                <Link href="/public/tips" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Health Tips</Link>
                <Link href="/public/safety" className="text-sm text-surface-500 transition-colors hover:text-brand-600">Safety Notices</Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-surface-100 pt-6 text-center">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Medaitutor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
