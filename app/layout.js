import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./components/ui/Toast";
import AppShell from "./components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Budget App - Suivi Financier Personnel",
  description: "Application de suivi financier personnel - comptes, investissements, budget",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0F1A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0B0F1A] text-white font-[family-name:var(--font-inter)]">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
