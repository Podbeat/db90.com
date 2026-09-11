"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import ReportError from "@/components/ReportError";
import { localize } from "@/lib/localize";

export default function CardDetailPage({ params }) {
  const { t, lang } = useLanguage();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setCard)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  function trackHDDownload(path) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "hd_download", path }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}
  }

  if (loading) return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (notFound || !card) return <div className="container page"><div className="empty-state">{t.notFound}</div></div>;

  const image =
    card.image ||
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#1a2c4d'/><text x='120' y='170' font-family='Arial' font-size='16' fill='#8ea3c4' text-anchor='middle'>${card.numero}</text></svg>`
    )}`;

  return (
    <div className="container page">
      <Link href={`/collections/${card.collectionId}`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
        {t.backToCollection(card.collection.nom)}
      </Link>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
        <div style={{ width: 280, maxWidth: "100%" }}>
          <img src={image} alt={card.personnage} style={{ width: "100%", border: "1px solid var(--line)" }} />
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>{t.recto}</div>
          {card.imageHD && (
            <a href={card.imageHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
              {t.viewHD}
            </a>
          )}
        </div>
        {(card.dos || card.collection.dos) && (
          <div style={{ width: 280, maxWidth: "100%" }}>
            <img src={card.dos || card.collection.dos} alt={`${t.verso} — ${card.collection.nom}`} style={{ width: "100%", border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>{t.verso}</div>
            {(card.dosHD || card.collection.dosHD) && (
              <a href={card.dosHD || card.collection.dosHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}#dos`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
                {t.viewHD}
              </a>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>{card.personnage}</h1>
          <div className="data-row"><span className="data-label">{t.collection}</span><span>{card.collection.nom}</span></div>
          <div className="data-row"><span className="data-label">{t.reference}</span><span>{card.numero}</span></div>
          <div className="data-row"><span className="data-label">{t.variant}</span><span>{card.rarete}</span></div>
          <div className="data-row"><span className="data-label">{t.editor}</span><span>{card.collection.editeur || "—"}</span></div>
          <div className="data-row"><span className="data-label">{t.origin}</span><span>{card.collection.pays || "—"}</span></div>
          <div className="data-row"><span className="data-label">{t.year}</span><span>{card.collection.annee || "—"}</span></div>
          {card.description && (
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{localize(card, "description", lang)}</p>
          )}
          {card.contributeur && (
            <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--gold)" }}>{t.contributedBy(card.contributeur)}</p>
          )}
          <ReportError cardId={card.id} />
        </div>
      </div>
    </div>
  );
}
