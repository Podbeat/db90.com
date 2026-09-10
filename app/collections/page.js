"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function CollectionsPage() {
  const { t } = useLanguage();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then(setCollections)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}>{t.collectionsTitle}</h1>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : collections.length === 0 ? (
        <div className="empty-state">{t.noCollections}</div>
      ) : (
        <div className="collection-grid">
          {collections.map((col) => {
            const archived = col._count?.cards ?? 0;
            const pct = col.total ? Math.min(100, Math.round((archived / col.total) * 100)) : 0;
            return (
              <Link key={col.id} href={`/collections/${col.id}`} className="collection-tile">
                <div className="display-font" style={{ fontSize: "0.95rem" }}>{col.nom}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                  {[col.editeur, col.pays, col.annee].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: "0.75rem", marginTop: "0.7rem" }}>
                  {t.archivedOf(archived, col.total)}
                </div>
                {col.total && (
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
