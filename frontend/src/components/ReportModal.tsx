"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";

const REPORT_REASONS = [
  "fake_listing",
  "misleading_images",
  "suspicious_price",
  "scam",
  "inappropriate",
  "other",
] as const;

interface ReportModalProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
}

export default function ReportModal({ listingId, open, onClose }: ReportModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonLabels: Record<string, string> = {
    fake_listing: t("report.fake"),
    misleading_images: t("report.misleadingImages"),
    suspicious_price: t("report.wrongPrice"),
    scam: t("report.scam"),
    inappropriate: t("report.inappropriate"),
    other: t("report.other"),
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/listings/reports/`, {
        listing: listingId,
        reason,
        description: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) {
        setError(t("errors.unauthorized"));
      } else {
        setError(e instanceof ApiRequestError ? e.message : t("common.error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setReason("");
    setComment("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md card p-6 animate-scale-in z-10">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold mb-4">{t("listingDetail.report")}</h3>

        {submitted ? (
          <div className="text-center py-6">
            <div className="text-success text-lg font-semibold mb-2">
              {t("report.submitted")}
            </div>
            <p className="text-sm text-muted">{t("report.thankYou")}</p>
            <button onClick={close} className="btn btn-primary mt-4 px-6 py-2 text-sm">
              {t("common.close")}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] text-danger rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === r
                      ? "border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.08)]"
                      : "border-[var(--border)] hover:border-[rgba(212,175,55,0.3)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[var(--gold)]"
                  />
                  <span className="text-sm">{reasonLabels[r]}</span>
                </label>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("report.commentPlaceholder")}
              rows={3}
              className="input mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button onClick={close} className="btn btn-secondary flex-1 py-2.5 text-sm">
                {t("common.cancel")}
              </button>
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="btn btn-danger flex-1 py-2.5 text-sm"
              >
                {submitting ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
