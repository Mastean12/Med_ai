"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

export default function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#eef2ff,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#f5f3ff,transparent_50%)]" />

      {/* Neural particle grid */}
      {!reduced && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-purple-400/10 blur-3xl animate-pulse-soft" style={{ animationDelay: "2s" }} />

          {/* Animated grid dots */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.03]" aria-hidden="true">
            <defs>
              <pattern id="hero-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#5B5CEB" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>

          {/* Floating medical icons */}
          <div className="absolute inset-0">
            <FloatingIcon
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="#5B5CEB" strokeWidth={1.5} className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              }
              className="top-[15%] left-[8%] animate-float-slow"
              reduced={reduced}
            />
            <FloatingIcon
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              }
              className="top-[60%] right-[12%] animate-float-slower"
              reduced={reduced}
            />
            <FloatingIcon
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                </svg>
              }
              className="top-[30%] right-[18%] animate-float-medium"
              reduced={reduced}
            />
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <BrandLogo size="xl" showImage />
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-surface-900 md:text-5xl lg:text-6xl">
              Smarter study.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
                Better patient outcomes.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-500 lg:mx-0">
              Medaitutor transforms your medical notes into interactive flashcards and AI-powered Q&A sessions.
              Built for students, designed for everyone.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 sm:w-auto"
              >
                Start Learning Free
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/public"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-8 py-4 text-base font-semibold text-surface-700 transition-all hover:border-surface-300 hover:bg-surface-50 sm:w-auto"
              >
                Explore Public Portal
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </Link>
            </div>
            <p className="mt-6 text-sm text-surface-400">No credit card required. 10 free AI interactions daily.</p>
          </div>

          {/* Right: Premium Animation Card */}
          <div className="relative" aria-hidden="true">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-lg lg:mx-0 lg:max-w-none">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-500/5 via-purple-500/5 to-brand-600/5 backdrop-blur-xl border border-brand-200/50 shadow-2xl shadow-brand-500/10" />

              {/* Neural network visualization */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <NeuralNetwork reduced={reduced} />
              </div>

              {/* Glassmorphism stats card */}
              <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                <div className="rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl px-5 py-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-xs font-medium text-surface-500">Active Learners</p>
                      <p className="text-2xl font-bold text-surface-900">
                        <CountingNumber target={12483} reduced={reduced} />
                      </p>
                    </div>
                    <div className="h-10 w-px bg-surface-200" />
                    <div className="text-left">
                      <p className="text-xs font-medium text-surface-500">Flashcards Created</p>
                      <p className="text-2xl font-bold text-surface-900">
                        <CountingNumber target={847291} reduced={reduced} />
                      </p>
                    </div>
                    <div className="h-10 w-px bg-surface-200" />
                    <div className="text-left">
                      <p className="text-xs font-medium text-surface-500">Study Minutes</p>
                      <p className="text-2xl font-bold text-surface-900">
                        <CountingNumber target={2458901} reduced={reduced} />+
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingIcon({
  icon,
  className,
  reduced,
}: {
  icon: React.ReactNode;
  className: string;
  reduced: boolean;
}) {
  return (
    <div
      className={`absolute flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/10 backdrop-blur ${
        reduced ? "" : className
      }`}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

function NeuralNetwork({ reduced }: { reduced: boolean }) {
  const nodes = [
    { x: "50%", y: "20%", size: "h-3 w-3", delay: "0s" },
    { x: "25%", y: "45%", size: "h-4 w-4", delay: "0.5s" },
    { x: "75%", y: "50%", size: "h-3.5 w-3.5", delay: "1s" },
    { x: "40%", y: "70%", size: "h-3 w-3", delay: "1.5s" },
    { x: "60%", y: "30%", size: "h-2.5 w-2.5", delay: "0.3s" },
    { x: "80%", y: "70%", size: "h-3 w-3", delay: "0.8s" },
    { x: "20%", y: "75%", size: "h-2.5 w-2.5", delay: "1.2s" },
  ];

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Connecting lines */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="neural-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5B5CEB" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#5B5CEB" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <line x1="50%" y1="20%" x2="25%" y2="45%" stroke="url(#neural-line)" strokeWidth="1.5" />
        <line x1="50%" y1="20%" x2="75%" y2="50%" stroke="url(#neural-line)" strokeWidth="1.5" />
        <line x1="50%" y1="20%" x2="40%" y2="70%" stroke="url(#neural-line)" strokeWidth="1.5" />
        <line x1="50%" y1="20%" x2="60%" y2="30%" stroke="url(#neural-line)" strokeWidth="1.5" />
        <line x1="25%" y1="45%" x2="40%" y2="70%" stroke="url(#neural-line)" strokeWidth="1" />
        <line x1="75%" y1="50%" x2="60%" y2="30%" stroke="url(#neural-line)" strokeWidth="1" />
        <line x1="75%" y1="50%" x2="80%" y2="70%" stroke="url(#neural-line)" strokeWidth="1" />
        <line x1="40%" y1="70%" x2="80%" y2="70%" stroke="url(#neural-line)" strokeWidth="1" />
        <line x1="60%" y1="30%" x2="20%" y2="75%" stroke="url(#neural-line)" strokeWidth="1" />
        <line x1="20%" y1="75%" x2="80%" y2="70%" stroke="url(#neural-line)" strokeWidth="1" />
      </svg>

      {/* Glowing center brain icon */}
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 backdrop-blur-sm ring-1 ring-brand-500/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="#5B5CEB" strokeWidth={1.2} className="h-10 w-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      </div>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br from-brand-400 to-purple-500 shadow-lg shadow-brand-500/30 ${
            reduced ? "" : "animate-pulse-soft"
          } ${node.size}`}
          style={{
            left: node.x,
            top: node.y,
            transform: "translate(-50%, -50%)",
            animationDelay: reduced ? "0s" : node.delay,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function CountingNumber({ target, reduced }: { target: number; reduced: boolean }) {
  const [count, setCount] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setCount(target);
      return;
    }
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, reduced]);

  return <>{count.toLocaleString()}</>;
}
