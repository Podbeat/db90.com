"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { useCurrentUser } from "@/components/CurrentUserProvider";

export default function MessageThreadPage() {
  const { t } = useLanguage();
  const { username } = useParams();
  const { me } = useCurrentUser();
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  function load() {
    fetch(`/api/users/me/messages/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setOther(data.other);
        setMessages(data.messages);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/users/me/messages/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        load();
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="empty-state">{t.loading}</div>;
  if (notFound || !other) return <div className="empty-state">{t.profileNotFound}</div>;

  return (
    <div className="filter-panel" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", paddingBottom: "0.8rem", borderBottom: "1px solid var(--line)" }}>
        <Link href="/compte/messages" className="btn-icon"><ArrowLeft size={14} /></Link>
        <img src={other.avatar || avatarPlaceholder(other.username)} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
        <Link href={`/u/${other.username}`} style={{ fontWeight: 600, fontSize: "0.9rem" }}>{other.username}</Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0.8rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {messages.length === 0 ? (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.noMessagesYet}</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === me?.id;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  background: mine ? "var(--accent)" : "var(--surface-raised)",
                  color: mine ? "#1a1208" : "var(--text)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.body}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem", paddingTop: "0.6rem", borderTop: "1px solid var(--line)" }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.messagePlaceholder}
          style={{ flex: 1 }}
          maxLength={3000}
        />
        <button className="btn-primary" type="submit" disabled={sending || !body.trim()} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
