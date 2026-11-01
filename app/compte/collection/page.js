"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Archive, Check, Download, Pencil, X, Tag } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { CardNumBadge } from "@/components/CardTileMeta";
import ShowcaseEditor from "@/components/ShowcaseEditor";
import { CARD_GRID_SIZES, COLLECTION_COVER_SIZES } from "@/lib/imageSizes";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { formatEuros } from "@/lib/localize";
import { SHOWCASE_SIZE } from "@/lib/showcase";

// « Ma collection » réunit sur une seule page ce qui tenait en trois onglets : la progression
// par collection (avec le visuel de chaque série et le nombre de cartes recherchées), les cartes
// recherchées elles-mêmes, et « Mon classeur » (aperçu, éditeur ouvert à la demande).

function CollectionValue({ value, t, lang }) {
  return (
    <section className="value-box mc-value" aria-label={t.valueTitle}>
      <div className="value-label">{t.valueTitle}</div>
      <div className="value-amount-row">
        <span className="value-amount display-font">≈ {formatEuros(value.total, lang)}</span>
        <span className="value-count">{t.valueOnPriced(value.pricedCount)}</span>
      </div>
      <p className="value-note">{t.valueNote}</p>
    </section>
  );
}

// Une collection : visuel, progression (références distinctes possédées / total) et cartes
// recherchées dans cette série.
function CollectionItem({ item, t }) {
  const totalKnown = item.total != null;
  const denominator = totalKnown ? item.total : item.catalogued;
  const pct = denominator ? Math.min(100, Math.round((item.count / denominator) * 100)) : 0;
  const complete = totalKnown && item.count >= item.total;
  const meta = [
    complete ? t.mcComplete : totalKnown ? t.mcMissing(item.total - item.count) : t.mcTotalUnknown,
    item.wanted > 0 && t.mcWantedIn(item.wanted),
  ].filter(Boolean);
  return (
    <Link href={`/collections/${item.collectionId}`} className={`mc-col${complete ? " complete" : ""}`}>
      <span className="mc-col-logo">
        {item.previewImage ? (
          <Image src={item.previewImage} alt="" fill sizes={COLLECTION_COVER_SIZES} style={{ objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <Archive size={18} aria-hidden="true" />
        )}
        {complete && (
          <span className="mc-col-badge" title={t.collectionCompleteTitle}>
            <Check size={11} aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="mc-col-body">
        <span className="mc-col-top">
          <span className="mc-col-name">{item.nom}</span>
          <span className="mc-col-frac">
            {item.count}/{totalKnown ? item.total : "?"}
          </span>
        </span>
        <span className="progress-track">
          <span className={`progress-fill${complete ? " progress-complete" : ""}`} style={{ width: `${pct}%`, ...(totalKnown ? {} : { background: "var(--text-muted)" }) }} />
        </span>
        <span className="mc-col-meta">{meta.join(" · ")}</span>
      </span>
    </Link>
  );
}

function Thumb({ card, t }) {
  return card.image ? (
    <Image src={card.image} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
  ) : (
    <img src={missingCardPlaceholder(card, t)} alt="" />
  );
}

export default function MyCollectionPage() {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const [summary, setSummary] = useState(null);
  const [cards, setCards] = useState(null);
  const [showcaseIds, setShowcaseIds] = useState([]);
  const [value, setValue] = useState(null);
  const [forSaleIds, setForSaleIds] = useState(new Set());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { owned: [], wanted: [] }))
      .then(setSummary)
      .catch(() => setSummary({ owned: [], wanted: [] }));
    fetch("/api/users/me/cards")
      .then((r) => (r.ok ? r.json() : { owned: [], wanted: [] }))
      .then(setCards)
      .catch(() => setCards({ owned: [], wanted: [] }));
    fetch("/api/users/me/showcase")
      .then((r) => (r.ok ? r.json() : { cardIds: [] }))
      .then((d) => setShowcaseIds(d.cardIds || []))
      .catch(() => {});
    fetch("/api/users/me/collection-value")
      .then((r) => (r.ok ? r.json() : null))
      .then(setValue)
      .catch(() => {});
    // Cartes recherchées actuellement en vente au Marché (repérées sur les vignettes).
    fetch("/api/market/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setForSaleIds(new Set((d.forSale || []).map((l) => l.card.id))))
      .catch(() => {});
    // Ancien lien « Mon classeur » ou bouton « Modifier » du profil : éditeur ouvert.
    if (new URLSearchParams(window.location.search).get("classeur") === "1") setEditing(true);
  }, []);

  // Une fois la page remplie, on rejoint la section demandée (#recherchees, #classeur).
  useEffect(() => {
    if (!summary || !cards) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [summary, cards]);

  // Collections suivies : possédées et/ou recherchées, les plus avancées d'abord.
  const collections = useMemo(() => {
    if (!summary) return [];
    const byId = new Map();
    for (const it of summary.owned || []) byId.set(it.collectionId, { ...it, wanted: 0 });
    for (const it of summary.wanted || []) {
      const row = byId.get(it.collectionId) || { ...it, count: 0 };
      byId.set(it.collectionId, { ...row, wanted: it.count });
    }
    const ratio = (c) => (c.total ? c.count / c.total : c.catalogued ? c.count / c.catalogued : 0);
    return [...byId.values()].sort((a, b) => ratio(b) - ratio(a) || a.nom.localeCompare(b.nom));
  }, [summary]);

  const ownedCount = cards?.owned?.length || 0;
  const wanted = cards?.wanted || [];
  const completeCount = collections.filter((c) => c.total != null && c.count >= c.total).length;
  const startedCount = collections.filter((c) => c.count > 0).length;
  const ownedById = useMemo(() => new Map((cards?.owned || []).map((c) => [c.id, c])), [cards]);
  const binder = showcaseIds.map((id) => ownedById.get(id)).filter(Boolean).slice(0, SHOWCASE_SIZE);
  const wantedForSale = wanted.filter((c) => forSaleIds.has(c.id)).length;
  const loading = !summary || !cards;

  return (
    <div className="mc-page">
      <header className="mc-head">
        <div className="mc-head-text">
          <h1 className="display-font mc-title">{t.myCollectionTitle}</h1>
          {!loading && (
            <nav className="mc-chips" aria-label={t.myCollectionTitle}>
              <a href="#collections" className="mc-chip">{t.mcChipCards(ownedCount)}</a>
              <a href="#collections" className="mc-chip">{t.mcChipCollections(startedCount, completeCount)}</a>
              <a href="#recherchees" className="mc-chip">{t.mcChipWanted(wanted.length)}</a>
              <a href="#classeur" className="mc-chip">{t.mcChipBinder(binder.length)}</a>
            </nav>
          )}
        </div>
        <div className="mc-head-actions">
          {ownedCount > 0 && (
            <a href="/api/users/me/owned/pdf" className="btn-ghost mc-pdf">
              <Download size={14} aria-hidden="true" /> {t.mcPdfOwned}
            </a>
          )}
          {wanted.length > 0 && (
            <a href="/api/users/me/wanted/pdf" className="btn-ghost mc-pdf">
              <Download size={14} aria-hidden="true" /> {t.mcPdfWanted}
            </a>
          )}
        </div>
      </header>

      {value?.enough && <CollectionValue value={value} t={t} lang={lang} />}

      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <>
          <section id="collections" className="mc-section" aria-labelledby="mc-collections-title">
            <h2 id="mc-collections-title" className="mc-section-title">{t.myCollectionsTitle}</h2>
            {collections.length === 0 ? (
              <p className="mc-empty">{t.noCardsOwned}</p>
            ) : (
              <div className="mc-collections">
                {collections.map((c) => (
                  <CollectionItem key={c.collectionId} item={c} t={t} />
                ))}
              </div>
            )}
          </section>

          <section id="recherchees" className="mc-section" aria-labelledby="mc-wanted-title">
            <div className="mc-section-head">
              <h2 id="mc-wanted-title" className="mc-section-title">
                {t.myWantedTitle} <span className="mc-count">{wanted.length}</span>
              </h2>
              {wantedForSale > 0 && (
                <Link href="/marche" className="mc-forsale-link">
                  <Tag size={14} aria-hidden="true" /> {t.mcWantedForSale(wantedForSale)}
                </Link>
              )}
            </div>
            {wanted.length === 0 ? (
              <p className="mc-empty">{t.mcWantedEmpty}</p>
            ) : (
              <div className="mc-wanted">
                {wanted.map((c) => (
                  <Link key={c.id} href={`/cartes/${c.id}`} className="mc-wanted-card" title={[c.collection?.nom, `n°${c.numero}`].filter(Boolean).join(" · ")}>
                    <span className="mc-wanted-thumb">
                      <Thumb card={c} t={t} />
                      {c.image && <CardNumBadge numero={c.numero} />}
                      {forSaleIds.has(c.id) && <span className="mc-forsale-badge">{t.mcBadgeForSale}</span>}
                    </span>
                    <span className="mc-wanted-col">{c.collection?.nom}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section id="classeur" className="mc-section" aria-labelledby="mc-binder-title">
            <div className="mc-section-head">
              <h2 id="mc-binder-title" className="mc-section-title">
                {t.showcaseTitleOwn} <span className="mc-count">{binder.length}/{SHOWCASE_SIZE}</span>
              </h2>
              {editing ? (
                <button type="button" className="btn-ghost mc-binder-btn" onClick={() => setEditing(false)}>
                  <X size={14} aria-hidden="true" /> {t.mcBinderClose}
                </button>
              ) : (
                <button type="button" className="btn-primary mc-binder-btn" onClick={() => setEditing(true)} disabled={ownedCount === 0}>
                  <Pencil size={14} aria-hidden="true" /> {binder.length ? t.mcBinderEdit : t.showcaseCompose}
                </button>
              )}
            </div>
            {editing ? (
              <ShowcaseEditor embedded onSaved={(ids) => setShowcaseIds(ids)} />
            ) : (
              <div className="mc-binder">
                <div className="mc-binder-grid">
                  {Array.from({ length: SHOWCASE_SIZE }, (_, i) => binder[i] || null).map((c, i) =>
                    c ? (
                      <Link key={c.id} href={`/cartes/${c.id}`} className="mc-binder-slot">
                        <Thumb card={c} t={t} />
                      </Link>
                    ) : (
                      <span key={`vide-${i}`} className="mc-binder-slot empty" aria-hidden="true" />
                    )
                  )}
                </div>
                <div className="mc-binder-text">
                  <p>{binder.length ? t.mcBinderIntro : t.mcBinderEmpty}</p>
                  {me && binder.length > 0 && (
                    <Link href={`/u/${me.username}`} className="lb-link-btn">{t.showcaseSeeProfile}</Link>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
