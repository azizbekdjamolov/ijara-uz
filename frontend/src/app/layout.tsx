import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Ijara.uz — O'zbekistonda uy-joy ijarasi",
    template: "%s | Ijara.uz",
  },
  description:
    "Ijara.uz — O'zbekiston bo'ylab kvartira, uy, xona va ofis ijarasi. Tekshirilgan e'lonlar, xavfsiz suhbat va tasdiqlangan egalar.",
  keywords: [
    "ijara",
    "kvartira ijarasi",
    "Toshkent ijara",
    "uy ijarasi",
    "ijaraga uy",
    "ijaraga kvartira",
  ],
  openGraph: {
    title: "Ijara.uz — O'zbekistonda uy-joy ijarasi",
    description:
      "Kvartira, uy, xona va ofis ijarasi. Tekshirilgan e'lonlar va xavfsiz muloqot.",
    type: "website",
    locale: "uz_UZ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#111827]">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}