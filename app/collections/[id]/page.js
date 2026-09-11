"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { localize } from "@/lib/localize";

export default function CollectionDetailPage({ params }) {
  const { t, lang } = useLanguage();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setCollection)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (notFound || !collection) return <div className="container page"><div className="empty-state">{t.notFound}</div></div>;

  return (
    <div className="container page">
      <Link href="/collections" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.backToCollections}</Link>
      <div style={{ display: "flex", gap: "1.1rem", alignItems: "flex-start", margin: "0.6rem 0 1.5rem" }}>
        {collection.dos && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <img src={collection.dos} alt={`${t.verso} — ${collection.nom}`} style={{ width: 70, border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{t.verso}</div>
            {collection.dosHD && (
              <a href={collection.dosHD} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--gold)" }}>
                {t.viewHD}
              </a>
            )}
          </div>
        )}
        <div>
          <h1 className="display-font" style={{ fontSize: "1.4rem", margin: "0 0 0.2rem" }}>{collection.nom}</h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {[collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" · ")}
            {" — "}
            {t.archivedOf(collection.cards.length, collection.total)}
          </div>
        </div>
      </div>

      {(() => {
        const desc = localize(collection, "description", lang);
        return desc ? (
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 720, marginBottom: "1.75rem", whiteSpace: "pre-wrap" }}>
            {desc}
          </p>
        ) : null;
      })()}

      {collection.cards.length === 0 ? (
        <div className="empty-state">{t.noResults}</div>
      ) : (
        <div className="card-grid">
          {collection.cards.map((c) => (
            <Link key={c.id} href={`/cartes/${c.id}`} className="card-tile">
              <img
                src={
                  c.image ||
                  `data:image/svg+xml;utf8,${encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#1a2c4d'/><text x='120' y='170' font-family='Arial' font-size='16' fill='#8ea3c4' text-anchor='middle'>${c.numero}</text></svg>`
                  )}`
                }
                alt={c.personnage}
              />
              <div className="meta">
                <div className="card-num">{c.numero}</div>
                <div className="card-nom">{c.personnage}</div>
                <span className="rarity-tag">{c.rarete}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
