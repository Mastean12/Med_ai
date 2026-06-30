import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-surface-800">404</h1>
        <p className="mt-4 text-lg text-surface-500">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
