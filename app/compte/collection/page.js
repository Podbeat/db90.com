"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import CollectionProgressList from "@/components/CollectionProgressList";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { formatEuros } from "@/lib/localize";

// Valeur estimée de la collection (seulement à partir de quelques cartes cotées, voir
// /api/users/me/collection-value) et ses cartes les mieux cotées.
function CollectionValue({ value, t, lang }) {
  return (
    <>
      <section className="value-box" aria-label={t.valueTitle}>
        <div className="value-label">{t.valueTitle}</div>
        <div className="value-amount-row">
          <span className="value-amount display-font">≈ {formatEuros(value.total, lang)}</span>
          <span className="value-count">{t.valueOnPriced(value.pricedCount)}</span>
        </div>
        <p className="value-note">{t.valueNote}</p>
      </section>
      {value.top.length > 0 && (
        <section className="value-top" aria-label={t.valueTopTitle}>
          <div className="value-section-title">{t.valueTopTitle}</div>
          <ul className="value-top-list">
            {value.top.map(({ card, cote, sampleSize }) => (
              <li key={card.id}>
                <Link href={`/cartes/${card.id}`} className="value-top-row">
                  <span className="value-top-thumb">
                    {card.image ? (
                      <Image src={card.image} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
                    ) : (
                      <img src={missingCardPlaceholder(card, t)} alt="" />
                    )}
                  </span>
                  <span className="value-top-text">
                    <span className="value-top-name">{card.personnagePrincipal?.name || t.noCharacterAssigned}</span>
                    <span className="value-top-meta">
                      {card.collection?.nom} · n°{card.numero} · {t.valueListings(sampleSize)}
                    </span>
                  </span>
                  <span className="value-top-price">{formatEuros(cote, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="value-section-title">{t.myCollectionsTitle}</div>
    </>
  );
}

export default function MyCollectionPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(null);

  useEffect(() => {
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { owned: [] }))
      .then((d) => setItems(d.owned || []))
      .finally(() => setLoading(false));
    fetch("/api/users/me/collection-value")
      .then((r) => (r.ok ? r.json() : null))
      .then(setValue)
      .catch(() => {});
  }, []);

  return (
    <div className="filter-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="display-font" style={{ fontSize: "0.95rem" }}>{t.myCollectionTitle}</div>
        {items.length > 0 && (
          <a href="/api/users/me/owned/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
            {t.downloadOwnedPdf}
          </a>
        )}
      </div>
      {value?.ownedCount > 0 && items.length > 0 && (
        <div className="collection-summary-line">{t.collectionSummaryLine(value.ownedCount, items.length)}</div>
      )}
      {value?.enough && <CollectionValue value={value} t={t} lang={lang} />}
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <CollectionProgressList items={items} emptyLabel={t.noCardsOwned} t={t} />
      )}
    </div>
  );
}
