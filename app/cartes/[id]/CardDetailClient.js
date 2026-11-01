"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import ReportError from "@/components/ReportError";
import ShareButton from "@/components/ShareButton";
import HoloCard from "@/components/HoloCard";
import CardStatusToggle from "@/components/CardStatusToggle";
import { isOwnedStatus } from "@/lib/cardStatus";
import CardScanUpload from "@/components/CardScanUpload";
import CardVariantUpload from "@/components/CardVariantUpload";
import CardMarketplace from "@/components/CardMarketplace";
import { localize } from "@/lib/localize";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { Check, Search, ChevronRight } from "lucide-react";

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

  // « N membres l'ont · M la recherchent » suit tout de suite le choix du visiteur (les
  // compteurs reçus incluent déjà son statut d'origine, la route n'étant pas mise en cache).
  function handleMyStatusChange(prev, next) {
    const delta = (test) => (test(next) ? 1 : 0) - (test(prev) ? 1 : 0);
    setCard((c) =>
      c && c.community
        ? {
            ...c,
            community: {
              owners: Math.max(0, c.community.owners + delta(isOwnedStatus)),
              traders: Math.max(0, (c.community.traders || 0) + delta((s) => s === "trade")),
              seekers: Math.max(0, c.community.seekers + delta((s) => s === "wanted")),
            },
          }
        : c
    );
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link href={`/collections/${card.collectionId}`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {t.backToCollection(card.collection.nom)}
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {card.prevCardId ? (
            <Link href={`/cartes/${card.prevCardId}`} className="btn-ghost" style={{ fontSize: "0.78rem" }}>
              {t.previousCard}
            </Link>
          ) : (
            <span className="btn-ghost" style={{ fontSize: "0.78rem", opacity: 0.35, cursor: "default" }}>
              {t.previousCard}
            </span>
          )}
          {card.nextCardId ? (
            <Link href={`/cartes/${card.nextCardId}`} className="btn-ghost" style={{ fontSize: "0.78rem" }}>
              {t.nextCard}
            </Link>
          ) : (
            <span className="btn-ghost" style={{ fontSize: "0.78rem", opacity: 0.35, cursor: "default" }}>
              {t.nextCard}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
        <div style={{ width: 280, maxWidth: "100%" }}>
          <HoloCard style={{ width: "100%", aspectRatio: "240 / 336", border: "1px solid var(--line)" }}>
            {card.image ? (
              <Image src={card.image} alt={card.personnagePrincipal?.name || ""} fill sizes="280px" style={{ objectFit: "cover" }} />
            ) : (
              <img src={image} alt={card.personnagePrincipal?.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </HoloCard>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>{t.recto}</div>
          {card.imageHD && (
            <a href={card.imageHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
              {t.viewHD}
            </a>
          )}
          {card.variants?.length > 1 && (
            // Versions connues de cette carte (un effet / prisme chacune) : on les fait défiler
            // et on passe de l'une à l'autre sans remonter en haut de la page.
            <div className="prism-strip">
              <div className="prism-strip-title">{t.prismsKnown(card.variants.length)}</div>
              <div className="prism-strip-list">
                {card.variants.map((v) => {
                  const active = v.id === card.id;
                  return (
                    <Link key={v.id} href={`/cartes/${v.id}`} scroll={false} className={`prism-thumb${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                      <span className="prism-thumb-media">
                        {v.image ? (
                          <Image src={v.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
                        ) : (
                          <img src={missingCardPlaceholder({ ...card, ...v }, t)} alt="" />
                        )}
                      </span>
                      <span className="prism-thumb-name">{v.rarete || t.effectUnknown}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {!card.image && <CardScanUpload cardId={card.id} />}
          <CardVariantUpload cardId={card.id} existingRaretes={card.variants?.map((v) => v.rarete)} />
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
          <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "0.2rem" }}>
            {card.personnagePrincipal?.name || t.noCharacterAssigned}
          </h1>
          {card.personnagesSecondaires?.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
              {t.withCharacters} {card.personnagesSecondaires.map((s) => s.character.name).join(", ")}
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <ShareButton url={cardUrl} title={`${card.personnagePrincipal?.name || card.numero} — ${card.numero} — DB Non-Off 90's`} />
          </div>
          <a
            href={`/api/cards/${card.id}/pdf`}
            className="btn-ghost"
            style={{ display: "inline-block", marginBottom: "1rem", fontSize: "0.75rem" }}
          >
            {t.downloadCardPdf}
          </a>
          <div style={{ marginBottom: "1rem" }}>
            <CardStatusToggle cardId={card.id} onChange={handleMyStatusChange} />
          </div>
          {card.community && (
            <section className="community-stats" aria-label={t.communityTitle}>
              <div className="community-stat">
                <span className="community-stat-icon owned" aria-hidden="true"><Check size={18} strokeWidth={2.4} /></span>
                <span>
                  <strong>{card.community.owners}</strong> {t.ownersLabel(card.community.owners)}
                  {card.community.traders > 0 && <span className="community-traders">{t.communityTraders(card.community.traders)}</span>}
                </span>
              </div>
              <div className="community-stat">
                <span className="community-stat-icon wanted" aria-hidden="true"><Search size={18} strokeWidth={2.2} /></span>
                <span><strong>{card.community.seekers}</strong> {t.seekersLabel(card.community.seekers)}</span>
              </div>
            </section>
          )}
          <div className="data-row"><span className="data-label">{t.collection}</span><span>{card.collection.nom}</span></div>
          <div className="data-row"><span className="data-label">{t.reference}</span><span>{card.numero}</span></div>
          <div className="data-row"><span className="data-label">{t.variant}</span><span>{card.rarete || t.effectUnknown}</span></div>
          <div className="data-row"><span className="data-label">{t.editor}</span><span>{card.collection.editeur || "—"}</span></div>
          <div className="data-row"><span className="data-label">{t.origin}</span><span>{card.collection.pays || "—"}</span></div>
          <div className="data-row"><span className="data-label">{t.year}</span><span>{card.collection.annee || "—"}</span></div>
          {card.description && (
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{localize(card, "description", lang)}</p>
          )}
          {card.contributorProfile ? (
            <Link href={`/u/${card.contributorProfile.username}`} className="contributor-card">
              <img
                src={card.contributorProfile.avatar || avatarPlaceholder(card.contributorProfile.username)}
                alt=""
                className="contributor-avatar"
              />
              <span className="contributor-text">
                <span className="contributor-label">{t.scanProposedBy}</span>
                <span className="contributor-name">{card.contributorProfile.username}</span>
                <span className="contributor-stats">
                  {t.contributorStats(card.contributorProfile.approvedScans, card.contributorProfile.contributionPoints)}
                </span>
              </span>
              <ChevronRight size={18} className="contributor-chevron" aria-hidden="true" />
            </Link>
          ) : (
            card.contributeur && (
              <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--gold)" }}>{t.contributedBy(card.contributeur)}</p>
            )
          )}
          <ReportError cardId={card.id} />
        </div>
      </div>
      <CardMarketplace cardId={card.id} />
    </div>
  );
}
