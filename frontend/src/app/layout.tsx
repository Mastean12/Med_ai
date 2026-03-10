import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Noctual AI",
  description: "Notes + Q&A + Public health assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}