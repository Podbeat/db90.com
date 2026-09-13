"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

function MiniCard({ card, t }) {
  return (
    <Link href={`/cartes/${card.id}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <img src={card.image || ""} alt="" style={{ width: 28, height: 39, objectFit: "cover", background: "var(--surface-raised)", flexShrink: 0 }} />
      <span style={{ fontSize: "0.78rem" }}>{card.personnagePrincipal?.name || t.noCharacterAssigned} <span style={{ color: "var(--text-muted)" }}>· {card.collection?.nom}</span></span>
    </Link>
  );
}

export default function MatchesPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/matches")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">{t.loading}</div>;
  if (!data) return null;

  const nothing = data.mutual.length === 0 && data.theyWantMine.length === 0 && data.theyHaveMine.length === 0;

  return (
    <div>
      <div className="display-font" style={{ fontSize: "1.1rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Repeat size={17} /> {t.matchesTitle}
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>{t.matchesIntro}</p>

      {nothing && <div className="empty-state">{t.noMatches}</div>}

      {data.mutual.length > 0 && (
        <div className="filter-panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.8rem" }}>{t.mutualMatchesTitle}</div>
          {data.mutual.map((m) => (
            <div key={m.user.username} style={{ padding: "0.8rem 0", borderBottom: "1px solid var(--line)" }}>
              <Link href={`/u/${m.user.username}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <img src={m.user.avatar || avatarPlaceholder(m.user.username)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                <strong style={{ fontSize: "0.88rem" }}>{m.user.username}</strong>
              </Link>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.4rem" }}>{t.youGive}</div>
                  {m.iOffer.map((c) => <div key={c.id} style={{ marginBottom: "0.3rem" }}><MiniCard card={c} t={t} /></div>)}
                </div>
                <ArrowRight size={16} style={{ alignSelf: "center", color: "var(--text-muted)" }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: "0.4rem" }}>{t.youReceive}</div>
                  {m.iReceive.map((c) => <div key={c.id} style={{ marginBottom: "0.3rem" }}><MiniCard card={c} t={t} /></div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {data.theyWantMine.length > 0 && (
          <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.theyWantMineTitle}</div>
            {data.theyWantMine.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <MiniCard card={m.card} t={t} />
                <Link href={`/u/${m.user.username}`} style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{m.user.username}</Link>
              </div>
            ))}
          </div>
        )}
        {data.theyHaveMine.length > 0 && (
          <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.theyHaveMineTitle}</div>
            {data.theyHaveMine.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <MiniCard card={m.card} t={t} />
                <Link href={`/u/${m.user.username}`} style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{m.user.username}</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
