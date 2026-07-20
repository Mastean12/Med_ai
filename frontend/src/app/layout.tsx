import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Noctual — Shaping Tomorrow's Healthcare Professionals",
  description:
    "Upload medical notes, generate smart flashcards, and get AI-powered Q&A with source citations.",
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem("mt_theme");
    var m = window.matchMedia("(prefers-color-scheme: dark)");
    var isDark = t === "dark" || (t !== "light" && m.matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
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
