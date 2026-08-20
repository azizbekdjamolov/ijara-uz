import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  display: "swap",
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

function BackgroundDecor() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="orb orb-gold animate-glow w-[420px] h-[420px] -top-24 -right-24" />
      <div className="orb orb-blue animate-glow w-[380px] h-[380px] top-1/3 -left-32" style={{ animationDelay: "1.5s" }} />
      <div className="orb orb-violet animate-glow w-[300px] h-[300px] bottom-0 right-1/4" style={{ animationDelay: "3s" }} />
      <div className="absolute top-24 right-16 hidden lg:block w-40 h-40 rounded-full border border-[rgba(212,175,55,0.15)] animate-spin-slow" />
      <div className="absolute top-40 right-32 hidden lg:block w-24 h-24 rounded-full border border-[rgba(212,175,55,0.2)] animate-spin-slow" style={{ animationDirection: "reverse" }} />
      <div className="absolute bottom-24 left-10 hidden lg:block w-32 h-32 rounded-full border border-[rgba(212,175,55,0.15)] animate-spin-slow" style={{ animationDelay: "2s" }} />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uz"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BackgroundDecor />
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}