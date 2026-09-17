"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import CollectionProgressList from "@/components/CollectionProgressList";

export default function MyCollectionPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { owned: [] }))
      .then((d) => setItems(d.owned || []))
      .finally(() => setLoading(false));
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
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <CollectionProgressList items={items} emptyLabel={t.noCardsOwned} t={t} />
      )}
    </div>
  );
}
