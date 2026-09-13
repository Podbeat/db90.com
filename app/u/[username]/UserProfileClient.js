"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";

function MiniGrid({ cards, t, emptyLabel }) {
  if (cards.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{emptyLabel}</div>;
  }
  return (
    <div className="card-grid">
      {cards.map((c, i) => (
        <Link
          key={c.id}
          href={`/cartes/${c.id}`}
          className="card-tile"
          style={{ "--stagger-delay": `${Math.min(i * 30, 300)}ms` }}
        >
          <div className="card-tile-media">
            {c.image ? (
              <Image src={c.image} alt={c.personnage} fill sizes="(max-width: 640px) 45vw, 220px" style={{ objectFit: "cover" }} />
            ) : (
              <img src={missingCardPlaceholder(c, t)} alt={c.personnage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div className="meta">
            <div className="card-collection">{c.collection?.nom} <span className="card-num-inline">n°{c.numero}</span></div>
            <div className="card-nom">{c.personnage}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function UserProfileClient({ username }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("owned");

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="container page"><div className="empty-state">Chargement…</div></div>;
  if (notFound || !profile) return <div className="container page"><div className="empty-state">{t.profileNotFound}</div></div>;

  const memberDate = new Date(profile.memberSince).toLocaleDateString();

  return (
    <div className="container page">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <img
          src={profile.avatar || `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#1a2c4d'/></svg>")}`}
          alt=""
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)" }}
        />
        <div>
          <h1 className="display-font" style={{ fontSize: "1.3rem" }}>{profile.username}</h1>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.memberSince} {memberDate}</div>
        </div>
      </div>
      {profile.bio && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 560, marginBottom: "1.5rem" }}>{profile.bio}</p>}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <button onClick={() => setTab("owned")} className={tab === "owned" ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.8rem" }}>
          {t.myCollectionTitle} · {t.cardsCount(profile.owned.length)}
        </button>
        <button onClick={() => setTab("wanted")} className={tab === "wanted" ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.8rem" }}>
          {t.myWantedTitle} · {t.cardsCount(profile.wanted.length)}
        </button>
      </div>

      {tab === "owned" ? (
        <MiniGrid cards={profile.owned} t={t} emptyLabel={t.noCardsOwned} />
      ) : (
        <MiniGrid cards={profile.wanted} t={t} emptyLabel={t.noCardsWanted} />
      )}
    </div>
  );
}
