"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Home,
  PlusCircle,
  Heart,
  MessageCircle,
  User,
  ArrowLeft,
  Search,
  MapPin,
  Bed,
  Camera,
  Check,
  Wallet,
  Tag,
  Send,
  Trash2,
  LogOut,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiRequestError } from "@/lib/api";
import {
  formatCompactPrice,
  formatRelative,
  getPropertyTypeLabel,
  getStatusLabel,
} from "@/lib/format";
import { ReservationPanel } from "@/components/ReservationPanel";
import type {
  ListingSummary,
  ListingDetail,
  Conversation,
  Message,
} from "@/lib/types";
import { useTelegram } from "./TelegramProvider";

type Tab = "listings" | "post" | "saved" | "chat" | "profile";

const DISTRICTS = [
  "Bektemir","Chilonzor","Mirabod","Mirzo Ulug'bek","Olmazor","Sergeli",
  "Shayxontohur","Uchtepa","Yakkasaroy","Yangihayot","Yashnobod","Yunusobod",
];

const PROPERTY_TYPES = [
  { value: "apartment", label: "Kvartira" },
  { value: "house", label: "Uy" },
  { value: "room", label: "Xona" },
  { value: "office", label: "Ofis" },
  { value: "commercial", label: "Tijorat" },
];

export default function MiniAppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const tg = useTelegram();
  const [tab, setTab] = useState<Tab>("listings");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ tab: Tab; slug?: string; chatId?: string }[]>([]);

  const navigate = useCallback((newTab: Tab, slug?: string, cid?: string) => {
    setHistory((h) => [...h, { tab, slug: detailSlug ?? undefined, chatId: chatId ?? undefined }]);
    setTab(newTab);
    setDetailSlug(slug ?? null);
    setChatId(cid ?? null);
  }, [tab, detailSlug, chatId]);

  const goBack = useCallback(() => {
    if (detailSlug || chatId) {
      setDetailSlug(null);
      setChatId(null);
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setTab(prev.tab);
      setDetailSlug(prev.slug ?? null);
      setChatId(prev.chatId ?? null);
    }
  }, [history, detailSlug, chatId]);

  useEffect(() => {
    if (tg.isInTelegram && tg.setHeaderColor) {
      tg.setHeaderColor("#07090f");
    }
  }, [tg]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Yuklanmoqda...</div>;
  }

  const showBack = detailSlug || chatId || history.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--tg-bg, var(--bg))" }}>
      {tg.isInTelegram && showBack && (
        <button
          onClick={goBack}
          className="sticky top-0 z-50 flex items-center gap-2 px-4 py-3 text-sm text-foreground"
          style={{ background: "var(--tg-bg, var(--bg))" }}
        >
          <ArrowLeft size={18} />
          {t("common.back", "Orqaga")}
        </button>
      )}

      <div className="flex-1 pb-20">
        {detailSlug ? (
          <ListingDetail slug={detailSlug} onBack={goBack} />
        ) : chatId ? (
          <ChatDetail conversationId={chatId} onBack={goBack} />
        ) : tab === "listings" ? (
          <ListingsTab onOpenListing={(slug) => navigate("listings", slug)} />
        ) : tab === "post" ? (
          <PostTab onDone={() => { setTab("listings"); setHistory([]); }} />
        ) : tab === "saved" ? (
          <SavedTab onOpenListing={(slug) => navigate("saved", slug)} />
        ) : tab === "chat" ? (
          <ChatTab onOpenChat={(cid) => navigate("chat", undefined, cid)} />
        ) : (
          <ProfileTab onLogout={() => { logout(); tg.close(); }} />
        )}
      </div>

      {!detailSlug && !chatId && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl"
          style={{ background: "var(--tg-bg, var(--bg))", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
            {([
              { key: "listings" as Tab, icon: Home, label: t("nav.home", "Bosh") },
              { key: "saved" as Tab, icon: Heart, label: t("nav.favorites", "Saqlangan") },
              { key: "post" as Tab, icon: PlusCircle, label: t("nav.post", "Qo'shish"), accent: true },
              { key: "chat" as Tab, icon: MessageCircle, label: t("nav.messages", "Xabarlar") },
              { key: "profile" as Tab, icon: User, label: t("nav.profile", "Profil") },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => { setTab(item.key); setHistory([]); setDetailSlug(null); setChatId(null); }}
                className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl text-[10px] font-medium transition-colors ${
                  tab === item.key ? "text-gold" : "text-muted"
                } ${item.accent ? "relative -mt-3" : ""}`}
              >
                {item.accent ? (
                  <span className="w-11 h-11 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center shadow-lg shadow-[rgba(212,175,55,0.3)]">
                    <item.icon size={22} strokeWidth={2} />
                  </span>
                ) : (
                  <item.icon size={20} strokeWidth={tab === item.key ? 2.2 : 1.8} />
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

/* ─────────────── Listings Tab ─────────────── */

function ListingsTab({ onOpenListing }: { onOpenListing: (slug: string) => void }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "30", sort: "newest" });
      if (query) params.set("q", query);
      if (district) params.set("district", district);
      const data = await api.get<{ count: number; results: ListingSummary[] }>(`/search/listings/?${params}`);
      setListings(data.results);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [query, district]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-3 pt-3">
      <h1 className="text-lg font-bold mb-3">{t("nav.listings", "E'lonlar")}</h1>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder", "Qidirish...")}
            className="input pl-8 py-2 text-sm w-full"
          />
        </div>
        <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input py-2 text-sm w-28">
          <option value="">Hammasi</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">{t("common.loading", "Yuklanmoqda...")}</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">{t("common.noResults", "Hech narsa topilmadi")}</div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <MiniListingCard key={l.id} listing={l} onClick={() => onOpenListing(l.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Listing Card (compact) ─────────────── */

function MiniListingCard({ listing, onClick }: { listing: ListingSummary; onClick: () => void }) {
  const img = listing.primary_image?.thumb ?? listing.primary_image?.image;
  return (
    <button onClick={onClick} className="w-full flex gap-3 p-2.5 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.03)] text-left active:scale-[0.98] transition-transform">
      <div className="w-20 h-20 rounded-lg bg-[rgba(255,255,255,0.05)] overflow-hidden shrink-0 relative">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted"><Home size={20} /></div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="font-bold text-gold text-sm">{formatCompactPrice(listing.price)}</div>
          <div className="text-xs text-foreground/75 truncate mt-0.5">{listing.title}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="flex items-center gap-0.5"><MapPin size={10} />{listing.property.district}</span>
          <span>{getPropertyTypeLabel(listing.property.property_type)}</span>
          {listing.property.rooms ? <span>{listing.property.rooms}-xona</span> : null}
        </div>
      </div>
    </button>
  );
}

/* ─────────────── Listing Detail ─────────────── */

function ListingDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<ListingDetail>(`/listings/by-slug/${slug}/`);
        setListing(data);
      } catch { onBack(); } finally { setLoading(false); }
    })();
  }, [slug, onBack]);

  if (loading || !listing) {
    return <div className="text-center py-16 text-muted text-sm">{t("common.loading", "Yuklanmoqda...")}</div>;
  }

  const toggleFav = async () => {
    try {
      await api.post(`/listings/favorites/toggle/${listing.id}/`);
      setListing((prev) => prev ? { ...prev, is_favorite: !prev.is_favorite } : prev);
    } catch { /* ignore */ }
  };

  return (
    <div className="px-3 pt-2">
      {listing.images.length > 0 && (
        <div className="w-full aspect-video rounded-xl overflow-hidden mb-3 bg-[rgba(255,255,255,0.05)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.images.find((i) => i.is_primary)?.image ?? listing.images[0].image}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="font-bold text-xl text-gold">{formatCompactPrice(listing.price)} / {t("common.month", "oy")}</div>
      <h2 className="text-sm font-semibold mt-1">{listing.title}</h2>
      <div className="flex items-center gap-2 text-xs text-muted mt-1">
        <MapPin size={12} /> {listing.property.district}, {listing.property.address_line}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <InfoChip icon={<Bed size={12} />} text={`${listing.property.rooms}-xona`} />
        <InfoChip icon={<Home size={12} />} text={`${listing.property.area} m²`} />
        {listing.property.floor && <InfoChip icon={<Home size={12} />} text={`${listing.property.floor}/${listing.property.total_floors} qavat`} />}
      </div>
      {listing.property.description && (
        <p className="text-xs text-foreground/70 mt-3 leading-relaxed">{listing.property.description}</p>
      )}
      <div className="flex gap-2 mt-4">
        <button onClick={toggleFav} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${listing.is_favorite ? "bg-gold/20 text-gold border border-gold/30" : "bg-white/5 text-muted border border-[var(--border)]"}`}>
          <Heart size={14} fill={listing.is_favorite ? "currentColor" : "none"} />
          {listing.is_favorite ? t("listing.saved", "Saqlangan") : t("listing.save", "Saqlash")}
        </button>
        {user && user.id !== listing.owner.id && (
          <button onClick={async () => {
            try {
              const conv = await api.post<{ id: string }>("/chat/conversations/", { listing_id: listing.id });
              // navigate to chat - handled by parent
            } catch { /* ignore */ }
          }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#e8c869] to-[#d4af37] text-[#1a1405] flex items-center justify-center gap-1.5">
            <Send size={14} /> {t("listing.message", "Xabar yozish")}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-foreground/70 border border-[rgba(212,175,55,0.1)]">
      {icon} {text}
    </span>
  );
}

/* ─────────────── Post Tab ─────────────── */

function PostTab({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    property_type: "apartment",
    rooms: "2",
    district: "Chilonzor",
    title: "",
    description: "",
    price: "",
    area: "",
    floor: "",
    total_floors: "",
  });

  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        rooms: parseInt(draft.rooms) || 1,
        price: parseInt(draft.price) || 0,
        area: parseFloat(draft.area) || 0,
        floor: draft.floor ? parseInt(draft.floor) : null,
        total_floors: draft.total_floors ? parseInt(draft.total_floors) : null,
      };
      const created = await api.post<{ id: string }>("/listings/", payload);
      await api.post(`/listings/${created.id}/publish/`, {});
      onDone();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error", "Xatolik"));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    // Step 0: Type + rooms
    <div key="0" className="space-y-3">
      <h3 className="text-sm font-semibold">{t("post.propertyType", "Mulk turi")}</h3>
      <div className="grid grid-cols-3 gap-2">
        {PROPERTY_TYPES.map((pt) => (
          <button key={pt.value} onClick={() => set("property_type", pt.value)}
            className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${draft.property_type === pt.value ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/3 border-[var(--border)] text-muted"}`}>
            {pt.label}
          </button>
        ))}
      </div>
      <h3 className="text-sm font-semibold mt-3">{t("post.rooms", "Xonalar soni")}</h3>
      <div className="flex gap-2">
        {["1", "2", "3", "4", "5+"].map((r) => (
          <button key={r} onClick={() => set("rooms", r)}
            className={`w-12 h-10 rounded-xl text-xs font-medium border transition-colors ${draft.rooms === r ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/3 border-[var(--border)] text-muted"}`}>
            {r}
          </button>
        ))}
      </div>
      <h3 className="text-sm font-semibold mt-3">{t("post.district", "Tuman")}</h3>
      <select value={draft.district} onChange={(e) => set("district", e.target.value)} className="input py-2.5 text-sm w-full">
        {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>,
    // Step 1: Details
    <div key="1" className="space-y-3">
      <input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder={t("post.title", "Sarlavha")} className="input py-2.5 text-sm w-full" maxLength={100} />
      <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder={t("post.description", "Tavsif")} className="input py-2.5 text-sm w-full h-24 resize-none" maxLength={2000} />
      <div className="grid grid-cols-2 gap-2">
        <input value={draft.area} onChange={(e) => set("area", e.target.value)} placeholder={t("post.area", "Maydon (m²)")} className="input py-2.5 text-sm" inputMode="decimal" />
        <input value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder={t("post.price", "Narx (so'm/oy)")} className="input py-2.5 text-sm" inputMode="numeric" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={draft.floor} onChange={(e) => set("floor", e.target.value)} placeholder={t("post.floor", "Qavat")} className="input py-2.5 text-sm" inputMode="numeric" />
        <input value={draft.total_floors} onChange={(e) => set("total_floors", e.target.value)} placeholder={t("post.totalFloors", "Jami qavat")} className="input py-2.5 text-sm" inputMode="numeric" />
      </div>
    </div>,
  ];

  return (
    <div className="px-3 pt-3">
      <h1 className="text-lg font-bold mb-3">{t("post.title", "E'lon qo'shish")}</h1>
      {error && <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-3 py-2 text-xs">{error}</div>}
      <div className="mb-4 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-white/10"}`} />
        ))}
      </div>
      {steps[step]}
      <div className="flex gap-2 mt-4">
        {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-muted">{t("common.back", "Orqaga")}</button>}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#e8c869] to-[#d4af37] text-[#1a1405]">
            {t("common.next", "Keyingi")}
          </button>
        ) : (
          <button onClick={submit} disabled={submitting || !draft.title || !draft.price} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#e8c869] to-[#d4af37] text-[#1a1405] disabled:opacity-40">
            {submitting ? <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin inline-block" /> : t("post.submit", "Joylash")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Saved Tab ─────────────── */

function SavedTab({ onOpenListing }: { onOpenListing: (slug: string) => void }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ count: number; results: ListingSummary[] }>("/listings/favorites/?page_size=50");
        setListings(data.results);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="px-3 pt-3">
      <h1 className="text-lg font-bold mb-3">{t("nav.favorites", "Saqlanganlar")}</h1>
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">{t("common.loading", "Yuklanmoqda...")}</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          {t("favorites.empty", "Hozircha saqlangan e'lonlar yo'q")}
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => <MiniListingCard key={l.id} listing={l} onClick={() => onOpenListing(l.slug)} />)}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Chat Tab ─────────────── */

function ChatTab({ onOpenChat }: { onOpenChat: (id: string) => void }) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ count: number; results: Conversation[] }>("/chat/conversations/");
        setConversations(data.results);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="px-3 pt-3">
      <h1 className="text-lg font-bold mb-3">{t("nav.messages", "Xabarlar")}</h1>
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">{t("common.loading", "Yuklanmoqda...")}</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">{t("chat.empty", "Hozircha xabarlar yo'q")}</div>
      ) : (
        <div className="space-y-1">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => onOpenChat(c.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left active:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold shrink-0">
                {c.other_user.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{c.other_user.full_name}</span>
                  {c.last_message && <span className="text-[10px] text-muted shrink-0">{formatRelative(c.last_message.created_at)}</span>}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {c.listing.title} — {formatCompactPrice(c.listing.price)}
                </div>
                {c.last_message && (
                  <div className="text-xs text-foreground/50 truncate mt-0.5">{c.last_message.text}</div>
                )}
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-gold text-[#1a1405] text-[10px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Chat Detail ─────────────── */

function ChatDetail({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [conv, setConv] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Message[]>(`/chat/conversations/${conversationId}/messages/`);
      setMessages(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    api.get<Conversation>(`/chat/conversations/${conversationId}/`)
      .then(setConv)
      .catch(() => {});
  }, [conversationId]);

  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText("");
    try {
      await api.post(`/chat/conversations/${conversationId}/messages/create/`, { text: body });
      load();
    } catch { setText(body); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" ref={(el) => el?.scrollTo(0, el.scrollHeight)}>
        {loading ? (
          <div className="text-center py-12 text-muted text-sm">{t("common.loading", "Yuklanmoqda...")}</div>
        ) : messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] ${m.sender_id === user?.id ? "ml-auto" : ""}`}>
            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.sender_id === user?.id ? "bg-gold/20 text-foreground rounded-br-sm" : "bg-white/5 text-foreground/80 rounded-bl-sm"}`}>
              {m.text}
            </div>
            <div className={`text-[9px] text-muted mt-0.5 ${m.sender_id === user?.id ? "text-right" : ""}`}>
              {formatRelative(m.created_at)}
            </div>
          </div>
        ))}
      </div>
      {conv && (
        <ReservationPanel conversationId={conversationId} ownerId={conv.listing.owner_id} />
      )}
      <div className="px-3 py-2 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={t("chat.placeholder", "Xabar...")} className="input flex-1 py-2 text-sm" />
        <button onClick={send} disabled={!text.trim()}
          className="w-10 h-10 rounded-xl bg-gold text-[#1a1405] flex items-center justify-center shrink-0 disabled:opacity-40">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Profile Tab ─────────────── */

function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myListings, setMyListings] = useState<ListingSummary[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ count: number; results: ListingSummary[] }>("/listings/mine/?page_size=50");
        setMyListings(data.results);
      } catch { /* ignore */ }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me/", { full_name: name.trim(), city: city.trim() || null });
      await refreshUser();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="px-3 pt-3 space-y-4">
      <h1 className="text-lg font-bold">{t("nav.profile", "Profil")}</h1>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold text-xl shadow-lg shadow-[rgba(212,175,55,0.3)]">
          {(user.full_name || "U").charAt(0).toUpperCase()}
        </div>
        <div>
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} className="input py-1.5 text-sm font-semibold" />
          ) : (
            <div className="font-semibold text-sm">{user.full_name}</div>
          )}
          <div className="text-xs text-muted">{user.role === "owner" ? "Egasi" : "Ijarachi"}</div>
        </div>
      </div>

      {/* Edit */}
      {editing ? (
        <div className="space-y-2">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("profile.city", "Shahar")} className="input py-2 text-sm w-full" />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl text-sm border border-[var(--border)] text-muted">{t("common.cancel", "Bekor qilish")}</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gold text-[#1a1405]">
              {saving ? "..." : t("common.save", "Saqlash")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setName(user.full_name); setCity(user.city || ""); setEditing(true); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-xs text-muted w-full">
          <Pencil size={14} /> {t("profile.edit", "Profilni tahrirlash")}
        </button>
      )}

      {saved && <div className="text-xs text-green-400 text-center">{t("profile.saved", "Saqlandi!")}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white/3 border border-[rgba(212,175,55,0.1)] text-center">
          <div className="font-bold text-gold text-lg">{myListings.length}</div>
          <div className="text-[10px] text-muted">{t("profile.myListings", "E'lonlarim")}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-[rgba(212,175,55,0.1)] text-center">
          <div className="font-bold text-gold text-lg">{user.trust_tier ?? "—"}</div>
          <div className="text-[10px] text-muted">{t("profile.trust", "Ishonch darajasi")}</div>
        </div>
      </div>

      {/* My Listings */}
      {myListings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">{t("profile.myListings", "E'lonlarim")}</h3>
          <div className="space-y-2">
            {myListings.map((l) => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/3 text-xs">
                <div className="flex-1 truncate">{l.title}</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${l.status === "published" ? "bg-green-500/15 text-green-400" : l.status === "reserved" ? "bg-yellow-500/20 text-yellow-300" : l.status === "rented" ? "bg-blue-500/15 text-blue-300" : "bg-yellow-500/15 text-yellow-400"}`}>
                  {getStatusLabel(l.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={onLogout} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
        <LogOut size={14} /> {t("profile.logout", "Chiqish")}
      </button>
    </div>
  );
}
