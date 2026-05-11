import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Noctual AI — Smarter Study, Better Patient Outcomes",
  description:
    "AI-powered medical education and public health assistant. Upload notes, generate flashcards, ask questions, track progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-50 text-surface-900 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ProfileProvider>
              <Navbar />
              {children}
              <Footer />
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
