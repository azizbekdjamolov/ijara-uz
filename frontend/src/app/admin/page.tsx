"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Check,
  ExternalLink,
  Search,
  Shield,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import type { AdminStats, AdminUser } from "@/lib/types";

type Tab = "moderation" | "users" | "stats";

interface ModerationItem {
  id: string;
  slug: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  owner: { full_name: string; phone: string };
  property: { district: string; rooms: number; area: number };
  images: { id: string; image: string }[];
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        api.get<AdminStats>("/admin-panel/stats/"),
        api.get<{ results: ModerationItem[] }>("/admin-panel/moderation/?page_size=50"),
      ]);
      setStats(s);
      setModerationItems(m.results ?? []);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      if (userRoleFilter) params.set("role", userRoleFilter);
      const data = await api.get<{ results?: AdminUser[] } | AdminUser[]>(
        `/admin-panel/users/?${params.toString()}`
      );
      setUsers(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, userSearch, userRoleFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/moderation/listings/${id}/approve/`, {});
      setModerationItems((prev) => prev.filter((item) => item.id !== id));
      setStats((s) => s ? { ...s, pending_review: Math.max(0, s.pending_review - 1) } : s);
      setMessage({ text: "E'lon tasdiqlandi", type: "success" });
    } catch {
      setMessage({ text: "Xatolik yuz berdi", type: "error" });
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/moderation/listings/${id}/reject/`, { note: rejectNote });
      setModerationItems((prev) => prev.filter((item) => item.id !== id));
      setStats((s) => s ? { ...s, pending_review: Math.max(0, s.pending_review - 1) } : s);
      setMessage({ text: "E'lon rad etildi", type: "success" });
      setRejectNote("");
      setRejectTarget(null);
    } catch {
      setMessage({ text: "Xatolik yuz berdi", type: "error" });
    }
    setActionLoading(null);
  };

  const handleToggleAdmin = async (userId: string) => {
    setActionLoading(userId);
    try {
      const data = await api.post<{ message: string; status: string }>(
        `/admin-panel/users/${userId}/toggle-admin/`,
        {}
      );
      setMessage({ text: data.message, type: "success" });
      loadUsers();
    } catch {
      setMessage({ text: "Xatolik yuz berdi", type: "error" });
    }
    setActionLoading(null);
  };

  const handleToggleBan = async (userId: string) => {
    setActionLoading(userId);
    try {
      const data = await api.post<{ message: string; is_banned: boolean }>(
        `/admin-panel/users/${userId}/toggle-ban/`,
        {}
      );
      setMessage({ text: data.message, type: "success" });
      loadUsers();
    } catch {
      setMessage({ text: "Xatolik yuz berdi", type: "error" });
    }
    setActionLoading(null);
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <ShieldOff size={48} className="mx-auto mb-3 text-muted/30" />
          <p className="text-muted">Ruxsat yo'q. Faqat adminlar uchun.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "stats", label: "Statistika", icon: BarChart3 },
    { key: "moderation", label: "Moderatsiya", icon: ShieldCheck, count: moderationItems.length },
    { key: "users", label: "Foydalanuvchilar", icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] flex items-center justify-center shadow-md">
          <Shield size={20} className="text-[#1a1405]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin panel</h1>
          <p className="text-sm text-muted">Boshqaruv paneli</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.type === "success"
              ? "bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32]"
              : "bg-[#FFEBEA] border border-[#FFC7C5] text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
              tab === t.key
                ? "bg-[rgba(212,175,55,0.12)] text-gold border border-[rgba(212,175,55,0.3)]"
                : "text-muted hover:bg-white/5 border border-transparent"
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[rgba(212,175,55,0.2)] text-[11px] font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-20 text-muted text-sm">Yuklanmoqda...</div>
      )}

      {!loading && tab === "stats" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Jami foydalanuvchilar", value: stats.total_users, color: "text-gold" },
            { label: "Jami e'lonlar", value: stats.total_listings, color: "text-gold" },
            { label: "Kutilayotgan", value: stats.pending_review, color: "text-[#ff6b5e]" },
            { label: "Nashr etilgan", value: stats.published, color: "text-[#4caf50]" },
            { label: "Qo'shimcha tekshiruv", value: stats.needs_review, color: "text-[#ff9800]" },
            { label: "Bloklangan", value: stats.banned_users, color: "text-[#ff6b5e]" },
            { label: "Adminlar", value: stats.admin_count, color: "text-gold" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "moderation" && (
        <div className="space-y-3">
          {moderationItems.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <ShieldCheck size={40} className="mx-auto mb-3 text-muted/30" />
              Navbat bo'sh — tekshirish kerak bo'lgan e'lon yo'q
            </div>
          )}
          {moderationItems.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start gap-4">
                {item.images[0] && (
                  <img
                    src={item.images[0].image}
                    alt=""
                    className="w-20 h-16 rounded-lg object-cover shrink-0 bg-[var(--surface-strong)]"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm truncate">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.1)] text-gold shrink-0">
                      {item.status === "pending_review" ? "Yangi" : "Qayta tekshiruv"}
                    </span>
                  </div>
                  <div className="text-sm text-gold font-semibold">{formatPrice(item.price)} so'm/oy</div>
                  <div className="text-xs text-muted mt-1">
                    {item.property.district} · {item.property.rooms} xona · {item.property.area} m²
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {item.owner.full_name} · {item.owner.phone}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2e7d32] text-white text-xs font-medium hover:bg-[#256427] transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Tasdiqlash
                  </button>
                  {rejectTarget === item.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Sabab..."
                        className="input text-xs py-1 px-2"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex-1 px-2 py-1 rounded-lg bg-[#c62828] text-white text-xs font-medium hover:bg-[#b71c1c] transition-colors disabled:opacity-50"
                        >
                          Rad etish
                        </button>
                        <button
                          onClick={() => { setRejectTarget(null); setRejectNote(""); }}
                          className="px-2 py-1 rounded-lg text-xs text-muted hover:bg-white/5"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectTarget(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(198,40,40,0.1)] text-[#ff6b5e] text-xs font-medium hover:bg-[rgba(198,40,40,0.2)] transition-colors"
                    >
                      <X size={14} /> Rad etish
                    </button>
                  )}
                  <a
                    href={`/elon/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink size={12} /> Ko'rish
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "users" && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Qidirish (ism, telefon, email)..."
                className="input pl-9"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Barcha rollar</option>
              <option value="tenant">Ijarachi</option>
              <option value="owner">Uy egasi</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold shrink-0 text-sm">
                  {(u.full_name || "F").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{u.full_name || "Noma'lum"}</span>
                    {u.role === "admin" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[rgba(212,175,55,0.15)] text-gold text-[10px] font-bold">
                        ADMIN
                      </span>
                    )}
                    {u.role === "moderator" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[rgba(33,150,243,0.15)] text-[#2196f3] text-[10px] font-bold">
                        MOD
                      </span>
                    )}
                    {u.is_banned && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[rgba(198,40,40,0.15)] text-[#ff6b5e] text-[10px] font-bold">
                        BLOK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {u.phone} · {u.active_listings} e'lon
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleAdmin(u.id)}
                    disabled={actionLoading === u.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      u.role === "admin"
                        ? "bg-[rgba(198,40,40,0.1)] text-[#ff6b5e] hover:bg-[rgba(198,40,40,0.2)]"
                        : "bg-[rgba(33,150,243,0.1)] text-[#2196f3] hover:bg-[rgba(33,150,243,0.2)]"
                    }`}
                  >
                    {u.role === "admin" ? "Adminni o'chirish" : "Admin qilish"}
                  </button>
                  <button
                    onClick={() => handleToggleBan(u.id)}
                    disabled={actionLoading === u.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      u.is_banned
                        ? "bg-[rgba(76,175,80,0.1)] text-[#4caf50] hover:bg-[rgba(76,175,80,0.2)]"
                        : "bg-[rgba(198,40,40,0.1)] text-[#ff6b5e] hover:bg-[rgba(198,40,40,0.2)]"
                    }`}
                  >
                    {u.is_banned ? "Faollashtirish" : "Bloklash"}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-10 text-muted text-sm">
                Foydalanuvchilar topilmadi
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
