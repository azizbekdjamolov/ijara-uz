"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bed,
  Camera,
  Check,
  MapPin,
  Tag,
  Type,
  Wallet,
} from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Kvartira" },
  { value: "house", label: "Uy" },
  { value: "room", label: "Xona" },
  { value: "office", label: "Ofis" },
  { value: "commercial", label: "Tijorat" },
];

const DISTRICTS = [
  "Bektemir", "Chilonzor", "Mirabod", "Mirzo Ulug'bek", "Olmazor",
  "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot",
  "Yashnobod", "Yunusobod",
];

interface Draft {
  property_type: string;
  rooms: string;
  district: string;
  title: string;
  description: string;
  price: string;
  deposit: string;
  area: string;
  floor: string;
  total_floors: string;
  min_rental_months: string;
  furnished: boolean;
  has_ac: boolean;
  has_elevator: boolean;
  has_internet: boolean;
  has_parking: boolean;
  family_ok: boolean;
  students_ok: boolean;
}

const INITIAL_DRAFT: Draft = {
  property_type: "apartment",
  rooms: "2",
  district: "Chilonzor",
  title: "",
  description: "",
  price: "",
  deposit: "",
  area: "",
  floor: "",
  total_floors: "",
  min_rental_months: "1",
  furnished: false,
  has_ac: false,
  has_elevator: false,
  has_internet: false,
  has_parking: false,
  family_ok: true,
  students_ok: true,
};

const STEP_TITLES = [
  "Mulk turi", "Joylashuv", "Tavsif", "Xususiyatlar",
  "Rasmlar", "Narx", "Tasdiqlash",
];

