"use client";

import Link from "next/link";
import { Check, Archive } from "lucide-react";

// Une ligne par collection avec une fraction (ex. 22/25) plutôt que les vignettes de
// chaque carte — reste lisible même avec plusieurs centaines de cartes suivies. Utilisé à
// la fois par "Ma collection" et "Cartes recherchées" (voir app/compte/collection et
// app/compte/recherchees), avec juste emptyLabel qui change entre les deux.
export default function CollectionProgressList({ items, emptyLabel, t }) {
  if (items.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ marginTop: "0.4rem" }}>
      {items.map((it) => {
        const totalKnown = it.total != null;
        const denominator = totalKnown ? it.total : it.catalogued;
        const pct = denominator ? Math.min(100, Math.round((it.count / denominator) * 100)) : 0;
        const complete = totalKnown && it.count >= it.total;
        return (
          <Link key={it.collectionId} href={`/collections/${it.collectionId}`} className="collection-progress-row">
            <div className="collection-progress-cover-wrap">
              {it.cover ? (
                <img src={it.cover} alt="" className="collection-progress-cover" />
              ) : (
                <div className="collection-progress-cover collection-progress-cover-placeholder"><Archive size={18} /></div>
              )}
              {complete && (
                <span className="collection-progress-badge" title={t.collectionCompleteTitle}><Check size={11} /></span>
              )}
            </div>
            <div className="collection-progress-body">
              <div className="collection-progress-top">
                <span className="collection-progress-name">{it.nom}</span>
                <span className="collection-progress-frac" style={{ color: totalKnown ? (complete ? "#4caf6d" : "var(--accent)") : "var(--text-muted)" }}>
                  {it.count}/{totalKnown ? it.total : "x"}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${complete ? "progress-complete" : ""}`}
                  style={{ width: `${pct}%`, background: !totalKnown ? "var(--text-muted)" : complete ? undefined : "var(--accent)" }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
