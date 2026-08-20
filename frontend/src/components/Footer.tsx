import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--border)] mt-12 safe-bottom pb-16 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white flex items-center justify-center font-bold text-sm shadow-md">
              I
            </span>
            <span className="font-bold">
              Ijara<span className="text-primary">.uz</span>
            </span>
          </div>
          <p className="text-muted">
            O&apos;zbekistonda uy-joy ijarasi bo&apos;yicha ishonchli platforma.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-foreground">Ijara</h3>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link href="/elonlar" className="hover:text-primary transition-colors">
                E&apos;lonlar
              </Link>
            </li>
            <li>
              <Link href="/xarita" className="hover:text-primary transition-colors">
                Xarita
              </Link>
            </li>
            <li>
              <Link href="/elon-joylash" className="hover:text-primary transition-colors">
                E&apos;lon berish
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-foreground">Foydalanuvchi</h3>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link href="/login" className="hover:text-primary transition-colors">
                Kirish
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-primary transition-colors">
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </li>
            <li>
              <Link href="/saqlanganlar" className="hover:text-primary transition-colors">
                Saqlanganlar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-foreground">Yordam</h3>
          <ul className="space-y-1.5 text-muted">
            <li>Xavfsizlik qoidalari</li>
            <li>Aloqa: +998 90 123 45 67</li>
            <li>support@ijara.uz</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Ijara.uz — Barcha huquqlar himoyalangan
      </div>
    </footer>
  );
}