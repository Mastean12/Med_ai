"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();

  // Student and account pages use sidebar layout with their own footer wrapper
  const isDashboardRoute = pathname.startsWith("/student") || pathname.startsWith("/account");
  if (isDashboardRoute) return null;
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight text-surface-900">Medaitutor</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-surface-500">
              Shaping tomorrow's healthcare professionals.
            </p>
            <p className="mt-2 text-xs text-surface-400">
              Not a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>

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

        <div className="mt-10 border-t border-surface-100 pt-6 text-center">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Medaitutor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
