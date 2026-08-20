"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCompactPrice, formatRelative } from "@/lib/format";
import type { Conversation, Message } from "@/lib/types";

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<{ count: number; results: Conversation[] }>(
        "/chat/conversations/"
      );
      setConversations(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Xatolik");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await api.get<{ count: number; results: Message[] }>(
        `/chat/conversations/${conversationId}/messages/`
      );
      setMessages(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Xatolik");
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
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!activeId || !text.trim()) return;
    const body = text;
    setText("");
    try {
      await api.post(`/chat/conversations/${activeId}/messages/create/`, {
        text: body,
      });
      loadMessages(activeId);
      loadConversations();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Yuborilmadi");
    }
  };

  if (loading || (user && loadingList)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-muted">
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) return null;

  const otherName = (c: Conversation) =>
    c.tenant.id === user.id ? c.owner.full_name || "Uy egasi" : c.tenant.full_name || "Ijarachi";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-4">Xabarlar</h1>
      {error && (
        <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-160px)]">
        <div className="card overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">
              Hozircha suhbatlar yo&apos;q.
              <br />
              E&apos;longa kirib &quot;Egasi bilan bog&apos;lanish&quot; tugmasini bosing.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors ${
                  activeId === c.id ? "bg-[rgba(212,175,55,0.15)]/5" : "hover:bg-[rgba(118,118,128,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">
                    {otherName(c)}
                  </span>
                  {c.last_message_at && (
                    <span className="text-[11px] text-muted shrink-0">
                      {formatRelative(c.last_message_at)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {c.listing.title} В· {formatCompactPrice(c.listing.price)}
                </div>
                {c.last_message && (
                  <div className="text-xs text-muted truncate mt-1">
                    {c.last_message}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="card flex flex-col overflow-hidden">
          {activeId ? (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.map((m) => {
                  const mine = m.sender === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm animate-fade-in ${
                        mine
                          ? "bg-[rgba(212,175,55,0.15)] text-white self-end ml-auto rounded-br-sm"
                          : "bg-[rgba(118,118,128,0.1)] text-foreground self-start rounded-bl-sm"
                      }`}
                    >
                      {m.text}
                      <div
                        className={`text-[10px] mt-1 ${
                          mine ? "text-white/70" : "text-muted"
                        }`}
                      >
                        {formatRelative(m.created_at)}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted pt-10">
                    Suhbatni boshlang
                  </div>
                )}
              </div>
              <div className="border-t border-[var(--border)] p-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Xabar yozing..."
                  className="input flex-1"
                />
                <button
                  onClick={send}
                  className="btn btn-primary px-3.5"
                  aria-label="Yuborish"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              Suhbat tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
}