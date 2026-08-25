"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Bot,
  Check,
  Eye,
  Flag,
  ShieldCheck,
  X,
} from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCompactPrice, formatRelative } from "@/lib/format";

interface ModerationListing {
  id: string;
  slug: string;
  title: string;
  price: number | string;
  status: string;
  created_at: string;
  reports_count?: number;
  owner: { id: string; full_name: string };
  primary_image: { thumb: string | null; image: string } | null;
}

interface ModerationReport {
  id: string;
  listing: { id: string; title: string; slug: string };
  reporter: { id: string; full_name: string };
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Stats {
  needs_review: number;
  high_risk: number;
  ai_checking: number;
  open_reports: number;
  verification_requests: number;
  suspended_users: number;
}

type Tab = "pending" | "high_risk" | "ai_checking" | "reports";

export default function ModerationPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("pending");
  const [stats, setStats] = useState<Stats | null>(null);
  const [listings, setListings] = useState<ModerationListing[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const isModerator = user?.role === "moderator" || user?.role === "admin";

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.get<Stats>("/moderation/stats/"));
    } catch {
      /* stats optional */
    }
  }, []);

  const loadTab = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      if (tab === "reports") {
        const data = await api.get<{ results: ModerationReport[] }>(
          "/moderation/reports/?status=new&page_size=50"
        );
        setReports(data.results ?? (data as unknown as ModerationReport[]));
      } else {
        const data = await api.get<{ results: ModerationListing[] }>(
          `/moderation/queue/?section=${tab}&page_size=50`
        );
        setListings(data.results ?? (data as unknown as ModerationListing[]));
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("moderationExt.loadError"));
    } finally {
      setLoadingData(false);
    }
  }, [tab, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/moderatsiya");
      return;
    }
    loadStats();
  }, [user, authLoading, router, loadStats]);

  useEffect(() => {
    if (!isModerator) return;
    loadTab();
  }, [isModerator, loadTab]);

  const actOnListing = async (listingId: string, action: "approve" | "reject" | "pause") => {
    setActingId(listingId);
    setError(null);
    try {
      await api.post(`/moderation/listings/${listingId}/${action}/`, {
        note: notes[listingId]?.trim() || "",
      });
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setNotes((prev) => ({ ...prev, [listingId]: "" }));
      loadStats();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setActingId(null);
    }
  };

  const actOnReport = async (reportId: string, action: "resolve" | "dismiss") => {
    setActingId(reportId);
    setError(null);
    try {
      await api.post(`/moderation/reports/${reportId}/${action}/`, {});
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      loadStats();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setActingId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center animate-fade-in-up">
        <ShieldCheck size={48} className="mx-auto text-muted mb-4" />
        <h1 className="text-xl font-bold">{t("moderationExt.accessDenied")}</h1>
        <Link href="/" className="btn btn-secondary mt-6 px-6 py-2.5 text-sm inline-flex">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Flag; count?: number }[] = [
    { key: "pending", label: t("moderationExt.tabPending"), icon: Flag, count: stats?.needs_review },
    { key: "high_risk", label: t("moderationExt.tabHighRisk"), icon: AlertTriangle, count: stats?.high_risk },
    { key: "ai_checking", label: t("moderationExt.tabAiChecking"), icon: Bot, count: stats?.ai_checking },
    { key: "reports", label: t("moderationExt.tabReports"), icon: Eye, count: stats?.open_reports },
  ];

  const statCards = stats
    ? [
        { label: t("moderationExt.needsReview"), value: stats.needs_review },
        { label: t("moderationExt.highRisk"), value: stats.high_risk },
        { label: t("moderationExt.aiChecking"), value: stats.ai_checking },
        { label: t("moderationExt.openReports"), value: stats.open_reports },
        { label: t("moderationExt.verificationRequests"), value: stats.verification_requests },
        { label: t("moderationExt.suspendedUsers"), value: stats.suspended_users },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
        <span className="w-11 h-11 rounded-xl bg-[rgba(212,175,55,0.12)] text-gold flex items-center justify-center">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1 className="display text-2xl font-bold">{t("moderation.title")}</h1>
          <p className="text-xs text-muted">{t("moderation.queue")}</p>
        </div>
      </div>

      {/* Stats */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6 stagger">
          {statCards.map((s) => (
            <div key={s.label} className="card p-3.5 card-press">
              <div className="display text-2xl font-bold bg-gradient-to-r from-[#f2d98d] to-[#d4af37] dark:from-[#f2d98d] dark:to-[#d4af37] bg-clip-text text-transparent" style={{ color: "var(--gold)" }}>
                {s.value}
              </div>
              <div className="text-[11px] text-muted mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="segmented mb-5 overflow-x-auto no-scrollbar" style={{ display: "flex" }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={tab === tb.key ? "active whitespace-nowrap" : "whitespace-nowrap"}
          >
            <tb.icon size={14} className="inline mr-1.5 -mt-0.5" />
            {tb.label}
            {typeof tb.count === "number" && tb.count > 0 ? ` (${tb.count})` : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] text-danger rounded-lg px-4 py-2 text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Content */}
      {loadingData ? (
        <div className="py-12 text-center text-muted">
          <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === "reports" ? (
        <div className="space-y-2 stagger">
          {reports.length === 0 && (
            <div className="card p-8 text-center text-muted text-sm">{t("moderation.noItems")}</div>
          )}
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <Flag size={14} className="text-danger shrink-0" />
                    <Link href={`/elon/${r.listing?.slug}`} className="font-semibold hover:text-gold transition-colors truncate">
                      {r.listing?.title ?? "—"}
                    </Link>
                  </div>
                  <div className="text-xs text-muted mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                    <span>{t("moderationExt.reporter")}: <b className="text-foreground/80">{r.reporter?.full_name ?? "—"}</b></span>
                    <span>{t("moderationExt.reasonLabel")}: <b className="text-foreground/80">{t(`report.${r.reason}`) || r.reason}</b></span>
                    <span>{t("moderationExt.date")}: {formatRelative(r.created_at)}</span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-foreground/70 mt-2 p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      {r.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => actOnReport(r.id, "resolve")}
                    disabled={actingId === r.id}
                    className="btn btn-primary px-3 py-2 text-xs"
                  >
                    <Check size={14} /> {t("moderationExt.resolve")}
                  </button>
                  <button
                    onClick={() => actOnReport(r.id, "dismiss")}
                    disabled={actingId === r.id}
                    className="btn btn-secondary px-3 py-2 text-xs"
                  >
                    <X size={14} /> {t("moderationExt.dismiss")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {listings.length === 0 && (
            <div className="card p-8 text-center text-muted text-sm">{t("moderation.noItems")}</div>
          )}
          {listings.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-20 h-16 rounded-lg bg-[var(--surface-strong)] shrink-0 overflow-hidden">
                  {l.primary_image?.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.primary_image.thumb} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Link href={`/elon/${l.slug}`} className="font-semibold text-sm hover:text-gold transition-colors">
                    {l.title}
                  </Link>
                  <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{formatCompactPrice(Number(l.price))}</span>
                    <span>{l.owner?.full_name ?? "—"}</span>
                    <span>{formatRelative(l.created_at)}</span>
                    {(l.reports_count ?? 0) > 0 && (
                      <span className="text-danger font-medium flex items-center gap-1">
                        <Flag size={11} /> {t("moderationExt.reportsCount", { count: l.reports_count })}
                      </span>
                    )}
                  </div>
                  <input
                    value={notes[l.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    placeholder={t("moderationExt.notePlaceholder")}
                    className="input mt-2.5 text-xs py-2"
                  />
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[150px]">
                  <button
                    onClick={() => actOnListing(l.id, "approve")}
                    disabled={actingId === l.id}
                    className="btn btn-primary py-2 text-xs"
                  >
                    <Check size={14} /> {t("moderation.approve")}
                  </button>
                  <button
                    onClick={() => actOnListing(l.id, "reject")}
                    disabled={actingId === l.id}
                    className="btn btn-danger py-2 text-xs"
                  >
                    <X size={14} /> {t("moderation.reject")}
                  </button>
                  <button
                    onClick={() => actOnListing(l.id, "pause")}
                    disabled={actingId === l.id}
                    className="btn btn-secondary py-2 text-xs"
                  >
                    {t("moderationExt.pause")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
