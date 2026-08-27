import i18n from "@/i18n";

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  const t = i18n.t.bind(i18n);
  return `${new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ").format(value)} ${t("format.som")}`;
}

export function formatCompactPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  const t = i18n.t.bind(i18n);
  if (value >= 1_000_000) {
    const mln = value / 1_000_000;
    return `${Number.isInteger(mln) ? mln : mln.toFixed(1)} ${t("format.mln")}`;
  }
  if (value >= 1000) {
    const ming = value / 1000;
    return `${Number.isInteger(ming) ? ming : ming.toFixed(1)} ${t("format.thousand")}`;
  }
  return String(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "";
  const t = i18n.t.bind(i18n);
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("format.justNow");
  if (minutes < 60) return t("format.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("format.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("format.daysAgo", { count: days });
  return formatDate(value);
}

export const PROPERTY_TYPE_KEYS: Record<string, string> = {
  apartment: "format.propertyType.apartment",
  house: "format.propertyType.house",
  room: "format.propertyType.room",
  office: "format.propertyType.office",
  commercial: "format.propertyType.commercial",
};

export function getPropertyTypeLabel(type: string): string {
  const key = PROPERTY_TYPE_KEYS[type];
  return key ? i18n.t(key) : type;
}

export const STATUS_KEYS: Record<string, string> = {
  draft: "format.status.draft",
  pending_review: "format.status.pendingReview",
  ai_checking: "format.status.aiChecking",
  needs_review: "format.status.needsReview",
  approved: "format.status.approved",
  published: "format.status.published",
  paused: "format.status.paused",
  rejected: "format.status.rejected",
  expired: "format.status.expired",
  reserved: "format.status.reserved",
  rented: "format.status.rented",
  deleted: "format.status.deleted",
};

export function getStatusLabel(status: string): string {
  const key = STATUS_KEYS[status];
  return key ? i18n.t(key) : status;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
