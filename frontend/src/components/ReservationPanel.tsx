"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Reservation } from "@/lib/types";

type ReservationState = Reservation | null;

export function ReservationPanel({
  conversationId,
  ownerId,
}: {
  conversationId: string;
  ownerId?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<ReservationState>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ reservation: ReservationState }>(
        `/reservations/by-conversation/?conversation_id=${conversationId}`
      );
      setReservation(data.reservation);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const act = async (action: "create" | "approve" | "decline" | "cancel") => {
    setBusy(true);
    setError(null);
    try {
      if (action === "create") {
        await api.post("/reservations/", { conversation_id: conversationId });
      } else if (reservation) {
        await api.post(`/reservations/${reservation.id}/${action}/`);
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  const isOwner = !!user && ownerId === user.id;
  const isCandidate = !!user && reservation?.candidate_id === user.id;

  if (reservation && reservation.status === "pending" && isCandidate) {
    return (
      <div className="mx-3 my-2 rounded-xl border border-[var(--border)] bg-[rgba(212,175,55,0.1)] p-3 text-sm">
        <p className="mb-2 text-foreground/90">{t("chat.reservationFromOwner")}</p>
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {t("chat.approve")}
          </button>
          <button
            onClick={() => act("decline")}
            disabled={busy}
            className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {t("chat.decline")}
          </button>
        </div>
      </div>
    );
  }

  if (reservation && reservation.status === "pending" && isOwner) {
    return (
      <div className="mx-3 my-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm">
        <p className="mb-2 text-foreground/80">{t("chat.reserveSent")}</p>
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <button
          onClick={() => act("cancel")}
          disabled={busy}
          className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
        >
          {t("chat.cancelled")}
        </button>
      </div>
    );
  }

  if (reservation && reservation.status === "confirmed") {
    return (
      <div className="mx-3 my-2 rounded-xl border border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.12)] p-3 text-sm text-[#059669] font-medium">
        ✓ {t("chat.reserved")}
      </div>
    );
  }

  if (isOwner && !reservation) {
    return (
      <div className="mx-3 my-2">
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <button
          onClick={() => act("create")}
          disabled={busy}
          className="btn btn-primary w-full py-2 text-sm disabled:opacity-40"
        >
          {t("chat.reserve")}
        </button>
      </div>
    );
  }

  return null;
}
