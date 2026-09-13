"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

function CollectionProgressList({ items, emptyLabel }) {
  if (items.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ marginTop: "0.6rem" }}>
      {items.map((it) => {
        const totalKnown = it.total != null;
        const denominator = totalKnown ? it.total : it.catalogued;
        const pct = denominator ? Math.min(100, Math.round((it.count / denominator) * 100)) : 0;
        const complete = totalKnown && it.count >= it.total;
        return (
          <Link
            key={it.collectionId}
            href={`/collections/${it.collectionId}`}
            style={{ display: "block", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span>{it.nom}</span>
              <span style={{ color: totalKnown ? (complete ? "#4caf6d" : "var(--accent)") : "var(--text-muted)", fontWeight: 600 }}>
                {it.count}/{totalKnown ? it.total : "x"}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${complete ? "progress-complete" : ""}`}
                style={{ width: `${pct}%`, background: !totalKnown ? "var(--text-muted)" : complete ? undefined : "var(--accent)" }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function MyWantedPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { wanted: [] }))
      .then((d) => setItems(d.wanted || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="filter-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="display-font" style={{ fontSize: "0.95rem" }}>{t.myWantedTitle}</div>
        {items.length > 0 && (
          <a href="/api/users/me/wanted/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
            {t.downloadWantedPdf}
          </a>
        )}
      </div>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <CollectionProgressList items={items} emptyLabel={t.noCardsWanted} />
      )}
    </div>
  );
}