export default function WizardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) router.push("/login?next=/elon-joylash");
  }, [user, router]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const validStep = (): string | null => {
    switch (step) {
      case 2:
        if (draft.title.trim().length < 10)
          return "Sarlavha kamida 10 belgidan iborat bo'lishi kerak";
        if (draft.description.trim().length < 20)
          return "Tavsif kamida 20 belgidan iborat bo'lishi kerak";
        return null;
      case 3:
        if (!draft.area || Number(draft.area) <= 0)
          return "Maydonni kiriting";
        return null;
      case 5:
        if (!draft.price || Number(draft.price) <= 0)
          return "Oylik narxni kiriting";
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const problem = validStep();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 6));
  };

  const addImages = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, 10));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/listings/", {
        title: draft.title,
        price: Number(draft.price),
        currency: "UZS",
        property: {
          property_type: draft.property_type,
          rooms: Number(draft.rooms) || 0,
          area: Number(draft.area),
          floor: draft.floor ? Number(draft.floor) : null,
          total_floors: draft.total_floors ? Number(draft.total_floors) : null,
          furnished: draft.furnished,
          has_parking: draft.has_parking,
          has_elevator: draft.has_elevator,
          has_ac: draft.has_ac,
          has_internet: draft.has_internet,
          family_ok: draft.family_ok,
          students_ok: draft.students_ok,
          min_rental_months: Number(draft.min_rental_months) || 1,
          deposit: draft.deposit ? Number(draft.deposit) : null,
          description: draft.description,
          city: "Toshkent",
          district: draft.district,
          location_accuracy: "approximate",
        },
      });

      if (images.length > 0) {
        const form = new FormData();
        images.forEach((img) => form.append("images", img));
        await api.upload(`/listings/${created.id}/images/`, form);
      }

      await api.post(`/listings/${created.id}/publish/`);
      router.push(`/profil`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Xatolik yuz berdi");
      setSubmitting(false);
    }
  };

  const inputClass = "input";
  const labelClass = "block text-xs font-semibold text-muted mb-1";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-1">E&apos;lon berish</h1>
      <p className="text-sm text-muted mb-6">
        Barcha e&apos;lonlar AI tekshiruvidan o&apos;tadi
      </p>

      <ol className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar">
        {STEP_TITLES.map((title, index) => (
          <li key={title} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => index < step && setStep(index)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                index < step
                  ? "bg-[rgba(212,175,55,0.15)] text-white"
                  : index === step
                  ? "bg-[rgba(212,175,55,0.15)]/10 text-gold border border-[rgba(212,175,55,0.6)]"
                  : "bg-[rgba(118,118,128,0.12)] text-muted"
              }`}
            >
              {index < step ? <Check size={13} /> : index + 1}
            </button>
            {index < STEP_TITLES.length - 1 && (
              <span
                className={`h-0.5 w-5 ${
                  index < step ? "bg-[rgba(212,175,55,0.15)]" : "bg-[var(--border)]"
                }`}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="card p-5 animate-fade-in-up" key={step}>
        {error && (
          <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Type size={18} className="text-gold" /> Mulk turini tanlang
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("property_type", t.value)}
                  className={`border rounded-xl py-4 text-center font-medium text-sm transition-all ${
                    draft.property_type === t.value
                      ? "border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.12)] text-gold"
                      : "border-[rgba(212,175,55,0.18)] hover:border-[rgba(212,175,55,0.4)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className={labelClass}>Xonalar soni</label>
              <select
                value={draft.rooms}
                onChange={(e) => set("rooms", e.target.value)}
                className={inputClass}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? "Xonasiz (studiya)" : `${r} xona`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-gold" /> Joylashuv
            </h2>
            <label className={labelClass}>Tuman</label>
            <select
              value={draft.district}
              onChange={(e) => set("district", e.target.value)}
              className={inputClass}
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <p className="mt-3 text-xs text-muted">
              Aniq manzil faqat egasi va xaridor muloqotida ko'rsatiladi.
              E'longa taxminiy joylashuv qo'shiladi.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Type size={18} className="text-gold" /> Tavsif
            </h2>
            <div>
              <label className={labelClass}>Sarlavha</label>
              <input
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Masalan: Chilonzorda 2 xonali yangi ta'mirlangan kvartira"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Batafsil tavsif</label>
              <textarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                rows={6}
                placeholder="Holati, transport, qo'shimcha shartlar..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Bed size={18} className="text-gold" /> Xususiyatlar
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Maydon, mВІ</label>
                <input
                  type="number"
                  value={draft.area}
                  onChange={(e) => set("area", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Qavat</label>
                <input
                  type="number"
                  value={draft.floor}
                  onChange={(e) => set("floor", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Qavatlar soni</label>
                <input
                  type="number"
                  value={draft.total_floors}
                  onChange={(e) => set("total_floors", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Minimal muddat, oy</label>
                <input
                  type="number"
                  value={draft.min_rental_months}
                  onChange={(e) => set("min_rental_months", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Mebelli" checked={draft.furnished} onChange={(v) => set("furnished", v)} />
              <Toggle label="Konditsioner" checked={draft.has_ac} onChange={(v) => set("has_ac", v)} />
              <Toggle label="Lift" checked={draft.has_elevator} onChange={(v) => set("has_elevator", v)} />
              <Toggle label="Internet" checked={draft.has_internet} onChange={(v) => set("has_internet", v)} />
              <Toggle label="Avtoturargoh" checked={draft.has_parking} onChange={(v) => set("has_parking", v)} />
              <Toggle label="Oilali uchun" checked={draft.family_ok} onChange={(v) => set("family_ok", v)} />
              <Toggle label="Talabalar uchun" checked={draft.students_ok} onChange={(v) => set("students_ok", v)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Camera size={18} className="text-gold" /> Rasmlar
            </h2>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full border-2 border-dashed border-[rgba(212,175,55,0.18)] rounded-xl py-10 text-center hover:border-[rgba(212,175,55,0.6)] transition-colors"
            >
              <Camera size={28} className="mx-auto text-muted mb-2" />
              <span className="text-sm font-medium text-gold">
                Rasmlar yuklash (kamida 1 ta)
              </span>
              <span className="block text-xs text-muted mt-1">
                JPG/PNG, 10 tagacha
              </span>
            </button>
            {images.length > 0 && (
              <ul className="mt-4 space-y-2">
                {images.map((img, i) => (
                  <li
                    key={`${img.name}-${i}`}
                    className="flex items-center justify-between bg-[rgba(118,118,128,0.04)] border border-[rgba(212,175,55,0.18)] rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="truncate max-w-[70%]">{img.name}</span>
                    <button
                      onClick={() =>
                        setImages((prev) => prev.filter((_, index) => index !== i))
                      }
                      className="text-danger text-xs font-medium"
                    >
                      O'chirish
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Wallet size={18} className="text-gold" /> Narx
            </h2>
            <div>
              <label className={labelClass}>Oylik ijara narxi, so'm</label>
              <input
                type="number"
                value={draft.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="Masalan: 3500000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kafolat (depozit), so'm вЂ” ixtiyoriy</label>
              <input
                type="number"
                value={draft.deposit}
                onChange={(e) => set("deposit", e.target.value)}
                placeholder="Masalan: 3500000"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Tag size={18} className="text-gold" /> Tasdiqlash
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Sarlavha" value={draft.title} />
              <Row label="Tuman" value={draft.district} />
              <Row label="Turi" value={PROPERTY_TYPES.find((t) => t.value === draft.property_type)?.label ?? ""} />
              <Row label="Xonalar" value={`${draft.rooms} xona`} />
              <Row label="Maydon" value={`${draft.area} mВІ`} />
              <Row label="Narx" value={`${Number(draft.price).toLocaleString("ru-RU")} so'm/oy`} />
              <Row label="Rasmlar" value={`${images.length} ta`} />
            </dl>
            <p className="mt-4 text-xs text-muted bg-[rgba(118,118,128,0.04)] border border-[rgba(212,175,55,0.18)] rounded-lg p-3">
              E'lon AI tekshiruvidan o'tadi va bir necha daqiqada nashr qilinadi.
              Soxta yoki chalg'ituvchi e'lonlar rad etiladi.
            </p>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-[rgba(212,175,55,0.18)]">
          <button
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-muted disabled:opacity-40 px-3 py-2"
          >
            <ArrowLeft size={16} /> Orqaga
          </button>
          {step < 6 ? (
            <button
              onClick={next}
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              Davom etish <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              {submitting ? "Yuborilmoqda..." : "E'lonni joylash"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-right">{value || "вЂ”"}</dd>
    </div>
  );
}