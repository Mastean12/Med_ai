"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { getStudentDashboard, getStudyAnalytics } from "@/lib/api";
import {
  FileText, MessageSquare, StickyNote, Activity,
  Upload, Brain, PenTool, TrendingUp,
  Clock, BookOpen, ChevronRight,
  ArrowUp, ArrowDown,
} from "lucide-react";

type ActivityItem = { type: string; label: string; created_at?: string | null };
type DashboardData = { documents_uploaded: number; questions_asked: number; flashcards_created: number; recent_activity: ActivityItem[] };
type AnalyticsData = { streak?: { current_streak: number; longest_streak: number; is_active_today: boolean }; totals?: { total_study_minutes: number } };

function formatSince(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const activityConfig: Record<string, { icon: typeof FileText; color: string }> = {
  document: { icon: FileText, color: "text-blue-600 bg-blue-50" },
  question: { icon: MessageSquare, color: "text-brand-600 bg-brand-50" },
  flashcards: { icon: StickyNote, color: "text-purple-600 bg-purple-50" },
};

const quickActions = [
  { label: "Upload Notes", desc: "Add study materials", href: "/student/upload", icon: Upload, gradient: "from-blue-500 to-blue-600" },
  { label: "AI Tutor", desc: "Personalized learning", href: "/student/tutor", icon: Brain, gradient: "from-brand-500 to-brand-600" },
  { label: "Flashcards", desc: "Active recall practice", href: "/student/flashcards", icon: StickyNote, gradient: "from-purple-500 to-purple-600" },
  { label: "Exam Mode", desc: "Test your knowledge", href: "/student/exam", icon: PenTool, gradient: "from-accent-500 to-accent-600" },
];

const insights = [
  { text: "Review sessions within 24 hours of learning improve retention by up to 60%.", icon: Clock },
  { text: "Active recall through flashcards is 3x more effective than passive re-reading.", icon: Brain },
  { text: "Spaced repetition over 3-5 sessions leads to long-term memory formation.", icon: TrendingUp },
];

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { displayName } = useProfile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [dash, an] = await Promise.all([
          getStudentDashboard(),
          getStudyAnalytics().catch(() => null),
        ]);
        setData(dash);
        setAnalytics(an);
      } catch {} finally { setLoading(false); }
    })();
  }, [user]);

  if (authLoading) return <DashboardSkeleton />;

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
            <span className="text-2xl font-bold text-brand-600">N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Welcome to Medaitutor</h1>
          <p className="mt-2 text-surface-500">Sign in to access your learning dashboard.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const streak = analytics?.streak?.current_streak || 0;
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4 p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-surface-200 bg-white p-5 shadow-sm lg:p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brand-50/50 via-transparent to-accent-50/30" />
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-surface-500">{dateStr}</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-surface-900 lg:text-3xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-1 text-sm text-surface-500 max-w-lg">
                {streak > 0
                  ? `You've studied ${streak} day${streak > 1 ? "s" : ""} in a row.`
                  : "Upload your notes to begin."}
              </p>
            </div>
            {streak > 0 && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
              <span className="text-xl font-bold text-brand-700">{streak}</span>
              <div className="text-xs">
                <p className="font-medium text-brand-600">Day Streak</p>
              </div>
            </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => <div key={i} className="h-[104px] animate-shimmer rounded-2xl bg-surface-100" />)
          : ([
            { label: "Documents", value: data?.documents_uploaded ?? 0, icon: FileText, trend: null, color: "text-blue-600 bg-blue-50" },
            { label: "Questions", value: data?.questions_asked ?? 0, icon: MessageSquare, trend: null, color: "text-brand-600 bg-brand-50" },
            { label: "Flashcards", value: data?.flashcards_created ?? 0, icon: StickyNote, trend: null, color: "text-purple-600 bg-purple-50" },
            { label: "Study Minutes", value: analytics?.totals?.total_study_minutes ?? 0, icon: Clock, trend: null, color: "text-accent-600 bg-accent-50" },
          ] as const).map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-surface-200 bg-white p-3 sm:p-5 shadow-sm transition-shadow hover:shadow-md min-w-0">
              <div className={`inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${stat.color.split(" ")[1]}`}>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color.split(" ")[0]}`} />
              </div>
              <p className={`mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight ${stat.color.split(" ")[0]}`}>{stat.value}</p>
              <p className="mt-0.5 text-xs sm:text-sm text-surface-500">{stat.label}</p>
            </div>
          ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              <>
                <div className="h-[104px] animate-shimmer rounded-2xl bg-surface-100" />
                <div className="h-[104px] animate-shimmer rounded-2xl bg-surface-100" />
                <div className="h-[104px] animate-shimmer rounded-2xl bg-surface-100" />
                <div className="h-[104px] animate-shimmer rounded-2xl bg-surface-100" />
              </>
            ) : (
              quickActions.map((action, i) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <Link
                  href={action.href}
                  className="group block rounded-2xl border border-surface-200 bg-white p-3 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-surface-300"
                >
                  <div className={`inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-sm`}>
                    <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <p className="mt-2 sm:mt-3 text-sm font-semibold text-surface-800">{action.label}</p>
                  <p className="mt-0.5 text-xs text-surface-500">{action.desc}</p>
                </Link>
              </motion.div>
            ))
            )}
          </div>

          <div className="rounded-2xl border border-surface-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-700">Recent Activity</h2>
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-surface-100">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="h-10 w-10 animate-shimmer rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full max-w-[320px] animate-shimmer rounded" />
                      <div className="h-3 w-28 animate-shimmer rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recent_activity?.length ? (
              <div className="px-6 py-12 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-surface-300" />
                <p className="mt-3 text-sm font-medium text-surface-500">No activity yet</p>
                <p className="mt-1 text-xs text-surface-400">Upload notes or start a study session.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {data.recent_activity.slice(0, 6).map((item, i) => {
                  const cfg = activityConfig[item.type] || { icon: Activity, color: "text-surface-500 bg-surface-100" };
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-50">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color.split(" ")[1]}`}>
                        <cfg.icon className={`h-4 w-4 ${cfg.color.split(" ")[0]}`} />
                      </div>
                      <p className="flex-1 text-sm text-surface-700 leading-snug line-clamp-2">{item.label}</p>
                      <span className="shrink-0 text-xs text-surface-400">{formatSince(item.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-surface-700">Learning Insights</h3>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-surface-50 p-3">
                  <insight.icon className="h-4 w-4 shrink-0 text-brand-500 mt-0.5" />
                  <p className="text-xs leading-relaxed text-surface-600">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-700 mb-2">Quick Tips</h3>
            <div className="space-y-2 text-xs leading-relaxed text-surface-500">
              <p>• Upload PDFs to generate AI flashcards</p>
              <p>• Use <strong>Space</strong> to flip flashcards</p>
              <p>• Ask the AI tutor follow-up questions</p>
              <p>• Take timed exams to assess readiness</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="h-32 animate-shimmer rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-[104px] animate-shimmer rounded-2xl" />)}
      </div>
    </div>
  );
}
