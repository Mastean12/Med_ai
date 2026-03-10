type Props = {
  title: string;
  description: string;
  href: string;
};

export default function PortalCard({ title, description, href }: Props) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </a>
  );
}