"use client";

import { useEffect, useRef, useState } from "react";
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
import { Check, Search, ChevronLeft, ChevronRight } from "lucide-react";

// Passage d'une image à l'autre en glissant le doigt sur le visuel (mobile).
function swipeDirection(start, event) {
  if (!start) return 0;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  return Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? 1 : -1) : 0;
}

export default function CardDetailClient({ id }) {
  const { t, lang } = useLanguage();
  // Carte affichée. Les flèches du visuel passent d'un prisme à l'autre sur place : la version
  // choisie s'affiche aussitôt (visuel et nom du prisme), le reste de la fiche suit dès sa
  // réponse, et l'adresse de la page devient celle de cette version.
  const [currentId, setCurrentId] = useState(id);
  const [card, setCard] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [backIndex, setBackIndex] = useState(0);
  const hasCard = useRef(false);
  const touchStart = useRef(null);

  useEffect(() => setCurrentId(id), [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cards/${currentId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        hasCard.current = true;
        setCard(data);
        setPending(null);
      })
      .catch(() => {
        if (cancelled) return;
        if (hasCard.current) setPending(null);
        else setNotFound(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const versions = card?.variants || [];
  const shownId = pending?.id || card?.id;
  const versionIndex = Math.max(0, versions.findIndex((v) => v.id === shownId));
  function goVersion(step) {
    if (versions.length < 2) return;
    const target = versions[(versionIndex + step + versions.length) % versions.length];
    setPending(target);
    setCurrentId(target.id);
    window.history.replaceState(null, "", `/cartes/${target.id}`);
  }

  // Dos : celui propre à la carte s'il existe, sinon ceux de la série (le principal d'abord).
  const backs = !card
    ? []
    : card.dos
      ? [{ image: card.dos, imageHD: card.dosHD }]
      : [card.collection.dos && { image: card.collection.dos, imageHD: card.collection.dosHD }, ...(card.collection.backs || [])].filter(Boolean);
  const backShown = Math.min(backIndex, Math.max(0, backs.length - 1));
  function goBack(step) {
    if (backs.length < 2) return;
    setBackIndex((backShown + step + backs.length) % backs.length);
  }
  const swipeHandlers = (go) => ({
    onTouchStart: (e) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e) => {
      const step = swipeDirection(touchStart.current, e);
      touchStart.current = null;
      if (step) go(step);
    },
  });

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

  const shownImage = pending ? pending.image : card.image;
  const shownRarete = pending ? pending.rarete : card.rarete;
  const placeholder = missingCardPlaceholder(card, t);
  const back = backs[backShown];

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
          <div className="card-viewer" {...swipeHandlers(goVersion)}>
            <HoloCard style={{ width: "100%", aspectRatio: "240 / 336", border: "1px solid var(--line)" }}>
              {shownImage ? (
                <Image src={shownImage} alt={card.personnagePrincipal?.name || ""} fill sizes="280px" style={{ objectFit: "cover" }} />
              ) : (
                <img src={placeholder} alt={card.personnagePrincipal?.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </HoloCard>
            {versions.length > 1 && (
              <>
                <button type="button" className="viewer-arrow prev" onClick={() => goVersion(-1)} aria-label={t.prevPrism}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" className="viewer-arrow next" onClick={() => goVersion(1)} aria-label={t.nextPrism}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          <div className="viewer-caption">
            {t.recto}
            {versions.length > 1 && (
              <>
                {" · "}<strong>{shownRarete || t.effectUnknown}</strong>{" · "}{versionIndex + 1}/{versions.length}
              </>
            )}
          </div>
          {!pending && card.imageHD && (
            <a href={card.imageHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
              {t.viewHD}
            </a>
          )}
          {!card.image && <CardScanUpload cardId={card.id} />}
          <CardVariantUpload cardId={card.id} existingRaretes={card.variants?.map((v) => v.rarete)} />
        </div>
        {back && (
          <div style={{ width: 280, maxWidth: "100%" }}>
            <div className="card-viewer" {...swipeHandlers(goBack)}>
              <HoloCard style={{ width: "100%", aspectRatio: "240 / 336", border: "1px solid var(--line)" }}>
                <Image src={back.image} alt={`${t.verso} — ${card.collection.nom}`} fill sizes="280px" style={{ objectFit: "cover" }} />
              </HoloCard>
              {backs.length > 1 && (
                <>
                  <button type="button" className="viewer-arrow prev" onClick={() => goBack(-1)} aria-label={t.prevBack}>
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <button type="button" className="viewer-arrow next" onClick={() => goBack(1)} aria-label={t.nextBack}>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            <div className="viewer-caption">
              {t.verso}
              {backs.length > 1 && <>{" · "}{backShown + 1}/{backs.length}</>}
            </div>
            {back.imageHD && (
              <a href={back.imageHD} target="_blank" rel="noopener noreferrer" onClick={() => trackHDDownload(`/cartes/${card.id}#dos`)} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}>
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
          <div className="data-row"><span className="data-label">{t.variant}</span><span>{shownRarete || t.effectUnknown}</span></div>
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
