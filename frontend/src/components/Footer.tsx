import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-6 h-6 rounded-md bg-[#16A34A] text-white flex items-center justify-center font-bold text-xs">
              I
            </span>
            <span className="font-bold">
              Ijara<span className="text-[#16A34A]">.uz</span>
            </span>
          </div>
          <p className="text-[#6B7280]">
            O'zbekistonda uy-joy ijarasi bo'yicha ishonchli platforma.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-[#111827]">Ijara</h3>
          <ul className="space-y-1.5 text-[#6B7280]">
            <li><Link href="/elonlar" className="hover:text-[#16A34A]">E'lonlar</Link></li>
            <li><Link href="/xarita" className="hover:text-[#16A34A]">Xarita</Link></li>
            <li><Link href="/elon-joylash" className="hover:text-[#16A34A]">E'lon berish</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-[#111827]">Foydalanuvchi</h3>
          <ul className="space-y-1.5 text-[#6B7280]">
            <li><Link href="/login" className="hover:text-[#16A34A]">Kirish</Link></li>
            <li><Link href="/register" className="hover:text-[#16A34A]">Ro'yxatdan o'tish</Link></li>
            <li><Link href="/saqlanganlar" className="hover:text-[#16A34A]">Saqlanganlar</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-[#111827]">Yordam</h3>
          <ul className="space-y-1.5 text-[#6B7280]">
            <li>Xavfsizlik qoidalari</li>
            <li>Aloqa: +998 90 123 45 67</li>
            <li>support@ijara.uz</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#E5E7EB] py-4 text-center text-xs text-[#9CA3AF]">
        © {new Date().getFullYear()} Ijara.uz — Barcha huquqlar himoyalangan
      </div>
    </footer>
  );
}