"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import ReportError from "@/components/ReportError";
import ShareButton from "@/components/ShareButton";
import HoloCard from "@/components/HoloCard";
import { localize } from "@/lib/localize";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";

export default function CardDetailClient({ id }) {
  const { t, lang } = useLanguage();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setCard)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

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

  const image = card.image || missingCardPlaceholder(card, t);

  const cardUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="container page">
      <Link href={`/collections/${card.collectionId}`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
        {t.backToCollection(card.collection.nom)}
      </Link>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
        <div style={{ width: 280, maxWidth: "100%" }}>
          <HoloCard style={{ width: "100%", aspectRatio: "240 / 336", border: "1px solid var(--line)" }}>
            {card.image ? (
              <Image src={card.image} alt={card.personnage} fill sizes="280px" style={{ objectFit: "cover" }} />
            ) : (
              <img src={image} alt={card.personnage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </HoloCard>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>{t.recto}</div>
          {card.imageHD && (
            <a href={card.imageHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
              {t.viewHD}
            </a>
          )}
        </div>
        {(card.dos || card.collection.dos) && (
          <div style={{ width: 280, maxWidth: "100%" }}>
            <HoloCard style={{ width: "100%", aspectRatio: "240 / 336", border: "1px solid var(--line)" }}>
              <Image src={card.dos || card.collection.dos} alt={`${t.verso} — ${card.collection.nom}`} fill sizes="280px" style={{ objectFit: "cover" }} />
            </HoloCard>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>{t.verso}</div>
            {(card.dosHD || card.collection.dosHD) && (
              <a href={card.dosHD || card.collection.dosHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}#dos`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
                {t.viewHD}
              </a>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "0.6rem" }}>{card.personnage}</h1>
          <div style={{ marginBottom: "1rem" }}>
            <ShareButton url={cardUrl} title={`${card.personnage} — ${card.numero} — DB Non-Off 90's`} />
          </div>
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
