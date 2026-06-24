"use client";

import { type LucideIcon } from "lucide-react";

export function SettingsCard({
  title, desc, icon: Icon, children,
}: {
  title: string; desc: string; icon: LucideIcon; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white shadow-sm">
      <div className="border-b border-surface-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-700">{title}</h2>
        </div>
        <p className="mt-0.5 text-xs text-surface-400">{desc}</p>
      </div>
      <div className="divide-y divide-surface-100 px-6">{children}</div>
    </div>
  );
}

export function FieldInput({
  label, value, onChange, placeholder, disabled, type = "text", error,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string; error?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="w-28 shrink-0 text-sm text-surface-500">{label}</span>
      <div className="flex-1">
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400/20"
              : "border-surface-200 bg-surface-50 focus:border-brand-400 focus:ring-brand-400/20"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

export function ToggleSwitch({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-surface-700">{label}</span>
      <button
        type="button"
        onClick={() => { if (!disabled) onChange(!checked); }}
        disabled={disabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-surface-200"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}

export function SelectField({
  label, value, onChange, options, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-surface-700">{label}</span>
      <div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`rounded-lg border px-3 py-1.5 text-sm text-surface-700 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 bg-red-50 focus:ring-red-400/20"
              : "border-surface-200 bg-surface-50 focus:border-brand-400 focus:ring-brand-400/20"
          }`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-shimmer rounded-lg bg-surface-200" />
          <div className="h-4 w-64 animate-shimmer rounded bg-surface-100" />
        </div>
        <div className="h-10 w-24 animate-shimmer rounded-xl bg-surface-200" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-surface-200 bg-white shadow-sm">
          <div className="border-b border-surface-100 px-6 py-4">
            <div className="h-4 w-28 animate-shimmer rounded bg-surface-200" />
            <div className="mt-1 h-3 w-48 animate-shimmer rounded bg-surface-100" />
          </div>
          <div className="space-y-4 px-6 py-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-10 animate-shimmer rounded-lg bg-surface-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
