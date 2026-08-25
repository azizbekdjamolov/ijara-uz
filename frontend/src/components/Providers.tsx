"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { initI18n } from "@/i18n";
import Header from "./Header";
import Footer from "./Footer";
import BottomBar from "./BottomBar";
import AuthGuard from "./AuthGuard";

try {
  initI18n();
} catch {
  /* i18n optional during SSR */
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Header />
        <main className="flex-1">
          <AuthGuard>{children}</AuthGuard>
        </main>
        <Footer />
      </AuthProvider>
    </ThemeProvider>
  );
}