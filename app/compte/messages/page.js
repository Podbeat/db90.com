"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ArchiveRestore } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

export default function MessagesListPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("inbox");
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/users/me/messages${tab === "archived" ? "?archived=1" : ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setThreads)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [tab]);

  async function handleUnarchive(username, e) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/users/me/messages/${username}/hide`, { method: "DELETE" });
    load();
  }

  return (
    <div className="filter-panel">
      <div className="display-font" style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <MessageCircle size={17} /> {t.messagesTitle}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" className={tab === "inbox" ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.8rem" }} onClick={() => setTab("inbox")}>
          {t.messagesTitle}
        </button>
        <button type="button" className={tab === "archived" ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.8rem" }} onClick={() => setTab("archived")}>
          {t.messagesTabArchived}
        </button>
      </div>

      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : threads.length === 0 ? (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tab === "archived" ? t.noArchivedMessages : t.noMessages}</div>
      ) : (
        threads.map((th) => (
          <Link
            key={th.username}
            href={`/compte/messages/${th.username}`}
            style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.6rem 0", borderBottom: "1px solid var(--line)" }}
          >
            <img src={th.avatar || avatarPlaceholder(th.username)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: th.unread > 0 ? 700 : 400 }}>{th.username}</div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {th.lastMessage}
              </div>
            </div>
            {th.unread > 0 && (
              <span style={{ background: "var(--accent)", color: "#1a1208", fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "0.15rem 0.5rem" }}>
                {th.unread}
              </span>
            )}
            {tab === "archived" && (
              <button className="btn-icon" onClick={(e) => handleUnarchive(th.username, e)} title={t.unhideThread} type="button">
                <ArchiveRestore size={13} />
              </button>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
