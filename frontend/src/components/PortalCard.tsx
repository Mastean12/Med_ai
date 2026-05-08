import Link from "next/link";

type Props = { title: string; description: string; href: string; icon?: string };

export default function PortalCard({ title, description, href, icon = "📋" }: Props) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-surface-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-surface-300 hover:-translate-y-0.5"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-xl transition-colors group-hover:bg-brand-50">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-surface-800">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-surface-500">{description}</p>
    </Link>
  );
}
