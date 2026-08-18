export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(value)} so'm`;
}

export function formatCompactPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) {
    const mln = value / 1_000_000;
    return `${Number.isInteger(mln) ? mln : mln.toFixed(1)} mln`;
  }
  if (value >= 1000) {
    const ming = value / 1000;
    return `${Number.isInteger(ming) ? ming : ming.toFixed(1)} ming`;
  }
  return String(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "hozir";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return formatDate(value);
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Kvartira",
  house: "Uy",
  room: "Xona",
  office: "Ofis",
  commercial: "Tijorat",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Qoralama",
  pending_review: "Tekshirilmoqda",
  ai_checking: "Tekshirilmoqda",
  needs_review: "Moderatsiyada",
  approved: "Tasdiqlangan",
  published: "Faol",
  paused: "To'xtatilgan",
  rejected: "Rad etilgan",
  expired: "Muddati tugagan",
  deleted: "O'chirilgan",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}