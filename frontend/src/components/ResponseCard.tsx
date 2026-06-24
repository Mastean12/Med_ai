"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen, Star, Brain, HelpCircle, AlertTriangle,
  ChevronDown, ChevronRight, Heart, Sparkles, Stethoscope,
  Zap, ShieldCheck, Lightbulb, Check, X, Info,
} from "lucide-react";

type Section = { heading: string; level: number; body: string[] };

const STYLE: Record<string, { bg: string; border: string; icon: typeof BookOpen; iconColor: string; textClass?: string }> = {
  "simple explanation": { bg: "bg-white", border: "border-l-[3px] border-brand-500", icon: BookOpen, iconColor: "text-brand-500" },
  "key concepts": { bg: "bg-white", border: "border-l-[3px] border-blue-500", icon: Zap, iconColor: "text-blue-500" },
  "clinical relevance": { bg: "bg-white", border: "border-l-[3px] border-accent-500", icon: Heart, iconColor: "text-accent-500" },
  "high-yield facts": { bg: "bg-amber-50/70", border: "border-l-[3px] border-amber-500", icon: Star, iconColor: "text-amber-600" },
  "exam focus": { bg: "bg-amber-50/70", border: "border-l-[3px] border-amber-500", icon: Star, iconColor: "text-amber-600" },
  "memory aid": { bg: "bg-purple-50/70", border: "border-l-[3px] border-purple-500", icon: Brain, iconColor: "text-purple-600" },
  "quick check": { bg: "bg-brand-50/70", border: "border-l-[3px] border-brand-500", icon: HelpCircle, iconColor: "text-brand-600" },
  "quick summary": { bg: "bg-surface-800", border: "border border-surface-700", icon: Sparkles, iconColor: "text-brand-300", textClass: "text-surface-100" },
  "common mistake": { bg: "bg-red-50/70", border: "border-l-[3px] border-red-500", icon: AlertTriangle, iconColor: "text-red-600" },
  "clinical pearl": { bg: "bg-accent-50/70", border: "border-l-[3px] border-accent-500", icon: Stethoscope, iconColor: "text-accent-600" },
};

function matchStyle(heading: string) {
  const lower = heading.toLowerCase().replace(/s$/, "").replace(/\?$/, "").replace(/-/g, " ");
  for (const [key, style] of Object.entries(STYLE)) {
    if (lower.includes(key)) return style;
  }
  return { bg: "bg-white", border: "border-l-[3px] border-surface-200", icon: BookOpen, iconColor: "text-surface-400" };
}

function normalize(text: string): string {
  return text.replace(/([^\n])(#{1,3})\s/g, "$1\n\n$2 ");
}

function parseSections(text: string): { preamble: string | null; sections: Section[] } {
  const sections: Section[] = [];
  const blocks = normalize(text).split(/\n(?=#{1,3}\s)/);
  let preamble: string | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(#{1,3})\s+(.+)/m);
    if (m) {
      const level = m[1].length;
      const heading = m[2].trim();
      const body = trimmed.slice(m[0].length).trim();
      const lines = body.split("\n").filter((l) => l.trim().length > 0);
      sections.push({ heading, level, body: lines.length ? lines : [] });
    } else if (!preamble) {
      preamble = trimmed;
    }
  }
  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: "", level: 0, body: text.split("\n").filter((l) => l.trim()) });
  }
  return { preamble, sections };
}

function MarkdownContent({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:font-semibold prose-strong:text-surface-900 prose-code:bg-surface-100 prose-code:rounded prose-code:px-1 prose-code:text-brand-700 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function QuizBlock({ question, options, correct }: { question: string; options: string[]; correct?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-4 w-4 text-brand-600" />
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wide">Quick Quiz</span>
      </div>
      <p className="text-sm font-medium text-surface-800 mb-3">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSel = selected === letter;
          const isCorrect = correct && revealed && letter === correct;
          const isWrong = correct && revealed && isSel && letter !== correct;

          return (
            <button
              key={i}
              onClick={() => { if (!revealed) setSelected(letter); }}
              disabled={revealed}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${
                isCorrect ? "border-green-500 bg-green-50 text-green-800" :
                isWrong ? "border-red-500 bg-red-50 text-red-800" :
                isSel ? "border-brand-500 bg-brand-50 text-brand-800" :
                "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold shrink-0 ${
                isCorrect ? "border-green-500 bg-green-500 text-white" :
                isWrong ? "border-red-500 bg-red-500 text-white" :
                isSel ? "border-brand-500 bg-brand-500 text-white" : "border-surface-300 text-surface-400"
              }`}>{letter}</span>
              {opt}
              {isCorrect && <Check className="h-4 w-4 text-green-600 ml-auto" />}
              {isWrong && <X className="h-4 w-4 text-red-600 ml-auto" />}
            </button>
          );
        })}
      </div>
      {selected && !revealed && (
        <button onClick={() => setRevealed(true)} className="mt-3 w-full rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors">
          Check Answer
        </button>
      )}
      {revealed && (
        <div className="mt-3 rounded-lg bg-surface-100 px-3 py-2 text-xs text-surface-600">
          <strong className="text-surface-800">Answer: {correct}</strong> — {options[correct ? correct.charCodeAt(0) - 65 : 0]}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ heading, level, body }: Section) {
  const [open, setOpen] = useState(true);
  const style = matchStyle(heading);
  const Icon = style.icon;

  return (
    <div className={`rounded-xl ${style.bg} ${style.border} overflow-hidden`}>
      {heading && (
        <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:opacity-80 transition-opacity">
          <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
          <span className={`flex-1 font-semibold ${level === 1 ? "text-base" : "text-sm"} tracking-tight ${style.textClass || "text-surface-700"}`}>
            {heading}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-surface-400 shrink-0" />}
        </button>
      )}
      {open && (
        <div className={`px-4 pb-4 ${!heading ? "pt-4" : "pt-0"}`}>
          <div className="space-y-2">
            {body.map((line, j) => {
              // Auto-detect quiz blocks: lines starting with "Q: " followed by options
              const quizMatch = line.match(/^(?:Q:?\s+)(.+?)(?:\s*Options?:\s*)(.+)/i);
              if (quizMatch) {
                const question = quizMatch[1];
                const opts = quizMatch[2].split(/[,;]\s*/).filter(Boolean);
                return <QuizBlock key={j} question={question} options={opts} />;
              }
              return <MarkdownContent key={j} text={line} className={style.textClass || ""} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResponseCard({ content, className = "" }: { content?: string; className?: string }) {
  if (!content) return null;
  const { preamble, sections } = parseSections(content);

  if (!preamble && sections.length === 1 && !sections[0].heading) {
    return <MarkdownContent text={sections[0].body.join("\n")} className={className} />;
  }

  const quickSummary = sections.find((s) => s.heading.toLowerCase().includes("quick summary") || s.heading.toLowerCase().includes("quick-summary"));
  const other = sections.filter((s) => s !== quickSummary);

  return (
    <div className={`space-y-3 ${className}`}>
      {preamble && (
        <p className="text-sm text-surface-500 leading-relaxed italic pl-3 border-l-2 border-brand-300/50">
          {preamble}
        </p>
      )}
      {quickSummary && (
        <div className="rounded-xl bg-surface-800 border border-surface-700 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">Key Point</span>
          </div>
          <MarkdownContent text={quickSummary.body.join("\n")} className="text-surface-200 prose-headings:text-surface-100 prose-strong:text-surface-100" />
        </div>
      )}
      {other.map((s, i) => (
        <CollapsibleSection key={i} {...s} />
      ))}
    </div>
  );
}
