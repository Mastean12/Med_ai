"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getStudentDashboard, getStudyAnalytics } from "@/lib/api";
import {
  TrendingUp, Clock, Target, BookOpen, Award,
  BarChart3, RefreshCw, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

type AnalyticsData = {
  streak?: { current_streak: number; longest_streak: number; is_active_today: boolean };
  weekly_activity?: { activity_date: string; questions_count: number; flashcards_count: number }[];
  totals?: { questions_asked: number; flashcards_saved: number; reviews_completed: number; total_study_minutes: number };
  performance?: { average_quality: number | null; mastery_rate: number | null; total_reviews: number };
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const chartColors = { brand: "#5b5bd6", accent: "#14b8a6", purple: "#a855f7", blue: "#3b82f6", gray: "#e2e8f0" };

export default function StudentProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dashboard, setDashboard] = useState<{ documents_uploaded: number; questions_asked: number; flashcards_created: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [an, dash] = await Promise.all([
          getStudyAnalytics().catch(() => null),
          getStudentDashboard().catch(() => null),
        ]);
        setAnalytics(an);
        setDashboard(dash);
      } finally { setLoading(false); }
    })();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <div className="h-8 w-48 animate-shimmer rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-shimmer rounded-2xl" />)}
        </div>
        <div className="h-64 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-10 text-center shadow-sm">
          <BarChart3 className="mx-auto h-10 w-10 text-surface-300" />
          <h1 className="mt-4 text-xl font-bold text-surface-900">Your Progress</h1>
          <p className="mt-2 text-surface-500">Sign in to view learning analytics.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </div>
    );
  }

  const weeklyData = (analytics?.weekly_activity?.slice(-7) || []).map((d) => ({
    name: dayNames[new Date(d.activity_date).getDay()],
    Questions: d.questions_count,
    Flashcards: d.flashcards_count,
  }));

  const pieData = [
    { name: "Questions", value: dashboard?.questions_asked || 0, color: chartColors.brand },
    { name: "Flashcards", value: dashboard?.flashcards_created || 0, color: chartColors.accent },
    { name: "Documents", value: dashboard?.documents_uploaded || 0, color: chartColors.blue },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Your Progress</h1>
          <p className="mt-1 text-sm text-surface-500">Learning analytics and study insights.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { label: "Current Streak", value: `${analytics?.streak?.current_streak || 0} days`, sub: `Best: ${analytics?.streak?.longest_streak || 0}`, icon: TrendingUp, color: "text-orange-600 bg-orange-50" },
          { label: "Study Minutes", value: String(analytics?.totals?.total_study_minutes || 0), sub: "Total time invested", icon: Clock, color: "text-accent-600 bg-accent-50" },
          { label: "Questions", value: String(dashboard?.questions_asked || 0), sub: "AI chat queries", icon: Target, color: "text-brand-600 bg-brand-50" },
          { label: "Flashcards", value: String(dashboard?.flashcards_created || 0), sub: "Cards generated", icon: BookOpen, color: "text-purple-600 bg-purple-50" },
        ] as const).map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${stat.color.split(" ")[1]}`}>
              <stat.icon className={`h-4 w-4 ${stat.color.split(" ")[0]}`} />
            </div>
            <p className={`mt-3 text-2xl font-bold tracking-tight ${stat.color.split(" ")[0]}`}>{stat.value}</p>
            <p className="text-sm font-medium text-surface-700">{stat.label}</p>
            <p className="text-xs text-surface-400">{stat.sub}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-surface-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-500" /> Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }} />
              <Bar dataKey="Questions" fill={chartColors.brand} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Flashcards" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-surface-700 flex items-center gap-2">
            <Award className="h-4 w-4 text-brand-500" /> Performance
          </h3>
          {analytics?.performance?.total_reviews ? (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Mastery Rate</span>
                  <span className="font-semibold text-surface-800">{analytics.performance.mastery_rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all" style={{ width: `${analytics.performance.mastery_rate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Avg. Review Quality</span>
                  <span className="font-semibold text-surface-800">{analytics.performance.average_quality}/5</span>
                </div>
                <div className="h-2 rounded-full bg-surface-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-500 transition-all" style={{ width: `${((analytics.performance.average_quality || 0) / 5) * 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-surface-300" />
              <p className="mt-3 text-sm text-surface-500">Review flashcards to see performance metrics.</p>
            </div>
          )}
        </motion.div>
      </div>

      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-surface-700">Activity Distribution</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded" style={{ background: entry.color }} />
                  <span className="text-surface-600">{entry.name}</span>
                  <span className="font-medium text-surface-800">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
