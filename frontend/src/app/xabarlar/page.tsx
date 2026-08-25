"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCompactPrice, formatRelative } from "@/lib/format";
import type { Conversation, Message } from "@/lib/types";

const POLL_INTERVAL = 5000;

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<{ count: number; results: Conversation[] }>(
        "/chat/conversations/"
      );
      setConversations(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await api.get<Message[]>(
        `/chat/conversations/${conversationId}/messages/`
      );
      setMessages(data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/xabarlar");
      return;
    }
    loadConversations();
  }, [user, loading, router, loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (activeId) {
      pollRef.current = setInterval(() => loadMessages(activeId), POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadMessages]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeId) loadConversations();
    }, POLL_INTERVAL * 2);
    return () => clearInterval(timer);
  }, [activeId, loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!activeId || !text.trim()) return;
    const body = text;
    setText("");
    try {
      await api.post(`/chat/conversations/${activeId}/messages/create/`, { text: body });
      loadMessages(activeId);
      loadConversations();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    }
  };

  if (loading || (user && loadingList)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-4">{t("messages.title")}</h1>
      {error && (
        <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] text-danger rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-160px)]">
        <div className="card overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">
              {t("messages.empty")}
            </div>
          ) : (
            conversations.map((c) => {
              const name = c.other_user.full_name || "Foydalanuvchi";
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors ${
                    activeId === c.id ? "bg-[rgba(212,175,55,0.12)]" : "hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold text-sm shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{name}</span>
                        {c.updated_at && (
                          <span className="text-[11px] text-muted shrink-0">{formatRelative(c.updated_at)}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted truncate mt-0.5">
                        {c.listing.title} · {formatCompactPrice(c.listing.price)}
                      </div>
                      {c.last_message && (
                        <div className="text-xs text-foreground/60 truncate mt-1">{c.last_message.text}</div>
                      )}
                      {c.unread > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mt-1 rounded-full bg-gold text-[#1a1405] text-[10px] font-bold">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="card flex flex-col overflow-hidden">
          {activeId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm animate-fade-in ${
                        mine
                          ? "bg-[rgba(212,175,55,0.15)] text-foreground self-end ml-auto rounded-br-sm"
                          : "bg-[var(--surface-strong)] text-foreground self-start rounded-bl-sm"
                      }`}
                    >
                      {!mine && (
                        <div className="text-[11px] font-medium text-gold mb-0.5">{m.sender_name}</div>
                      )}
                      {m.text}
                      <div className="text-[10px] mt-1 text-muted">
                        {formatRelative(m.created_at)}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted pt-10">{t("messages.empty")}</div>
                )}
              </div>
              <div className="border-t border-[var(--border)] p-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={t("messages.typeMessage")}
                  className="input flex-1"
                />
                <button onClick={send} className="btn btn-primary px-3.5" aria-label="Yuborish">
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              {t("messages.empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
